const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

class DynamoDBService {
  constructor(tableName) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
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
    const command = new ScanCommand({
      TableName: this.tableName
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
