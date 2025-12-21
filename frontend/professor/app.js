/**
 * Smart Class Q&A - Dashboard do Professor
 * Gerencia visualização e atualização de dúvidas
 */

// Estado da aplicação
const state = {
    questions: [],
    filteredQuestions: [],
    currentFilter: 'all',
    searchTerm: '',
    isLoading: false,
    autoRefreshInterval: null,
    autoRefreshSeconds: 30
};

// Elementos DOM
const elements = {
    questionsContainer: document.getElementById('questionsContainer'),
    statTotal: document.getElementById('statTotal'),
    statPending: document.getElementById('statPending'),
    statAnswered: document.getElementById('statAnswered'),
    refreshIndicator: document.getElementById('refreshIndicator'),
    refreshIcon: document.getElementById('refreshIcon'),
    refreshText: document.getElementById('refreshText'),
    searchInput: document.getElementById('searchInput'),
    filterButtons: document.querySelectorAll('.filter-btn')
};

/**
 * Inicialização
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    console.log('Dashboard do professor inicializado');
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar dúvidas inicial
    loadQuestions();
    
    // Iniciar auto-refresh
    startAutoRefresh();
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Filtros
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => handleFilterChange(btn));
    });
    
    // Busca com Enter
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applySearch();
        }
    });
    
    // Detectar quando a aba fica visível/invisível
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadQuestions(); // Recarregar quando voltar para a aba
        }
    });
}

/**
 * Carregar dúvidas da API
 */
async function loadQuestions(showLoading = true) {
    if (state.isLoading) return;
    
    state.isLoading = true;
    updateRefreshIndicator('Carregando...');
    
    if (showLoading) {
        showLoadingState();
    }
    
    try {
        if (typeof API_CONFIG === 'undefined' || !window.isAPIConfigured()) {
            throw new Error('API não configurada');
        }
        
        const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.duvidas}?status=all`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            state.questions = result.duvidas || [];
            applyFiltersAndSearch();
            updateStatistics();
            updateRefreshIndicator('Atualizado');
        } else {
            throw new Error(result.error || 'Erro ao carregar dúvidas');
        }
        
    } catch (error) {
        console.error('Erro ao carregar dúvidas:', error);
        showErrorState(error.message);
        updateRefreshIndicator('Erro');
    } finally {
        state.isLoading = false;
    }
}

/**
 * Aplicar filtros e busca
 */
function applyFiltersAndSearch() {
    let filtered = [...state.questions];
    
    // Aplicar filtro de status
    if (state.currentFilter !== 'all') {
        filtered = filtered.filter(q => q.status === state.currentFilter);
    }
    
    // Aplicar busca
    if (state.searchTerm) {
        const term = state.searchTerm.toLowerCase();
        filtered = filtered.filter(q => 
            q.alunoNome.toLowerCase().includes(term) ||
            q.mensagem.toLowerCase().includes(term)
        );
    }
    
    state.filteredQuestions = filtered;
    renderQuestions();
}

/**
 * Renderizar dúvidas
 */
function renderQuestions() {
    if (state.filteredQuestions.length === 0) {
        showEmptyState();
        return;
    }
    
    const html = state.filteredQuestions.map(question => {
        const isAnswered = question.status === 'Respondida';
        const timeAgo = getTimeAgo(question.timestamp);
        const confidenceBadge = getConfidenceBadge(question.confidence);
        
        return `
            <div class="question-card ${isAnswered ? 'answered' : ''}">
                <div class="question-header">
                    <div class="question-meta">
                        <div class="student-name">👤 ${escapeHtml(question.alunoNome)}</div>
                        <div class="question-time">📅 ${timeAgo}</div>
                    </div>
                    <div class="question-badges">
                        ${confidenceBadge}
                        <span class="badge status ${isAnswered ? 'answered' : ''}">
                            ${isAnswered ? '✓ Respondida' : '⏳ Pendente'}
                        </span>
                    </div>
                </div>
                
                <div class="question-text">
                    ${escapeHtml(question.mensagem)}
                </div>
                
                <div class="question-footer">
                    <div class="question-info">
                        Score IA: ${question.score || 'N/A'} | 
                        Classificação: ${question.classification || 'DUVIDA'}
                    </div>
                    <button 
                        class="action-btn mark-answered"
                        onclick="markAsAnswered('${question.messageId}', ${question.timestamp})"
                        ${isAnswered ? 'disabled' : ''}
                    >
                        ${isAnswered ? '✓ Já Respondida' : '✓ Marcar como Respondida'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    elements.questionsContainer.innerHTML = html;
}

/**
 * Marcar dúvida como respondida
 */
async function markAsAnswered(messageId, timestamp) {
    if (!confirm('Marcar esta dúvida como respondida?')) {
        return;
    }
    
    try {
        const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.status}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messageId: messageId,
                status: 'Respondida'
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Atualizar localmente
            const question = state.questions.find(q => 
                q.messageId === messageId && q.timestamp === timestamp
            );
            if (question) {
                question.status = 'Respondida';
                question.respondidaEm = new Date().toISOString();
            }
            
            // Reprocessar
            applyFiltersAndSearch();
            updateStatistics();
            
            // Feedback visual
            showNotification('Dúvida marcada como respondida!', 'success');
        } else {
            throw new Error(result.error || 'Erro ao atualizar status');
        }
        
    } catch (error) {
        console.error('Erro ao marcar como respondida:', error);
        showNotification('Erro ao atualizar status: ' + error.message, 'error');
    }
}

