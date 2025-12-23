/**
 * Configuração da API - Gerada Automaticamente pelo Deploy
 */
const API_CONFIG = {
  baseURL: 'https://g3kbvudvuhy5rbcwr72jb5kbkm0kvohn.lambda-url.us-west-2.on.aws',
  endpoints: {
    mensagem: '/mensagem',
    duvidas: '/duvidas',
    status: '/status'
  }
};

window.API_CONFIG = API_CONFIG;

window.isAPIConfigured = function() {
  return API_CONFIG && API_CONFIG.baseURL;
};

window.getApiUrl = function(endpoint) {
  return API_CONFIG.baseURL + API_CONFIG.endpoints[endpoint];
};
