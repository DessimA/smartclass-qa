/**
 * Smart Class Q&A - Serviço DynamoDB
 * Gerencia todas as operações de banco de dados
 */

class DynamoDBService {
  constructor(dynamoDBClient, tableName) {
    this.client = dynamoDBClient;
    this.tableName = tableName;
  }

  /**
   * Salvar nova mensagem
   */
  async saveMessage(messageData) {
    const params = {
      TableName: this.tableName,
      Item: messageData
    };

    try {
      await this.client.put(params).promise();
      return messageData;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw new Error(`Erro ao salvar no DynamoDB: ${error.message}`);
    }
  }

  /**
   * Buscar mensagem por ID
   */
  async getMessageById(messageId) {
    const params = {
      TableName: this.tableName,
      Key: {
        messageId
      }
    };

    try {
      const result = await this.client.get(params).promise();
      return result.Item || null;
    } catch (error) {
      console.error('Erro ao buscar mensagem:', error);
      throw new Error(`Erro ao buscar mensagem: ${error.message}`);
    }
  }

  /**
   * Buscar todas as dúvidas (classification = DUVIDA)
   */
  async getAllQuestions() {
    const params = {
      TableName: this.tableName,
      FilterExpression: 'classification = :classification',
      ExpressionAttributeValues: {
        ':classification': 'DUVIDA'
      }
    };

    try {
      const result = await this.client.scan(params).promise();
      return result.Items || [];
    } catch (error) {
      console.error('Erro ao buscar todas as dúvidas:', error);
      throw new Error(`Erro ao buscar dúvidas: ${error.message}`);
    }
  }

  /**
   * Buscar dúvidas por status usando GSI
   */
  async getQuestionsByStatus(status) {
    const params = {
      TableName: this.tableName,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      }
    };

    try {
      const result = await this.client.query(params).promise();
      
      // Filtrar apenas DÚVIDAs
      const questions = result.Items.filter(item => item.classification === 'DUVIDA');
      
      return questions || [];
    } catch (error) {
      console.error('Erro ao buscar dúvidas por status:', error);
      throw new Error(`Erro ao buscar dúvidas por status: ${error.message}`);
    }
  }

  /**
   * Atualizar status da mensagem
   */
  async updateMessageStatus(messageId, newStatus, respondidaEm = null) {
    // Primeiro, buscar o item para obter o timestamp (sort key)
    const scanParams = {
      TableName: this.tableName,
      FilterExpression: 'messageId = :messageId',
      ExpressionAttributeValues: {
        ':messageId': messageId
      }
    };

    try {
      const scanResult = await this.client.scan(scanParams).promise();
      
      if (!scanResult.Items || scanResult.Items.length === 0) {
        throw new Error(`Mensagem não encontrada: ${messageId}`);
      }

      const message = scanResult.Items[0];

      // Agora atualizar com a chave completa
      const updateParams = {
        TableName: this.tableName,
        Key: {
          messageId: message.messageId,
          timestamp: message.timestamp
        },
        UpdateExpression: 'SET #status = :status, respondidaEm = :respondidaEm, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': newStatus,
          ':respondidaEm': respondidaEm,
          ':updatedAt': new Date().toISOString()
        },
        ReturnValues: 'ALL_NEW'
      };

      const result = await this.client.update(updateParams).promise();
      return result.Attributes;
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw new Error(`Erro ao atualizar status: ${error.message}`);
    }
  }

  /**
   * Buscar estatísticas gerais
   */
  async getStatistics() {
    const params = {
      TableName: this.tableName
    };

    try {
      const result = await this.client.scan(params).promise();
      const items = result.Items || [];

      const stats = {
        totalMensagens: items.length,
        totalDuvidas: items.filter(i => i.classification === 'DUVIDA').length,
        totalInteracoes: items.filter(i => i.classification === 'INTERACAO').length,
        duvidasNaoRespondidas: items.filter(i => 
          i.classification === 'DUVIDA' && i.status === 'Não Respondida'
        ).length,
        duvidasRespondidas: items.filter(i => 
          i.classification === 'DUVIDA' && i.status === 'Respondida'
        ).length
      };

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Buscar mensagens recentes (últimas N)
   */
  async getRecentMessages(limit = 50) {
    const params = {
      TableName: this.tableName,
      Limit: limit
    };

    try {
      const result = await this.client.scan(params).promise();
      const items = result.Items || [];
      
      // Ordenar por timestamp decrescente
      return items.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Erro ao buscar mensagens recentes:', error);
      throw new Error(`Erro ao buscar mensagens recentes: ${error.message}`);
    }
  }

  /**
   * Deletar mensagem (para testes)
   */
  async deleteMessage(messageId, timestamp) {
    const params = {
      TableName: this.tableName,
      Key: {
        messageId,
        timestamp
      }
    };

    try {
      await this.client.delete(params).promise();
      return true;
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw new Error(`Erro ao deletar mensagem: ${error.message}`);
    }
  }
}

module.exports = DynamoDBService;