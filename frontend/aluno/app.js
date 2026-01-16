document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('messageForm');
    const charCount = document.getElementById('charCount');
    const msgInput = document.getElementById('mensagem');
    const warningModal = new bootstrap.Modal(document.getElementById('warningModal'));

    if (!window.isAPIConfigured()) {
        showAlert('Erro de configuração: API URL não definida.', 'error');
        if(document.getElementById('submitBtn')) document.getElementById('submitBtn').disabled = true;
        return;
    }

    msgInput.addEventListener('input', function() {
        const currentLength = this.value.length;
        charCount.innerText = currentLength;
        charCount.style.color = currentLength >= 950 ? '#ef4444' : '#78909c';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('submitBtn');
        const originalBtnContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

        const alunoNome = document.getElementById('alunoNome').value;
        const mensagem = document.getElementById('mensagem').value;

        try {
            const url = window.getApiUrl('mensagem');
            const response = await window.authenticatedFetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: alunoNome, message: mensagem, type: 'text' })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.status === "SUCCESS") {
                    showAlert(data.message, 'success');
                    form.reset();
                    charCount.innerText = '0';
                    addToHistory(alunoNome, mensagem, data.classification);
                } else if (data.status === "REJECTED") {
                    showWarningModal(data.message);
                } else {
                    showAlert(data.message, 'info'); 
                    form.reset();
                    charCount.innerText = '0';
                }
            } else {
                throw new Error(data.error || 'Erro ao enviar mensagem');
            }
        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalBtnContent;
        }
    });

    function showWarningModal(message) {
        document.getElementById('modalMessage').innerText = message;
        warningModal.show();
    }
});

function showAlert(message, type) {
    const alertBox = document.getElementById('alertContainer');
    let alertClass = 'alert border-0 shadow-sm ';
    let iconClass = 'bi me-2 ';

    if (type === 'success') {
        alertClass += 'alert-success bg-success bg-opacity-25 text-white';
        iconClass += 'bi-check-circle-fill';
    } else if (type === 'info') {
        alertClass += 'alert-primary bg-primary bg-opacity-25 text-white';
        iconClass += 'bi-info-circle-fill';
    } else {
        alertClass += 'alert-danger bg-danger bg-opacity-25 text-white';
        iconClass += 'bi-exclamation-octagon-fill';
    }

    alertBox.innerHTML = `<div class="${alertClass} d-flex align-items-center"><i class="${iconClass}"></i><div>${message}</div></div>`;
    alertBox.style.display = 'block';

    setTimeout(() => {
        alertBox.style.display = 'none';
    }, 6000);
}

function addToHistory(nome, msg, classificacao) {
    const historySection = document.getElementById('historySection');
    const list = document.getElementById('historyList');
    historySection.style.display = 'block';

    const item = document.createElement('div');
    item.className = 'glass-card p-3 mb-2 border-start border-4 border-success';
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="badge bg-success bg-opacity-25 text-success small py-1 px-2">${classificacao}</span>
            <small class="text-secondary opacity-75">${time}</small>
        </div>
        <div class="text-light opacity-90 small text-truncate">${msg}</div>
    `;

    list.prepend(item);
}
