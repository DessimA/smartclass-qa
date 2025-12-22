document.addEventListener('DOMContentLoaded', () => {
    carregarDuvidas();
    setInterval(carregarDuvidas, 30000);

    const container = document.getElementById('questionsContainer');
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
        const items = await response.json();

        document.getElementById('statTotal').innerText = items.length;
        document.getElementById('statPending').innerText = items.filter(i => i.classification === 'DUVIDA' && i.status !== 'Respondida').length;
        document.getElementById('statAnswered').innerText = items.filter(i => i.status === 'Respondida').length;

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
    const termoBusca = document.getElementById('searchInput').value.toLowerCase();

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state" style="text-align:center; padding: 40px; opacity: 0.5;"><h3>Nenhuma mensagem encontrada</h3></div>';
        return;
    }

    const html = items
        .filter(item => {
            if(!termoBusca) return true;
            return (item.message && item.message.toLowerCase().includes(termoBusca)) || 
                   (item.email && item.email.toLowerCase().includes(termoBusca));
        })
        .map(item => {
            const isDuvida = item.classification === 'DUVIDA';
            
            const badgeClass = isDuvida ? 'confidence-medium' : 'confidence-high';
            const cardClass = item.status === 'Respondida' ? 'question-card answered' : 'question-card';
            
            const msgTexto = item.message ? item.message : '<em>(Mensagem sem texto)</em>';
            
            const avatarInitial = item.email ? item.email.charAt(0).toUpperCase() : '?';

            const acaoBotao = isDuvida && item.status !== 'Respondida' 
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
                        <span class="badge ${badgeClass}">${item.classification} ${item.confidence}%</span>
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

    container.innerHTML = html;
}