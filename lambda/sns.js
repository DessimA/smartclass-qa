/**
 * Smart Class Q&A - Serviço SNS
 * Gerencia notificações para o professor
 */

class SNSService {
  constructor(snsClient, topicArn) {
    this.client = snsClient;
    this.topicArn = topicArn;
  }

  /**
   * Enviar notificação quando nova dúvida é detectada
   */
  async notifyNewQuestion(questionData) {
    const { alunoNome, mensagem, confidence, timestamp } = questionData;

    const subject = '🔔 Nova Dúvida Detectada - Smart Class Q&A';
    
    const message = this.formatQuestionNotification({
      alunoNome,
      mensagem,
      confidence,
      timestamp
    });

    return await this.sendNotification(subject, message);
  }

  /**
   * Formatar notificação de nova dúvida
   */
  formatQuestionNotification(data) {
    const { alunoNome, mensagem, confidence, timestamp } = data;
    const formattedTime = new Date(timestamp).toLocaleString('pt-BR');

    return `
╔════════════════════════════════════════════════════════╗
║       SMART CLASS Q&A - NOVA DÚVIDA DETECTADA        ║
╚════════════════════════════════════════════════════════╝

📅 Data/Hora: ${formattedTime}
👤 Aluno: ${alunoNome}
🎯 Confiança da IA: ${confidence}%

💬 DÚVIDA:
"${mensagem}"

───────────────────────────────────────────────────────

🎓 Acesse o dashboard do professor para responder:
   https://[SEU-BUCKET].s3-website-us-west-2.amazonaws.com/professor/

───────────────────────────────────────────────────────

Este é um email automático do sistema Smart Class Q&A.
Desenvolvido para melhorar a experiência de ensino remoto.

✨ Powered by AWS Lambda + IA Proprietária
    `.trim();
  }

  /**
   * Enviar notificação genérica
   */
  async sendNotification(subject, message) {
    if (!this.topicArn) {
      console.warn('SNS Topic ARN não configurado. Pulando notificação.');
      return { skipped: true };
    }

    const params = {
      TopicArn: this.topicArn,
      Subject: subject,
      Message: message,
      MessageAttributes: {
        'priority': {
          DataType: 'String',
          StringValue: 'high'
        },
        'source': {
          DataType: 'String',
          StringValue: 'smartclass-qa'
        }
      }
    };

    try {
      const result = await this.client.publish(params).promise();
      console.log('Notificação SNS enviada:', result.MessageId);
      return {
        success: true,
        messageId: result.MessageId
      };
    } catch (error) {
      console.error('Erro ao enviar notificação SNS:', error);
      
      // Não falhar a aplicação se SNS falhar
      // Apenas logar o erro
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar resumo diário (para futuras implementações)
   */
  async sendDailySummary(summaryData) {
    const subject = '📊 Resumo Diário - Smart Class Q&A';
    
    const message = `
╔════════════════════════════════════════════════════════╗
║          SMART CLASS Q&A - RESUMO DO DIA             ║
╚════════════════════════════════════════════════════════╝

📅 Data: ${new Date().toLocaleDateString('pt-BR')}

📊 ESTATÍSTICAS:
   • Total de mensagens: ${summaryData.totalMensagens}
   • Dúvidas detectadas: ${summaryData.totalDuvidas}
   • Dúvidas respondidas: ${summaryData.duvidasRespondidas}
   • Dúvidas pendentes: ${summaryData.duvidasPendentes}
   • Interações sociais: ${summaryData.totalInteracoes}

🎯 TAXA DE RESPOSTA: ${summaryData.taxaResposta}%

${summaryData.duvidasPendentes > 0 ? `
⚠️  ATENÇÃO: Você tem ${summaryData.duvidasPendentes} dúvida(s) pendente(s)!
   Acesse o dashboard para responder.
` : '✅ Parabéns! Todas as dúvidas foram respondidas!'}

───────────────────────────────────────────────────────

🎓 Acesse o dashboard:
   https://[SEU-BUCKET].s3-website-us-west-2.amazonaws.com/professor/

───────────────────────────────────────────────────────
    `.trim();

    return await this.sendNotification(subject, message);
  }

  /**
   * Testar configuração SNS
   */
  async testConfiguration() {
    const testSubject = '✅ Teste - Smart Class Q&A';
    const testMessage = `
Este é um email de teste do sistema Smart Class Q&A.

Se você recebeu este email, significa que:
✅ O tópico SNS está configurado corretamente
✅ Seu email está inscrito no tópico
✅ As notificações estão funcionando

Sistema: Smart Class Q&A
Timestamp: ${new Date().toISOString()}
    `.trim();

    return await this.sendNotification(testSubject, testMessage);
  }
}

module.exports = SNSService;