/**
 * Atualizar estatísticas
 */
function updateStatistics() {
    const total = state.questions.length;
    const pending = state.questions.filter(q => q.status === 'Não Respondida').length;
    const answered = state.questions.filter(q => q.status === 'Respondida').length;
    
    animateValue(elements.statTotal, parseInt(elements.statTotal.textContent), total, 500);
    animateValue(elements.statPending, parseInt(elements.statPending.textContent), pending, 500);
    animateValue(elements.statAnswered, parseInt(elements.statAnswered.textContent), answered, 500);
}

/**
 * Animar mudança de números
 */
function animateValue(element, start, end, duration) {
    if (start === end) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

/**
 * Tratar mudança de filtro
 */
function handleFilterChange(button) {
    // Atualizar botões
    elements.filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Atualizar estado
    state.currentFilter = button.dataset.filter;
    
    // Reaplicar filtros
    applyFiltersAndSearch();
}

/**
 * Aplicar busca
 */
function applySearch() {
    state.searchTerm = elements.searchInput.value.trim();
    applyFiltersAndSearch();
}

/**
 * Limpar busca
 */
function clearSearch() {
    elements.searchInput.value = '';
    state.searchTerm = '';
    applyFiltersAndSearch();
}

/**
 * Obter badge de confiança
 */
function getConfidenceBadge(confidence) {
    if (!confidence) return '';
    
    let className = 'confidence-low';
    if (confidence >= 80) className = 'confidence-high';
    else if (confidence >= 60) className = 'confidence-medium';
    
    return `<span class="badge ${className}">🎯 ${confidence}% confiança</span>`;
}

/**
 * Calcular tempo decorrido
 */
function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} dia(s) atrás`;
    if (hours > 0) return `${hours} hora(s) atrás`;
    if (minutes > 0) return `${minutes} minuto(s) atrás`;
    return 'Agora mesmo';
}

/**
 * Auto-refresh
 */
function startAutoRefresh() {
    let countdown = state.autoRefreshSeconds;
    
    state.autoRefreshInterval = setInterval(() => {
        countdown--;
        
        if (countdown <= 0) {
            loadQuestions(false);
            countdown = state.autoRefreshSeconds;
        }
        
        updateRefreshIndicator(`Próxima atualização em ${countdown}s`);
    }, 1000);
}

/**
 * Atualizar indicador de refresh
 */
function updateRefreshIndicator(text) {
    elements.refreshText.textContent = text;
    
    if (text.includes('Carregando')) {
        elements.refreshIndicator.classList.add('active');
        elements.refreshIcon.textContent = '⏳';
    } else if (text.includes('Erro')) {
        elements.refreshIndicator.classList.remove('active');
        elements.refreshIcon.textContent = '❌';
    } else {
        elements.refreshIndicator.classList.remove('active');
        elements.refreshIcon.textContent = '🔄';
    }
}

/**
 * Mostrar estado de loading
 */
function showLoadingState() {
    elements.questionsContainer.innerHTML = `
        <div class="loading-container">
            <div class="spinner-large"></div>
            <p style="color: #90caf9;">Carregando dúvidas...</p>
        </div>
    `;
}

/**
 * Mostrar estado vazio
 */
function showEmptyState() {
    let message = 'Nenhuma dúvida encontrada';
    let icon = '📭';
    
    if (state.currentFilter === 'Não Respondida') {
        message = 'Parabéns! Todas as dúvidas foram respondidas!';
        icon = '🎉';
    } else if (state.searchTerm) {
        message = `Nenhuma dúvida encontrada para "${state.searchTerm}"`;
        icon = '🔍';
    }
    
    elements.questionsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3>${message}</h3>
            <p>As novas dúvidas aparecerão aqui automaticamente</p>
        </div>
    `;
}

/**
 * Mostrar estado de erro
 */
function showErrorState(message) {
    elements.questionsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Erro ao carregar dúvidas</h3>
            <p>${escapeHtml(message)}</p>
            <button 
                class="action-btn mark-answered" 
                onclick="loadQuestions()"
                style="margin-top: 20px;"
            >
                Tentar Novamente
            </button>
        </div>
    `;
}

/**
 * Mostrar notificação temporária
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Escapar HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expor funções globalmente (para onclick handlers)
window.markAsAnswered = markAsAnswered;
window.applySearch = applySearch;
window.clearSearch = clearSearch;

// Debug mode
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.dashboardState = state;
    window.reloadQuestions = () => loadQuestions(true);
    console.log('Debug mode ativo');
    console.log('Comandos: reloadQuestions(), window.dashboardState');
}