const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

class DynamoDBService {
  constructor(tableName) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
    this.indexName = 'status-index'; // Nome do GSI
  }

  async saveMessage(messageData) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: messageData
    });
    await this.docClient.send(command);
    return messageData;
  }

  async getAllQuestions() {
    // Executa duas queries em paralelo para otimizar a busca
    const [pending, responded] = await Promise.all([
      this.getQuestionsByStatus('PENDING'),
      this.getQuestionsByStatus('Respondida')
      // Adicione outras chamadas aqui se mais status forem introduzidos
    ]);
    
    // Junta os resultados de ambas as queries
    return [...pending, ...responded];
  }
  
  async getQuestionsByStatus(status) {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: this.indexName,
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status }
    });
    const result = await this.docClient.send(command);
    return result.Items || [];
  }

  async saveFeedback(feedbackData) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { 
        messageId: feedbackData.messageId, 
        timestamp: feedbackData.timestamp 
      },
      UpdateExpression: 'SET feedback = :f, correctClassification = :c',
      ExpressionAttributeValues: {
        ':f': true,
        ':c': feedbackData.correctClassification
      }
    });
    return await this.docClient.send(command);
  }

  async getMessagesByDate(dateString) {
      // Scan para filtrar por data (em produção usar GSI)
      const command = new ScanCommand({
          TableName: this.tableName
      });
      
      const response = await this.docClient.send(command);
      const items = response.Items || [];
      
      if (!dateString) return items;
      
      // Ajuste de fuso horário simples (considerando UTC do timestamp)
      // O dateString vem como YYYY-MM-DD
      
      return items.filter(item => {
          // Converte timestamp (ms) para YYYY-MM-DD
          const date = new Date(item.timestamp);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const itemDateString = `${year}-${month}-${day}`;
          
          return itemDateString === dateString;
      });
  }

  async updateMessageStatus(messageId, timestamp, newStatus) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { messageId, timestamp },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': newStatus },
      ReturnValues: 'ALL_NEW'
    });
    return await this.docClient.send(command);
  }
}
module.exports = DynamoDBService;