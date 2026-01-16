let audioEnabled = true;
let audioContext = null;
let knownMessageIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    carregarDuvidas();
    setInterval(carregarDuvidas, 5000); 

    const unlockAudio = () => {
        if (audioEnabled && !audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', () => {
             carregarDuvidas(); 
        });
    }
});

function toggleAudio() {
    const btn = document.getElementById('btnAudio');
    audioEnabled = !audioEnabled;

    if (audioEnabled) {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
        btn.innerHTML = '<i class="bi bi-volume-up-fill me-2"></i> Som On';
        btn.className = 'btn btn-outline-success btn-sm px-3 rounded-pill d-flex align-items-center gap-2';
        playNotificationSound(true);
    } else {
        btn.innerHTML = '<i class="bi bi-volume-mute-fill me-2"></i> Som Off';
        btn.className = 'btn btn-outline-secondary btn-sm px-3 rounded-pill d-flex align-items-center gap-2';
    }
}

function playNotificationSound(isTest = false) {
    if (!audioEnabled || !audioContext) return;
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    const volume = isTest ? 0.05 : 0.2;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
}

async function carregarDuvidas() {
    const refreshText = document.getElementById('refreshText');
    if(refreshText) refreshText.innerText = "Sincronizando...";

    try {
        const response = await window.authenticatedFetch(`${window.API_CONFIG.baseURL}${window.API_CONFIG.endpoints.duvidas}`);
        let items = await response.json();
        if (!Array.isArray(items)) items = [];

        document.getElementById('statTotal').innerText = items.length;
        document.getElementById('statPending').innerText = items.filter(i => i.classification === 'DUVIDA' && i.status !== 'Respondida').length;
        document.getElementById('statAnswered').innerText = items.filter(i => i.status === 'Respondida').length;
        
        updateIAMetrics(items);
        updateTopStudents(items);

        let hasNewQuestions = false;
        items.forEach(item => {
            if (item.classification === 'DUVIDA' && item.status === 'PENDING' && !knownMessageIds.has(item.messageId)) {
                hasNewQuestions = true;
                knownMessageIds.add(item.messageId);
            }
            knownMessageIds.add(item.messageId);
        });

        if (hasNewQuestions) playNotificationSound();
        renderizarLista(items);

    } catch (error) {
        console.error(error);
    } finally {
        if(refreshText) refreshText.innerText = "Sincronizado";
    }
}

function renderizarLista(items) {
    const container = document.getElementById('questionsContainer');
    const termoBusca = document.getElementById('searchInput').value.toLowerCase();

    if (items.length === 0) {
        container.innerHTML = '<div class="text-center py-5 opacity-25"><h6>Nenhuma comunicação interceptada</h6></div>';
        return;
    }

    const html = items
        .filter(item => {
            if(!termoBusca) return true;
            return (item.message && item.message.toLowerCase().includes(termoBusca)) || 
                   (item.email && item.email.toLowerCase().includes(termoBusca));
        })
        .map(item => {
            if (item.classification !== 'DUVIDA') return ''; 

            const isAnswered = item.status === 'Respondida';
            const confidenceClass = item.confidence > 80 ? 'text-success' : (item.confidence > 50 ? 'text-warning' : 'text-danger');
            const cardClass = `question-card p-3 mb-3 border-start border-4 ${isAnswered ? 'answered border-secondary' : 'border-primary'}`;
            const avatarInitial = (item.email || '?').charAt(0).toUpperCase();

            const acoes = !isAnswered 
                ? `<div class="d-flex gap-2">
                     <button class="btn btn-primary btn-sm px-3" onclick="marcarComoRespondida('${item.messageId}', ${item.timestamp})">
                        <i class="bi bi-check2-circle me-1"></i> Resolver
                     </button>
                     <button class="btn btn-outline-danger btn-sm px-2" onclick="rejeitarMensagem('${item.messageId}', ${item.timestamp})" title="Sinalizar Falso Positivo">
                        <i class="bi bi-x-lg"></i>
                     </button>
                   </div>`
                : '<span class="badge bg-secondary opacity-50"><i class="bi bi-check-all me-1"></i> RESOLVIDO</span>';

            return `
            <div class="${cardClass}">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar-circle small">${avatarInitial}</div>
                        <div>
                            <div class="fw-bold mb-0" style="font-size: 0.9rem;">${item.email || 'Anônimo'}</div>
                            <div class="text-secondary" style="font-size: 0.75rem;">${new Date(item.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-dark bg-opacity-50 border border-secondary border-opacity-25 small mb-1">
                            ${item.classification}
                        </span>
                        <div class="${confidenceClass} fw-bold" style="font-size: 0.7rem;">
                            <i class="bi bi-shield-check"></i> ${Math.round(item.confidence)}%
                        </div>
                    </div>
                </div>
                
                <div class="mb-3 text-light-50" style="font-size: 0.95rem; line-height: 1.5;">${item.message}</div>
                
                <div class="d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-10">
                    <div class="text-secondary d-flex align-items-center gap-2" style="font-size: 0.75rem;">
                        <i class="bi bi-robot"></i> 
                        <span class="opacity-75">${item.aiReason || 'Análise heurística aplicada'}</span>
                    </div>
                    <div>${acoes}</div>
                </div>
            </div>
            `;
        }).join('');

    container.innerHTML = html || '<div class="text-center py-5 opacity-25"><h6>Nenhum resultado para a busca</h6></div>';
}

async function marcarComoRespondida(messageId, timestamp) {
    try {
        await window.authenticatedFetch(`${window.API_CONFIG.baseURL}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, timestamp, status: 'Respondida' })
        });
        carregarDuvidas();
    } catch (e) { console.error(e); }
}

async function rejeitarMensagem(messageId, timestamp) {
    if(!confirm('Confirmar correção de IA: Esta mensagem não é uma dúvida?')) return;
    try {
        await window.authenticatedFetch(`${window.API_CONFIG.baseURL}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, timestamp, correctClassification: 'INTERACAO' })
        });
        await marcarComoRespondida(messageId, timestamp);
    } catch (e) { console.error(e); }
}

function updateTopStudents(items) {
    const container = document.getElementById('topStudentsList');
    if(!container) return;
    const counts = {};
    items.forEach(item => {
        if (item.classification === 'DUVIDA') counts[item.email || 'Anônimo'] = (counts[item.email || 'Anônimo'] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 5);
    if(top.length === 0) return;
    container.innerHTML = top.map(([email, count], i) => `
        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-white border-opacity-5">
            <div class="d-flex align-items-center gap-2">
                <span class="text-primary fw-bold" style="width: 20px;">${i+1}</span>
                <span class="opacity-75">${email}</span>
            </div>
            <span class="badge bg-primary bg-opacity-10 text-primary rounded-pill">${count}</span>
        </div>
    `).join('');
}

function updateIAMetrics(messages) {
    const withAI = messages.filter(m => m.confidence !== undefined);
    if (withAI.length === 0) return;
    const avgConf = withAI.reduce((sum, m) => sum + m.confidence, 0) / withAI.length;
    document.getElementById('iaConfidence').textContent = avgConf.toFixed(1) + '%';
    document.getElementById('iaCallsCount').textContent = withAI.length;
    const fallbacks = withAI.filter(m => !m.aiScore || m.aiScore === 0).length;
    document.getElementById('iaFallbackRate').textContent = ((fallbacks / withAI.length) * 100).toFixed(1) + '%';
    document.getElementById('iaAccuracy').textContent = avgConf.toFixed(1) + '%';
}