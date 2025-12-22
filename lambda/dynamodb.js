const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

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
