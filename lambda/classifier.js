class MessageClassifier {
  constructor() {
    this.questionKeywords = ['como', 'quando', 'onde', 'qual', 'quais', 'porque', 'por que', 'posso', 'consigo', 'consegui', 'pode', 'devo', 'preciso', 'entendi', 'não entendi', 'entendo', 'funciona', 'fazer', 'diferença', 'explica', 'explicar', 'novamente', 'ajuda', 'comando', 'lab', 'kc', 'tela', 'isso', 'essa', 'esse'];
    this.technicalTerms = ['lambda', 'ec2', 's3', 'dynamodb', 'api', 'gateway', 'aws', 'cloud', 'bucket', 'função', 'serverless', 'região', 'sandbox', 'deploy', 'código', 'script', 'lab', 'kc', 'comando', 'terminal', 'console'];
    this.socialKeywords = ['bom dia', 'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'valeu', 'legal', 'show', 'parabéns', 'massa', 'top', 'blz', 'beleza', 'tranquilo', 'ok', 'certo', 'entendi', 'consegui', 'tchau', 'até', 'falou', 'kkk', 'rsrs', 'haha'];
    this.negativeKeywords = ['não', 'nunca', 'nada', 'difícil', 'complicado', 'erro', 'problema', 'perdido', 'confuso', 'dúvida', 'ajuda'];
    this.weights = { hasQuestionMark: 3.0, questionKeywords: 2.5, technicalTerms: 2.0, socialKeywords: -3.0, negativeKeywords: 1.5, messageLength: 0.5 };
    this.threshold = 2.0;
  }

  classify(message) {
    const analysis = this.analyzeMessage(message);
    const score = this.calculateScore(analysis);
    const classification = score >= this.threshold ? 'DUVIDA' : 'INTERACAO';
    return { classification, score: parseFloat(score.toFixed(2)), confidence: this.calculateConfidence(score), analysis, reason: this.generateReason(analysis, classification) };
  }

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

  normalize(text) { return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s?]/g, ' ').replace(/\s+/g, ' ').trim(); }
  tokenize(text) { return text.split(' ').filter(token => token.length > 0); }
  
  countMatches(tokens, keywords) {
    let count = 0;
    const tokensStr = tokens.join(' ');
    keywords.forEach(keyword => {
      // Escape especial para regex
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (tokensStr.match(regex)) count += tokensStr.match(regex).length;
    });
    return count;
  }

  analyzeSentiment(tokens) {
    const positiveWords = ['obrigado', 'parabens', 'legal', 'show', 'bom', 'otimo'];
    const negativeWords = ['nao', 'ruim', 'dificil', 'erro', 'problema', 'confuso'];
    let positiveCount = this.countMatches(tokens, positiveWords);
    let negativeCount = this.countMatches(tokens, negativeWords);
    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  calculateScore(analysis) {
    let score = 0;
    if (analysis.hasQuestionMark) score += this.weights.hasQuestionMark;
    score += analysis.questionKeywordCount * this.weights.questionKeywords;
    score += analysis.technicalTermCount * this.weights.technicalTerms;
    score += analysis.socialKeywordCount * this.weights.socialKeywords;
    score += analysis.negativeKeywordCount * this.weights.negativeKeywords;
    if (analysis.wordCount >= 3) score += this.weights.messageLength;
    if (analysis.technicalTermCount > 0 && analysis.questionKeywordCount > 0) score += 1.0;
    return score;
  }

  calculateConfidence(score) {
    const distance = Math.abs(score - this.threshold);
    const confidence = Math.min(50 + (distance * 10), 95);
    return Math.round(confidence);
  }

  generateReason(analysis, classification) {
    const reasons = [];
    if (analysis.hasQuestionMark) reasons.push('contém interrogação');
    if (analysis.questionKeywordCount > 0) reasons.push(`${analysis.questionKeywordCount} palavra(s) interrogativa(s)`);
    if (analysis.technicalTermCount > 0) reasons.push(`${analysis.technicalTermCount} termo(s) técnico(s)`);
    if (analysis.socialKeywordCount > 0) reasons.push(`${analysis.socialKeywordCount} termo(s) de interação social`);
    if (analysis.sentiment === 'NEGATIVE') reasons.push('sentimento negativo/confusão detectado');
    if (reasons.length === 0) reasons.push('análise contextual geral');
    return `${classification} detectada: ${reasons.join(', ')}`;
  }
}
module.exports = MessageClassifier;
