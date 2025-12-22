document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('messageForm');
    const charCount = document.getElementById('charCount');
    const msgInput = document.getElementById('mensagem');

    if (!window.isAPIConfigured()) {
        showAlert('Erro de configuração: API URL não definida.', 'error');
        if(document.getElementById('submitBtn')) document.getElementById('submitBtn').disabled = true;
        return;
    }

    msgInput.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCount.innerText = currentLength;
        if (currentLength >= 1000) {
            charCount.style.color = 'red';
        } else {
            charCount.style.color = '#78909c';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const originalBtnText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Enviando...';

        const alunoNome = document.getElementById('alunoNome').value;
        const mensagem = document.getElementById('mensagem').value;

        const payload = {
            email: alunoNome,
            message: mensagem,
            type: 'text'
        };

        try {
            const url = window.getApiUrl('mensagem');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(`Mensagem enviada! Classificação: ${data.classification || 'N/A'}`, 'success');
                form.reset();
                charCount.innerText = '0';
                addToHistory(alunoNome, mensagem, data.classification);
            } else {
                throw new Error(data.error || 'Erro ao enviar mensagem');
            }

        } catch (error) {
            showAlert(`Erro: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerText = originalBtnText;
        }
    });
});

function showAlert(message, type) {
    const alertBox = document.getElementById('alertContainer');
    alertBox.innerText = message;
    alertBox.className = `alert alert-${type} show`;
    alertBox.style.display = 'block';
    
    if (type === 'success') {
        alertBox.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
        alertBox.style.color = '#34d399';
        alertBox.style.border = '1px solid #10b981';
    } else {
        alertBox.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
        alertBox.style.color = '#f87171';
        alertBox.style.border = '1px solid #ef4444';
    }

    setTimeout(() => {
        alertBox.style.display = 'none';
        alertBox.className = 'alert';
    }, 5000);
}

function addToHistory(nome, msg, classificacao) {
    const historySection = document.getElementById('historySection');
    const list = document.getElementById('historyList');
    
    historySection.style.display = 'block';

    const item = document.createElement('div');
    item.className = 'history-item fade-in';
    item.style.marginBottom = '10px';
    item.style.padding = '10px';
    item.style.borderRadius = '8px';
    item.style.background = 'rgba(255,255,255,0.05)';
    item.style.borderLeft = '3px solid var(--primary-color)';

    const time = new Date().toLocaleTimeString();
    
    item.innerHTML = `
        <div class="meta" style="font-size: 0.8rem; opacity: 0.7; margin-bottom: 5px;">
            <span>${time}</span> • 
            <span class="badge" style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px;">${classificacao}</span>
        </div>
        <div class="message" style="font-size: 0.95rem;">${msg}</div>
    `;

    list.prepend(item);
}