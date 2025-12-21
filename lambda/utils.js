/**
 * Smart Class Q&A - Funções Utilitárias
 * Helpers e validações comuns
 */

/**
 * Validar formato de email
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Sanitizar entrada de texto
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove < e > para evitar XSS
    .substring(0, 1000); // Limita tamanho
}

/**
 * Formatar timestamp para exibição
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Calcular tempo decorrido
 */
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} dia(s) atrás`;
  if (hours > 0) return `${hours} hora(s) atrás`;
  if (minutes > 0) return `${minutes} minuto(s) atrás`;
  return 'Agora mesmo';
}

/**
 * Validar dados de mensagem
 */
function validateMessageData(data) {
  const errors = [];
  
  if (!data) {
    errors.push('Dados da mensagem não fornecidos');
    return { valid: false, errors };
  }
  
  if (!data.mensagem || typeof data.mensagem !== 'string') {
    errors.push('Campo "mensagem" é obrigatório e deve ser texto');
  } else if (data.mensagem.trim().length === 0) {
    errors.push('Mensagem não pode estar vazia');
  } else if (data.mensagem.length > 1000) {
    errors.push('Mensagem muito longa (máximo 1000 caracteres)');
  }
  
  if (!data.alunoNome || typeof data.alunoNome !== 'string') {
    errors.push('Campo "alunoNome" é obrigatório e deve ser texto');
  } else if (data.alunoNome.trim().length === 0) {
    errors.push('Nome do aluno não pode estar vazio');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gerar resposta HTTP padronizada
 */
function createAPIResponse(statusCode, data, message = null) {
  const response = {
    statusCode,
    timestamp: new Date().toISOString(),
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  return response;
}

/**
 * Parsear query string parameters
 */
function parseQueryParams(queryStringParameters) {
  if (!queryStringParameters) return {};
  
  const params = {};
  
  Object.keys(queryStringParameters).forEach(key => {
    const value = queryStringParameters[key];
    
    // Tentar converter para número se possível
    if (!isNaN(value) && value !== '') {
      params[key] = Number(value);
    } else if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

/**
 * Gerar ID único curto
 */
function generateShortId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Truncar texto
 */
function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Calcular estatísticas de confiança
 */
function calculateConfidenceStats(messages) {
  if (!messages || messages.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      count: 0
    };
  }
  
  const confidences = messages
    .map(m => m.confidence || 0)
    .filter(c => c > 0);
  
  if (confidences.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      count: 0
    };
  }
  
  const sum = confidences.reduce((a, b) => a + b, 0);
  const average = sum / confidences.length;
  const min = Math.min(...confidences);
  const max = Math.max(...confidences);
  
  return {
    average: Math.round(average),
    min,
    max,
    count: confidences.length
  };
}

/**
 * Logger estruturado
 */
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      data
    }));
  },
  
  error: (message, error = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: {
        message: error.message,
        stack: error.stack
      }
    }));
  },
  
  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      data
    }));
  }
};

/**
 * Delay para testes
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry com backoff exponencial
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delayTime = baseDelay * Math.pow(2, i);
        logger.warn(`Tentativa ${i + 1} falhou, aguardando ${delayTime}ms...`, {
          error: error.message
        });
        await delay(delayTime);
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  isValidEmail,
  sanitizeText,
  formatTimestamp,
  getTimeAgo,
  validateMessageData,
  createAPIResponse,
  parseQueryParams,
  generateShortId,
  truncateText,
  calculateConfidenceStats,
  logger,
  delay,
  retryWithBackoff
};