const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

class SNSService {
  constructor(topicArn) {
    this.client = new SNSClient({ region: process.env.AWS_REGION });
    this.topicArn = topicArn;
  }

  async notifyNewQuestion(data) {
    if (!this.topicArn || data.classification !== 'DUVIDA') return;

    const subject = '🔔 Nova Dúvida - Smart Class Q&A';
    const msgBody = `Aluno: ${data.alunoNome}\nConfiança IA: ${data.confidence}%\n\nMensagem:\n${data.mensagem}`;

    try {
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: subject,
        Message: msgBody
      });
      await this.client.send(command);
    } catch (error) {
      console.error('Erro SNS:', error);
    }
  }
}
module.exports = SNSService;
