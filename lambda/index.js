const MessageClassifier = require('./classifier');
const AIValidator = require('./ai-validator');
const DynamoDBService = require('./dynamodb');
const SNSService = require('./sns');
const { sanitizeText } = require('./utils');

const TABLE_NAME = process.env.TABLE_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const dbService = new DynamoDBService(TABLE_NAME);
const snsService = new SNSService(SNS_TOPIC_ARN);
const classifier = new MessageClassifier();
const aiValidator = new AIValidator();

const headers = { "Content-Type": "application/json" };

exports.handler = async (event) => {
    console.log("EVENTO COMPLETO:", JSON.stringify(event));
    let body = {};
    let statusCode = 200;

    try {
        // 1. Normalização de Rota e Método
        let path = event.rawPath || event.path || "/";
        
        // Normaliza método para UPPERCASE
        let method = event.httpMethod || "";
        if (event.requestContext && event.requestContext.http) {
            method = event.requestContext.http.method;
        }
        method = method.toUpperCase();

        // Remove barra final
        if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1);

        console.log(`ROTA IDENTIFICADA: [${method}] ${path}`);

        // 2. Parse do Body
        let requestBody = {};
        if (event.body) {
            let rawBody = event.body;
            if (event.isBase64Encoded) {
                rawBody = Buffer.from(event.body, 'base64').toString('utf-8');
            }
            try { requestBody = JSON.parse(rawBody); } catch (e) { console.error("JSON Parse Error", e); }
        }

        // 3. Roteamento
        
        // Tratamento explícito de OPTIONS (CORS)
        if (method === 'OPTIONS') {
            statusCode = 200;
            body = { message: "CORS OK" };
        }
        
        // POST /mensagem
        else if (path === '/mensagem' && method === 'POST') {
            const { message, email, type } = requestBody;
            
            // Classificação inicial por regras (rápida)
            const classificationResult = classifier.classify(message || "");
            
            // Validação extra com IA (Comprehend)
            let aiValidation;
            try {
                console.log("Iniciando validação extra com IA...");
                aiValidation = await aiValidator.validate(message || "", classificationResult.classification);
                console.log("Resultado IA:", JSON.stringify(aiValidation));
            } catch (aiError) {
                console.error("ERRO NA CHAMADA DA IA:", aiError);
                // Fallback: Se a IA falhar totalmente, usamos o resultado do classificador local
                aiValidation = {
                    classification: classificationResult.classification,
                    confidence: classificationResult.confidence / 100,
                    reason: "Erro técnico na IA (Fallback Local)"
                };
            }

            const messageId = Date.now().toString();
            const timestamp = Date.now();
            
            const item = {
                messageId, timestamp,
                message: sanitizeText(message),
                email: email || "anonimo",
                type: type || 'text',
                status: 'PENDING',
                classification: aiValidation.classification, // Usamos a classificação da IA
                confidence: aiValidation.confidence * 100,     // Normalizamos para 0-100
                aiReason: aiValidation.reason,
                ruleClassification: classificationResult.classification // Guardamos a original para auditoria
            };

            // ALTERAÇÃO: Só salvamos e notificamos se for DÚVIDA e tiver contexto
            if (item.classification === 'DUVIDA') {
                console.log("Classificado como DUVIDA. Salvando no banco...");
                await dbService.saveMessage(item);
                await snsService.notifyNewQuestion({
                    alunoNome: email, mensagem: message,
                    confidence: item.confidence,
                    classification: item.classification
                });
                body = { 
                    status: "SUCCESS",
                    message: "Dúvida enviada ao professor!", 
                    id: messageId, 
                    classification: item.classification 
                };
            } else {
                console.log("Classificado como INTERACAO ou VAGA. Descartando mensagem.");
                
                // Se o classificador local marcar como 'isVague', damos uma resposta especial
                if (classificationResult.isVague || (message && message.length < 15)) {
                    body = { 
                        status: "REJECTED",
                        message: "Sua dúvida parece muito genérica. Por favor, adicione mais detalhes técnicos (ex: mencione qual serviço AWS ou o erro que está ocorrendo) para que o professor possa te ajudar melhor.", 
                        classification: "VAGA" 
                    };
                } else {
                    body = { 
                        status: "IGNORED",
                        message: "Mensagem recebida (interação social).", 
                        classification: item.classification 
                    };
                }
            }
        }
        
        // GET /duvidas
        else if (path === '/duvidas' && method === 'GET') {
            try {
                const items = await dbService.getAllQuestions();
                body = Array.isArray(items) ? items.sort((a, b) => b.timestamp - a.timestamp) : [];
            } catch (dbError) {
                console.error("Erro ao buscar dúvidas:", dbError);
                body = []; // Retorna lista vazia em caso de erro no banco
            }
        }
        
        // PUT /status
        else if (path === '/status' && method === 'PUT') {
            const { messageId, timestamp, status } = requestBody;
            await dbService.updateMessageStatus(messageId, timestamp, status);
            body = { message: "Atualizado" };
        }
        
        // Rota não encontrada
        else {
            console.warn(`Rota não encontrada: [${method}] ${path}`);
            statusCode = 404;
            // Retorna detalhes para debug no frontend
            body = { 
                error: `Rota desconhecida: ${path}`,
                debug_method: method,
                debug_path: path
            };
        }

    } catch (error) {
        console.error("ERRO FATAL:", error);
        statusCode = 500;
        body = { error: error.message };
    }

    return { statusCode, headers, body: JSON.stringify(body) };
};
