/**
 * Smart Class Q&A - Lambda Handler Principal
 * Processa requisições da API Gateway e gerencia mensagens
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const MessageClassifier = require('./classifier');
const DynamoDBService = require('./dynamodb');
const SNSService = require('./sns');

// Configurar AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.REGION || 'us-west-2' });
const sns = new AWS.SNS({ region: process.env.REGION || 'us-west-2' });

// Inicializar serviços
const classifier = new MessageClassifier();
const dbService = new DynamoDBService(dynamodb, process.env.TABLE_NAME);
const snsService = new SNSService(sns, process.env.SNS_TOPIC_ARN);

/**
 * Handler principal - roteador de requisições
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const body = event.body ? JSON.parse(event.body) : null;

    // Roteamento de requisições
    if (httpMethod === 'POST' && path.includes('/mensagem')) {
      return await handlePostMessage(body);
    }
    
    if (httpMethod === 'GET' && path.includes('/duvidas')) {
      return await handleGetDuvidas(event.queryStringParameters);
    }
    
    if (httpMethod === 'PUT' && path.includes('/status')) {
      return await handleUpdateStatus(body);
    }
    
    // Rota não encontrada
    return createResponse(404, { error: 'Rota não encontrada' });
    
  } catch (error) {
    console.error('Error:', error);
    return createResponse(500, { 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
};

/**
 * POST /mensagem - Processar nova mensagem
 */
async function handlePostMessage(body) {
  try {
    // Validar entrada
    if (!body || !body.mensagem || !body.alunoNome) {
      return createResponse(400, { 
        error: 'Campos obrigatórios: mensagem, alunoNome' 
      });
    }

    const { mensagem, alunoNome } = body;

    // Classificar mensagem usando IA
    console.log('Classificando mensagem:', mensagem);
    const classificationResult = classifier.classify(mensagem);
    
    console.log('Resultado da classificação:', classificationResult);

    // Criar objeto da mensagem
    const messageData = {
      messageId: uuidv4(),
      timestamp: Date.now(),
      alunoNome,
      mensagem,
      classification: classificationResult.classification,
      score: classificationResult.score,
      confidence: classificationResult.confidence,
      reason: classificationResult.reason,
      sentiment: classificationResult.analysis.sentiment,
      status: classificationResult.classification === 'DUVIDA' ? 'Não Respondida' : 'N/A',
      respondidaEm: null,
      createdAt: new Date().toISOString()
    };

    // Salvar no DynamoDB
    await dbService.saveMessage(messageData);
    console.log('Mensagem salva no DynamoDB:', messageData.messageId);

    // Se for DÚVIDA, enviar notificação ao professor
    if (classificationResult.classification === 'DUVIDA') {
      try {
        await snsService.notifyNewQuestion({
          alunoNome,
          mensagem,
          confidence: classificationResult.confidence,
          timestamp: new Date().toISOString()
        });
        console.log('Notificação SNS enviada');
      } catch (snsError) {
        console.error('Erro ao enviar notificação SNS:', snsError);
        // Não falhar a requisição se SNS falhar
      }
    }

    // Retornar resposta
    return createResponse(200, {
      success: true,
      messageId: messageData.messageId,
      classification: classificationResult.classification,
      confidence: classificationResult.confidence,
      message: classificationResult.classification === 'DUVIDA' 
        ? 'Dúvida registrada! O professor será notificado.'
        : 'Mensagem registrada como interação.'
    });

  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    return createResponse(500, { 
      error: 'Erro ao processar mensagem',
      details: error.message 
    });
  }
}

/**
 * GET /duvidas - Listar dúvidas
 */
async function handleGetDuvidas(queryParams) {
  try {
    const status = queryParams?.status || 'all';
    
    console.log('Listando dúvidas. Status:', status);

    let messages;
    
    if (status === 'all') {
      messages = await dbService.getAllQuestions();
    } else {
      messages = await dbService.getQuestionsByStatus(status);
    }

    console.log(`Encontradas ${messages.length} dúvidas`);

    return createResponse(200, {
      success: true,
      count: messages.length,
      duvidas: messages.sort((a, b) => b.timestamp - a.timestamp) // Mais recentes primeiro
    });

  } catch (error) {
    console.error('Erro ao listar dúvidas:', error);
    return createResponse(500, { 
      error: 'Erro ao listar dúvidas',
      details: error.message 
    });
  }
}

/**
 * PUT /status - Atualizar status da dúvida
 */
async function handleUpdateStatus(body) {
  try {
    // Validar entrada
    if (!body || !body.messageId || !body.status) {
      return createResponse(400, { 
        error: 'Campos obrigatórios: messageId, status' 
      });
    }

    const { messageId, status } = body;

    // Validar status
    const validStatuses = ['Não Respondida', 'Respondida'];
    if (!validStatuses.includes(status)) {
      return createResponse(400, { 
        error: `Status inválido. Valores aceitos: ${validStatuses.join(', ')}` 
      });
    }

    console.log(`Atualizando status. MessageId: ${messageId}, Novo status: ${status}`);

    // Atualizar no DynamoDB
    const updatedMessage = await dbService.updateMessageStatus(
      messageId, 
      status,
      status === 'Respondida' ? new Date().toISOString() : null
    );

    return createResponse(200, {
      success: true,
      message: 'Status atualizado com sucesso',
      data: updatedMessage
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return createResponse(500, { 
      error: 'Erro ao atualizar status',
      details: error.message 
    });
  }
}

/**
 * Criar resposta HTTP padronizada com CORS
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(body)
  };
}