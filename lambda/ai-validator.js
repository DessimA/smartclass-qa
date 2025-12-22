const { ComprehendClient, DetectSentimentCommand, DetectKeyPhrasesCommand } = require("@aws-sdk/client-comprehend");
const { TECHNICAL_TERMS } = require('./constants');

class AIValidator {
  constructor(region = "us-west-2") {
    this.client = new ComprehendClient({ region });
  }

  async validate(message, initialClassification) {
    const cleanMsg = message.toLowerCase();

    try {
      const [sentimentResult, phrasesResult] = await Promise.all([
        this.client.send(new DetectSentimentCommand({ Text: message, LanguageCode: 'pt' })),
        this.client.send(new DetectKeyPhrasesCommand({ Text: message, LanguageCode: 'pt' }))
      ]);

      const sentiment = sentimentResult.Sentiment;
      const keyPhrases = phrasesResult.KeyPhrases || [];
      
      // Verifica se alguma das frases-chave detectadas pela IA contém nossos termos técnicos
      const hasAWSTermInPhrases = keyPhrases.some(phrase => {
          const phraseText = phrase.Text.toLowerCase();
          return TECHNICAL_TERMS.some(term => phraseText.includes(term));
      });

      // Se não houver termo técnico no texto original também, reforçamos a checagem
      const hasAWSTermInRaw = TECHNICAL_TERMS.some(term => cleanMsg.includes(term));

      let classification = "INTERACAO";
      let reason = "A IA não detectou termos técnicos específicos da AWS.";

      if (hasAWSTermInPhrases || hasAWSTermInRaw) {
          // Se tem termo técnico, a IA valida se a intenção parece uma dúvida ou problema
          if (sentiment === 'NEGATIVE' || sentiment === 'NEUTRAL' || initialClassification === 'DUVIDA') {
              classification = "DUVIDA";
              reason = "IA confirmou dúvida com contexto técnico AWS.";
          }
      }

      return { classification, confidence: 0.9, reason };

    } catch (error) {
      console.error("[AI ERROR]", error);
      // Fallback: Se a IA falhar, usamos o rigor do classificador local
      return { 
        classification: initialClassification, 
        confidence: 0.5, 
        reason: "Erro na IA, usando validação rigorosa local." 
      };
    }
  }
}

module.exports = AIValidator;
