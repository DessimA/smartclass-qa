/**
 * Smart Class Q&A - Motor de IA Proprietário
 * Classificador de Mensagens: DÚVIDA vs INTERAÇÃO
 * 
 * Técnicas utilizadas:
 * 1. Análise Léxica e Tokenização
 * 2. Detecção de Palavras-Chave Contextuais
 * 3. Análise de Sentimento Simplificada
 * 4. Score Multi-critério com Pesos
 * 5. Threshold Adaptativo
 */

class MessageClassifier {
  constructor() {
    // Palavras-chave que indicam dúvidas técnicas
    this.questionKeywords = [
      'como', 'quando', 'onde', 'qual', 'quais', 'porque', 'por que',
      'posso', 'consigo', 'consegui', 'pode', 'devo', 'preciso',
      'entendi', 'não entendi', 'entendo', 'funciona', 'fazer',
      'diferença', 'explica', 'explicar', 'novamente', 'ajuda',
      'comando', 'lab', 'kc', 'tela', 'isso', 'essa', 'esse'
    ];

    // Termos técnicos do contexto AWS/educacional
    this.technicalTerms = [
      'lambda', 'ec2', 's3', 'dynamodb', 'api', 'gateway',
      'aws', 'cloud', 'bucket', 'função', 'serverless',
      'região', 'sandbox', 'deploy', 'código', 'script',
      'lab', 'kc', 'comando', 'terminal', 'console'
    ];

    // Palavras de interação social (não são dúvidas)
    this.socialKeywords = [
      'bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada',
      'valeu', 'legal', 'show', 'parabéns', 'massa', 'top',
      'blz', 'beleza', 'tranquilo', 'ok', 'certo', 'entendi',
      'consegui', 'tchau', 'até', 'falou', 'kkk', 'rsrs', 'haha'
    ];

    // Palavras que indicam sentimento negativo/confusão
    this.negativeKeywords = [
      'não', 'nunca', 'nada', 'difícil', 'complicado', 'erro',
      'problema', 'perdido', 'confuso', 'dúvida', 'ajuda'
    ];

    // Pesos para o score final
    this.weights = {
      hasQuestionMark: 3.0,
      questionKeywords: 2.5,
      technicalTerms: 2.0,
      socialKeywords: -3.0,
      negativeKeywords: 1.5,
      messageLength: 0.5
    };

    // Threshold de decisão
    this.threshold = 2.0;
  }

  /**
   * Método principal de classificação
   */
  classify(message) {
    const analysis = this.analyzeMessage(message);
    const score = this.calculateScore(analysis);
    const classification = score >= this.threshold ? 'DUVIDA' : 'INTERACAO';
    
    return {
      classification,
      score: parseFloat(score.toFixed(2)),
      confidence: this.calculateConfidence(score),
      analysis,
      reason: this.generateReason(analysis, classification)
    };
  }

  /**
   * Análise completa da mensagem
   */
  analyzeMessage(message) {
    const normalized = this.normalize(message);
    const tokens = this.tokenize(normalized);
    
    return {
      original: message,
      normalized,
      tokens,
      hasQuestionMark: message.includes('?'),
      questionKeywordCount: this.countMatches(tokens, this.questionKeywords),
      technicalTermCount: this.countMatches(tokens, this.technicalTerms),
      socialKeywordCount: this.countMatches(tokens, this.socialKeywords),
      negativeKeywordCount: this.countMatches(tokens, this.negativeKeywords),
      messageLength: message.length,
      wordCount: tokens.length,
      sentiment: this.analyzeSentiment(tokens)
    };
  }

  /**
   * Normalização de texto
   */
  normalize(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s?]/g, ' ') // Remove pontuação exceto ?
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenização
   */
  tokenize(text) {
    return text
      .split(' ')
      .filter(token => token.length > 0);
  }

  /**
   * Conta ocorrências de palavras-chave
   */
  countMatches(tokens, keywords) {
    let count = 0;
    const tokensStr = tokens.join(' ');
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = tokensStr.match(regex);
      if (matches) count += matches.length;
    });
    
    return count;
  }

  /**
   * Análise de sentimento simplificada
   */
  analyzeSentiment(tokens) {
    const positiveWords = ['obrigado', 'parabens', 'legal', 'show', 'bom', 'otimo'];
    const negativeWords = ['nao', 'ruim', 'dificil', 'erro', 'problema', 'confuso'];
    
    let positiveCount = this.countMatches(tokens, positiveWords);
    let negativeCount = this.countMatches(tokens, negativeWords);
    
    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Calcula score final baseado em múltiplos critérios
   */
  calculateScore(analysis) {
    let score = 0;

    // 1. Ponto de interrogação tem peso alto
    if (analysis.hasQuestionMark) {
      score += this.weights.hasQuestionMark;
    }

    // 2. Palavras-chave de pergunta
    score += analysis.questionKeywordCount * this.weights.questionKeywords;

    // 3. Termos técnicos aumentam chance de ser dúvida
    score += analysis.technicalTermCount * this.weights.technicalTerms;

    // 4. Palavras sociais diminuem chance de ser dúvida
    score += analysis.socialKeywordCount * this.weights.socialKeywords;

    // 5. Sentimento negativo pode indicar confusão/dúvida
    score += analysis.negativeKeywordCount * this.weights.negativeKeywords;

    // 6. Mensagens muito curtas tendem a ser interação
    if (analysis.wordCount >= 3) {
      score += this.weights.messageLength;
    }

    // 7. Bônus para mensagens com contexto técnico
    if (analysis.technicalTermCount > 0 && analysis.questionKeywordCount > 0) {
      score += 1.0; // Bônus de combinação
    }

    return score;
  }

  /**
   * Calcula nível de confiança (0-100%)
   */
  calculateConfidence(score) {
    const distance = Math.abs(score - this.threshold);
    const confidence = Math.min(50 + (distance * 10), 95);
    return Math.round(confidence);
  }

  /**
   * Gera explicação da classificação
   */
  generateReason(analysis, classification) {
    const reasons = [];

    if (analysis.hasQuestionMark) {
      reasons.push('contém interrogação');
    }

    if (analysis.questionKeywordCount > 0) {
      reasons.push(`${analysis.questionKeywordCount} palavra(s) interrogativa(s)`);
    }

    if (analysis.technicalTermCount > 0) {
      reasons.push(`${analysis.technicalTermCount} termo(s) técnico(s)`);
    }

    if (analysis.socialKeywordCount > 0) {
      reasons.push(`${analysis.socialKeywordCount} termo(s) de interação social`);
    }

    if (analysis.sentiment === 'NEGATIVE') {
      reasons.push('sentimento negativo/confusão detectado');
    }

    if (reasons.length === 0) {
      reasons.push('análise contextual geral');
    }

    return `${classification} detectada: ${reasons.join(', ')}`;
  }

  /**
   * Método auxiliar para testes
   */
  classifyBatch(messages) {
    return messages.map(msg => ({
      message: msg,
      result: this.classify(msg)
    }));
  }
}

// Exportar para uso no Lambda
module.exports = MessageClassifier;