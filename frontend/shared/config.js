/**
 * Configuração da API - Gerada Automaticamente
 */
const API_CONFIG = {
  baseURL: 'https://lweramtlmzjrw5ri7zlhytuqgi0fvoas.lambda-url.us-west-2.on.aws',
  endpoints: {
    mensagem: '/mensagem',
    duvidas: '/duvidas',
    status: '/status'
  }
};

// Exporta para o escopo global (necessário para app.js)
window.API_CONFIG = API_CONFIG;

/**
 * Verifica se a API está configurada corretamente
 * Esta é a função que estava faltando e causando o erro no Dashboard
 */
window.isAPIConfigured = function() {
  return API_CONFIG && 
         API_CONFIG.baseURL && 
         !API_CONFIG.baseURL.includes('SEU_API_GATEWAY_URL');
};

/**
 * Helper para montar URLs
 */
window.getApiUrl = function(endpoint) {
  if (!API_CONFIG.endpoints[endpoint]) {
    console.error(`Endpoint não encontrado: ${endpoint}`);
    return '';
  }
  return `${API_CONFIG.baseURL}${API_CONFIG.endpoints[endpoint]}`;
};

console.log('Configuração da API carregada:', API_CONFIG.baseURL);
