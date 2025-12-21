/**
 * Smart Class Q&A - Configuração da API
 * 
 * IMPORTANTE: Este arquivo será atualizado automaticamente pelo script de deploy
 * com a URL correta da API Gateway
 */

const API_CONFIG = {
    // URL base da API Gateway (será preenchida pelo deploy.sh)
    baseURL: 'https://YOUR_API_ID.execute-api.us-west-2.amazonaws.com/prod',
    
    // Endpoints disponíveis
    endpoints: {
        mensagem: '/mensagem',      // POST - Enviar mensagem
        duvidas: '/duvidas',         // GET - Listar dúvidas
        status: '/status'            // PUT - Atualizar status
    },
    
    // Configurações de timeout
    timeout: 30000, // 30 segundos
    
    // Headers padrão
    defaultHeaders: {
        'Content-Type': 'application/json'
    }
};

/**
 * Verificar se API está configurada
 */
function isAPIConfigured() {
    return !API_CONFIG.baseURL.includes('YOUR_API_ID');
}

/**
 * Helper para fazer requisições à API
 */
async function apiRequest(endpoint, options = {}) {
    if (!isAPIConfigured()) {
        throw new Error('API não configurada. Execute o deploy primeiro.');
    }
    
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    
    const defaultOptions = {
        headers: API_CONFIG.defaultHeaders,
        timeout: API_CONFIG.timeout
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        
        const response = await fetch(url, {
            ...finalOptions,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        return response;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Timeout: A requisição demorou muito para responder');
        }
        throw error;
    }
}

// Expor configuração globalmente
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.apiRequest = apiRequest;
    window.isAPIConfigured = isAPIConfigured;
    
    // Log de debug
    if (!isAPIConfigured()) {
        console.warn('⚠️  API não configurada. Execute o deploy.sh para configurar.');
    } else {
        console.log('✅ API configurada:', API_CONFIG.baseURL);
    }
}