// Variáveis de controle de áudio e estado
let audioEnabled = true;
let audioContext = null;
let knownMessageIds = new Set(); // Para rastrear IDs já vistos e tocar som apenas nos novos

document.addEventListener('DOMContentLoaded', () => {
    carregarDuvidas();
    // Atualiza a cada 5 segundos para garantir feedback rápido em aula
    setInterval(carregarDuvidas, 5000); 

    // Ativador de áudio na primeira interação (exigência do navegador)
    const unlockAudio = () => {
        if (audioEnabled && !audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        // Uma vez desbloqueado, não precisamos mais monitorar
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    const container = document.getElementById('questionsContainer');
    
    // Configura filtro de busca
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', () => {
             // Força re-renderização usando cache atual (se tivéssemos cache global)
             // Como não temos, chamamos carregarDuvidas que faz fetch de novo (simples)
             carregarDuvidas(); 
        });
    }

    container.addEventListener('click', async (event) => {
        if (event.target.closest('.btn-marcar-respondida')) {
            const button = event.target.closest('.btn-marcar-respondida');
            const messageId = button.dataset.messageId;
            const timestamp = parseInt(button.dataset.timestamp, 10);

            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerText = 'Atualizando...';

            try {
                await marcarComoRespondida(messageId, timestamp);
            } catch (error) {
                console.error('Falha ao marcar como respondida:', error);
                button.innerText = 'Erro!';
            }
        }
    });
});

/**
 * Ativa ou desativa o som de notificação
 * Necessário interação do usuário devido a políticas do navegador
 */
function toggleAudio() {
    const btn = document.getElementById('btnAudio');
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
        // Inicia o AudioContext na primeira interação
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Retoma se estiver suspenso
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        btn.innerHTML = '<span>🔊</span> Som On';
        btn.style.background = 'rgba(16, 185, 129, 0.4)'; // Verde suave
        btn.style.borderColor = '#10B981';
        
        // Toca um som de teste curto
        playNotificationSound(true);
    } else {
        btn.innerHTML = '<span>🔇</span> Som Off';
        btn.style.background = 'rgba(0,0,0,0.4)';
        btn.style.borderColor = 'var(--glass-border)';
    }
}

/**
 * Gera um "ding" usando Web Audio API
 * @param {boolean} isTest - Se for teste, toca mais baixo e curto
 */
function playNotificationSound(isTest = false) {
    if (!audioEnabled || !audioContext) return;

    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Frequência tipo "Ding" (senoidal)
    osc.type = 'sine';
    // Começa em 800Hz e sobe um pouco para dar um efeito "chime"
    osc.frequency.setValueAtTime(800, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

    // Volume envelope
    const volume = isTest ? 0.1 : 0.3;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}

async function marcarComoRespondida(messageId, timestamp) {
    const url = `${window.API_CONFIG.baseURL}/status`;
    
    await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messageId: messageId,
            timestamp: timestamp,
            status: 'Respondida'
        })
    });

    await new Promise(r => setTimeout(r, 800));
    await carregarDuvidas();
}

async function carregarDuvidas() {
    const container = document.getElementById('questionsContainer');
    const refreshText = document.getElementById('refreshText');
    
    if(refreshText) refreshText.innerText = "Sincronizando...";

    try {
        const url = `${window.API_CONFIG.baseURL}${window.API_CONFIG.endpoints.duvidas}`;
        const response = await fetch(url);
        let items = await response.json();

        // GARANTIA: Se não for array (ex: erro da API), transforma em lista vazia
        if (!Array.isArray(items)) {
            console.error("API não retornou uma lista:", items);
            items = [];
        }

        // Atualizar estatísticas
        document.getElementById('statTotal').innerText = items.length;
        document.getElementById('statPending').innerText = items.filter(i => i.classification === 'DUVIDA' && i.status !== 'Respondida').length;
        document.getElementById('statAnswered').innerText = items.filter(i => i.status === 'Respondida').length;

        // Lógica de Som: Verificar se há novos itens pendentes
        let hasNewQuestions = false;
        items.forEach(item => {
            // Se é dúvida, não está respondida e não vimos esse ID ainda
            if (item.classification === 'DUVIDA' && item.status === 'PENDING' && !knownMessageIds.has(item.messageId)) {
                hasNewQuestions = true;
                knownMessageIds.add(item.messageId);
            }
            // Adiciona todos ao set para evitar repetições futuras se a página recarregar
            // (mas o som só toca se o ID não estava lá antes desta execução específica, 
            // na prática o 'knownMessageIds' reseta no F5, o que é esperado: toca som ao abrir se tiver pendente)
            knownMessageIds.add(item.messageId);
        });

        // Toca o som se houver novidade e não for a primeira carga (opcional, aqui toca na primeira se tiver pendente)
        if (hasNewQuestions) {
            playNotificationSound();
        }

        renderizarLista(items);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div style="color:#ef4444; text-align:center; padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: 12px;">Erro de conexão: ${error.message}</div>`;
    } finally {
        if(refreshText) refreshText.innerText = "Conectado";
    }
}

function renderizarLista(items) {
    const container = document.getElementById('questionsContainer');
    const termoBuscaInput = document.getElementById('searchInput');
    const termoBusca = termoBuscaInput ? termoBuscaInput.value.toLowerCase() : '';

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; opacity: 0.5;"><h3>Nenhuma mensagem encontrada</h3></div>';
        return;
    }

    const html = items
        .filter(item => {
            // Filtro de busca local
            if(!termoBusca) return true;
            return (item.message && item.message.toLowerCase().includes(termoBusca)) || 
                   (item.email && item.email.toLowerCase().includes(termoBusca));
        })
        .map(item => {
            const isDuvida = item.classification === 'DUVIDA';
            
            // Só exibe se for DÚVIDA (embora o backend já filtre, é bom garantir visualmente)
            if (!isDuvida) return ''; 

            const badgeClass = item.confidence > 80 ? 'confidence-high' : 'confidence-medium';
            const cardClass = item.status === 'Respondida' ? 'question-card answered' : 'question-card';
            
            const msgTexto = item.message ? item.message : '<em>(Mensagem sem texto)</em>';
            const avatarInitial = item.email ? item.email.charAt(0).toUpperCase() : '?';

            const acaoBotao = item.status !== 'Respondida' 
                ? `<button class="btn-marcar-respondida" data-message-id="${item.messageId}" data-timestamp="${item.timestamp}">
                     <span>✓</span> Marcar como Respondida
                   </button>`
                : '';

            return `
            <div class="${cardClass}">
                <div class="question-header">
                    <div class="student-info">
                        <div class="avatar-placeholder">${avatarInitial}</div>
                        <div>
                            <div class="student-name">${item.email || 'Anônimo'}</div>
                            <div class="question-time">${new Date(item.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="question-badges">
                        <span class="badge ${badgeClass}">${item.classification} ${Math.round(item.confidence)}%</span>
                        ${item.status === 'Respondida' ? '<span class="badge status-answered">RESOLVIDO</span>' : ''}
                    </div>
                </div>
                
                <div class="question-text">${msgTexto}</div>
                
                <div class="question-footer">
                    <div class="ai-reason">
                        <span>🤖</span> ${item.aiReason || 'Análise indisponível'}
                    </div>
                    <div class="question-actions">
                        ${acaoBotao}
                    </div>
                </div>
            </div>
            `;
        }).join('');

    container.innerHTML = html || '<div class="empty-state" style="text-align:center; padding: 40px; opacity: 0.5;"><h3>Nenhuma dúvida encontrada na busca</h3></div>';
}
