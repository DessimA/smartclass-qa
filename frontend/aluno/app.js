document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('messageForm');
    const msgInput = document.getElementById('mensagem');
    const charCount = document.getElementById('charCount');

    // Contador de caracteres
    if (msgInput && charCount) {
        msgInput.addEventListener('input', () => {
            charCount.innerText = msgInput.value.length;
        });
    }

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerText;
    const alertContainer = document.getElementById('alertContainer');
    
    // Captura IDs corretos do HTML
    const nome = document.getElementById('alunoNome').value;
    const mensagem = document.getElementById('mensagem').value;
    
    if (!nome || !mensagem) {
        showAlert('Por favor, preencha todos os campos.', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'ENVIANDO...';
    alertContainer.className = 'alert'; // Esconde alerta anterior
    
    try {
        const endpoint = window.API_CONFIG.endpoints.mensagem;
        const url = `${window.API_CONFIG.baseURL}${endpoint}`;
        
        const payload = {
            email: nome,
            message: mensagem,
            type: 'text'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert(`✅ Mensagem enviada! (ID: ${data.id})`, 'success');
            document.getElementById('mensagem').value = '';
            document.getElementById('charCount').innerText = '0';
            addToHistory(nome, mensagem, data.classification);
        } else {
            throw new Error(data.error || 'Erro desconhecido');
        }

    } catch (error) {
        console.error(error);
        showAlert(`❌ Erro: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

function showAlert(msg, type) {
    const el = document.getElementById('alertContainer');
    el.innerText = msg;
    el.className = `alert show alert-${type}`;
}

function addToHistory(nome, msg, classification) {
    const section = document.getElementById('historySection');
    const list = document.getElementById('historyList');
    
    section.style.display = 'block';
    
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <div class="meta">Agora • ${nome}</div>
        <div class="message">${msg}</div>
        <div class="classification ${classification.toLowerCase()}">${classification}</div>
    `;
    
    list.prepend(item);
}
