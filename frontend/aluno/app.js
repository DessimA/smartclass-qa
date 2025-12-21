/**
 * Smart Class Q&A - Interface do Aluno
 * Gerencia envio de mensagens e histórico local
 */

// Estado da aplicação
const state = {
    isSubmitting: false,
    history: []
};

// Elementos DOM
const elements = {
    form: document.getElementById('messageForm'),
    alunoNome: document.getElementById('alunoNome'),
    mensagem: document.getElementById('mensagem'),
    submitBtn: document.getElementById('submitBtn'),
    charCount: document.getElementById('charCount'),
    alertContainer: document.getElementById('alertContainer'),
    historySection: document.getElementById('historySection'),
    historyList: document.getElementById('historyList')
};

/**
 * Inicialização
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Carregar nome salvo
    loadSavedName();
    
    // Carregar histórico
    loadHistory();
    
    // Event listeners
    elements.form.addEventListener('submit', handleSubmit);
    elements.form.addEventListener('reset', handleReset);
    elements.mensagem.addEventListener('input', updateCharCount);
    elements.alunoNome.addEventListener('input', saveName);
    
    // Atualizar contador inicial
    updateCharCount();
    
    console.log('Interface do aluno inicializada');
}

/**
 * Salvar nome do aluno no localStorage
 */
function saveName() {
    const nome = elements.alunoNome.value.trim();
    if (nome) {
        localStorage.setItem('smartclass_aluno_nome', nome);
    }
}

/**
 * Carregar nome salvo
 */
function loadSavedName() {
    const savedName = localStorage.getItem('smartclass_aluno_nome');
    if (savedName) {
        elements.alunoNome.value = savedName;
    }
}

/**
 * Atualizar contador de caracteres
 */
function updateCharCount() {
    const count = elements.mensagem.value.length;
    elements.charCount.textContent = count;
    
    // Mudar cor se próximo do limite
    if (count > 900) {
        elements.charCount.style.color = '#ef5350';
    } else if (count > 800) {
        elements.charCount.style.color = '#ffb74d';
    } else {
        elements.charCount.style.color = '#78909c';
    }
}

/**
 * Tratar envio do formulário
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    if (state.isSubmitting) return;
    
    // Validar campos
    const alunoNome = elements.alunoNome.value.trim();
    const mensagem = elements.mensagem.value.trim();
    
    if (!alunoNome || !mensagem) {
        showAlert('Por favor, preencha todos os campos', 'error');
        return;
    }
    
    if (mensagem.length < 3) {
        showAlert('A mensagem deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    
    // Preparar dados
    const data = {
        alunoNome,
        mensagem
    };
    
    // Enviar mensagem
    await sendMessage(data);
}

/**
 * Enviar mensagem para a API
 */
async function sendMessage(data) {
    state.isSubmitting = true;
    updateSubmitButton(true);
    
    try {
        // Verificar se API_CONFIG está definido
        if (typeof API_CONFIG === 'undefined') {
            throw new Error('Configuração da API não encontrada');
        }
        
        const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.mensagem}`;
        
        console.log('Enviando mensagem para:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Sucesso
            showAlert(result.message || 'Mensagem enviada com sucesso!', 'success');
            
            // Adicionar ao histórico
            addToHistory({
                ...data,
                classification: result.classification,
                confidence: result.confidence,
                timestamp: new Date().toISOString()
            });
            
            // Limpar formulário
            elements.mensagem.value = '';
            updateCharCount();
            
            // Scroll suave para o histórico
            setTimeout(() => {
                elements.historySection.scrollIntoView({ behavior: 'smooth' });
            }, 300);
            
        } else {
            // Erro da API
            showAlert(result.error || 'Erro ao enviar mensagem', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        showAlert('Erro de conexão. Verifique se a API está configurada.', 'error');
    } finally {
        state.isSubmitting = false;
        updateSubmitButton(false);
    }
}

/**
 * Atualizar botão de submit
 */
function updateSubmitButton(loading) {
    if (loading) {
        elements.submitBtn.disabled = true;
        elements.submitBtn.innerHTML = '<span class="loader"></span>Enviando...';
    } else {
        elements.submitBtn.disabled = false;
        elements.submitBtn.innerHTML = 'Enviar Mensagem';
    }
}

/**
 * Mostrar alerta
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} show`;
    alertDiv.textContent = message;
    
    elements.alertContainer.innerHTML = '';
    elements.alertContainer.appendChild(alertDiv);
    
    // Auto-remover após 5 segundos
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

/**
 * Adicionar ao histórico
 */
function addToHistory(item) {
    state.history.unshift(item);
    
    // Limitar a 10 itens
    if (state.history.length > 10) {
        state.history = state.history.slice(0, 10);
    }
    
    // Salvar no localStorage
    localStorage.setItem('smartclass_history', JSON.stringify(state.history));
    
    // Atualizar UI
    renderHistory();
}

/**
 * Carregar histórico do localStorage
 */
function loadHistory() {
    const saved = localStorage.getItem('smartclass_history');
    if (saved) {
        try {
            state.history = JSON.parse(saved);
            renderHistory();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }
}

/**
 * Renderizar histórico
 */
function renderHistory() {
    if (state.history.length === 0) {
        elements.historySection.style.display = 'none';
        return;
    }
    
    elements.historySection.style.display = 'block';
    
    const html = state.history.map(item => {
        const date = new Date(item.timestamp);
        const formattedDate = date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="history-item">
                <div class="meta">
                    📅 ${formattedDate} • ${item.alunoNome}
                </div>
                <div class="message">${escapeHtml(item.mensagem)}</div>
                <span class="classification ${item.classification?.toLowerCase() || 'interacao'}">
                    ${item.classification === 'DUVIDA' ? '❓ DÚVIDA' : '💬 INTERAÇÃO'}
                    ${item.confidence ? ` (${item.confidence}% confiança)` : ''}
                </span>
            </div>
        `;
    }).join('');
    
    elements.historyList.innerHTML = html;
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Tratar reset do formulário
 */
function handleReset() {
    setTimeout(() => {
        updateCharCount();
        elements.alertContainer.innerHTML = '';
    }, 0);
}

/**
 * Limpar histórico (função auxiliar para debug)
 */
window.clearHistory = function() {
    if (confirm('Deseja realmente limpar o histórico?')) {
        state.history = [];
        localStorage.removeItem('smartclass_history');
        renderHistory();
        showAlert('Histórico limpo com sucesso!', 'success');
    }
};

// Expor estado para debug
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.appState = state;
    console.log('Debug mode: window.appState disponível');
    console.log('Comandos: clearHistory()');
}