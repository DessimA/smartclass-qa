document.addEventListener('DOMContentLoaded', () => {
    carregarDuvidas();
    setInterval(carregarDuvidas, 30000);
});

async function carregarDuvidas() {
    const container = document.getElementById('questionsContainer');
    const refreshText = document.getElementById('refreshText');
    
    if(refreshText) refreshText.innerText = "Atualizando...";

    try {
        const url = `${window.API_CONFIG.baseURL}${window.API_CONFIG.endpoints.duvidas}`;
        const response = await fetch(url);
        const items = await response.json();

        // Atualiza Estatísticas
        document.getElementById('statTotal').innerText = items.length;
        document.getElementById('statPending').innerText = items.filter(i => i.classification === 'DUVIDA').length;
        document.getElementById('statAnswered').innerText = items.filter(i => i.status === 'Respondida').length;

        renderizarLista(items);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div style="color:red; text-align:center">Erro: ${error.message}</div>`;
    } finally {
        if(refreshText) refreshText.innerText = "Pronto";
    }
}

function renderizarLista(items) {
    const container = document.getElementById('questionsContainer');
    const termoBusca = document.getElementById('searchInput').value.toLowerCase();

    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Nenhuma mensagem encontrada</h3></div>';
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
            const borderClass = isDuvida ? '#ff9800' : '#4caf50';
            const badgeClass = isDuvida ? 'confidence-medium' : 'confidence-high';
            
            // Tratamento para mensagem vazia
            const msgTexto = item.message ? item.message : '<em>(Mensagem sem texto)</em>';

            return `
            <div class="question-card" style="border-left-color: ${borderClass}">
                <div class="question-header">
                    <div class="question-meta">
                        <div class="student-name">${item.email || 'Anônimo'}</div>
                        <div class="question-time">${new Date(item.timestamp).toLocaleString()}</div>
                    </div>
                    <div class="question-badges">
                        <span class="badge ${badgeClass}">${item.classification} (${item.confidence}%)</span>
                    </div>
                </div>
                <div class="question-text">${msgTexto}</div>
                <div class="question-footer">
                    <div class="question-info">Motivo IA: ${item.aiReason || 'N/A'}</div>
                </div>
            </div>
            `;
        }).join('');

    container.innerHTML = html;
}
