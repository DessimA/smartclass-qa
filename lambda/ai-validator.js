const { ComprehendClient, DetectSentimentCommand, DetectKeyPhrasesCommand } = require("@aws-sdk/client-comprehend");
const { TECHNICAL_TERMS } = require('./constants');

class AIValidator {
  constructor(region = "us-west-2") {
    this.client = new ComprehendClient({ region });
  }

  /**
   * VERSÃO MELHORADA: Usa scores numéricos do Comprehend + ML híbrido
   */
  async validate(message, localClassification) {
    const cleanMsg = message.toLowerCase();

    try {
      const [sentimentResult, phrasesResult] = await Promise.all([
        this.client.send(new DetectSentimentCommand({ Text: message, LanguageCode: 'pt' })),
        this.client.send(new DetectKeyPhrasesCommand({ Text: message, LanguageCode: 'pt' }))
      ]);

      // === MUDANÇA 1: Usar scores numéricos ===
      const sentimentScores = sentimentResult.SentimentScore;
      const keyPhrases = phrasesResult.KeyPhrases || [];
      
      console.log('[IA] Scores de Sentimento:', sentimentScores);
      console.log('[IA] Key Phrases:', keyPhrases.map(p => p.Text));

      // === MUDANÇA 2: Calcular score baseado em múltiplos fatores ===
      let aiScore = 0;
      let reasons = [];

      // Fator 1: Sentimento Negativo/Neutro indica possível problema/dúvida
      if (sentimentScores.Negative > 0.3) {
        aiScore += sentimentScores.Negative * 30; // Peso: 30
        reasons.push(`sentimento negativo (${(sentimentScores.Negative * 100).toFixed(1)}%)`);
      }
      
      if (sentimentScores.Neutral > 0.5) {
        aiScore += sentimentScores.Neutral * 20; // Peso: 20
        reasons.push(`tom neutro típico de perguntas técnicas`);
      }

      // Fator 2: Detecção de termos técnicos nas key phrases do Comprehend
      const technicalPhrasesFound = keyPhrases.filter(phrase => {
        const phraseText = phrase.Text.toLowerCase();
        return TECHNICAL_TERMS.some(term => phraseText.includes(term));
      });

      if (technicalPhrasesFound.length > 0) {
        aiScore += technicalPhrasesFound.length * 25; // Peso: 25 por termo
        reasons.push(`${technicalPhrasesFound.length} termo(s) técnico(s) AWS detectado(s)`);
      }

      // Fator 3: Confidence das key phrases (quanto mais confiante, mais provável ser dúvida)
      const avgConfidence = keyPhrases.length > 0
        ? keyPhrases.reduce((sum, p) => sum + p.Score, 0) / keyPhrases.length
        : 0;
      
      if (avgConfidence > 0.8) {
        aiScore += 15;
        reasons.push('alta confiança nas entidades detectadas');
      }

      // Fator 4: Combinar com classificação local (peso menor)
      if (localClassification.classification === 'DUVIDA') {
        aiScore += 10;
        reasons.push('regras locais também indicam dúvida');
      }

      // === MUDANÇA 3: Decisão baseada em score combinado ===
      const THRESHOLD = 40; // Score mínimo para ser dúvida
      const finalClassification = aiScore >= THRESHOLD ? 'DUVIDA' : 'INTERACAO';
      
      // Confiança baseada na distância do threshold
      const distance = Math.abs(aiScore - THRESHOLD);
      const confidence = Math.min(0.5 + (distance / 100), 0.99);

      console.log(`[IA] Score Final: ${aiScore.toFixed(2)} | Threshold: ${THRESHOLD} | Decisão: ${finalClassification}`);

      return {
        classification: finalClassification,
        confidence: parseFloat(confidence.toFixed(2)),
        aiScore: parseFloat(aiScore.toFixed(2)),
        reason: reasons.length > 0 ? reasons.join('; ') : 'Análise de IA não encontrou indicadores claros',
        
        // Dados extras para auditoria
        debug: {
          sentimentScores,
          technicalPhrasesFound: technicalPhrasesFound.map(p => p.Text),
          avgPhraseConfidence: parseFloat(avgConfidence.toFixed(3)),
          localClassification: localClassification.classification
        }
      };

    } catch (error) {
      console.error("[AI ERROR]", error);
      
      // Fallback melhorado: Usa dados locais com confiança baixa
      return { 
        classification: localClassification.classification, 
        confidence: 0.3, // Confiança baixa por ser fallback
        aiScore: 0,
        reason: `Erro na IA (${error.message}), usando classificação local`,
        debug: { error: error.message }
      };
    }
  }

  /**
   * NOVO: Método para retreinar threshold dinamicamente (futuro)
   */
  async calibrateThreshold(trainingData) {
    // trainingData = [{ message, expectedClass }, ...]
    // Implementar em versão futura: ajustar THRESHOLD baseado em feedback
    console.log('[IA] Calibração de threshold não implementada ainda');
  }
}

module.exports = AIValidator;