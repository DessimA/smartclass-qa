const MessageClassifier = require('./classifier');
const DynamoDBService = require('./dynamodb');
const SNSService = require('./sns');
const { sanitizeText } = require('./utils');

const TABLE_NAME = process.env.TABLE_NAME;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const dbService = new DynamoDBService(TABLE_NAME);
const snsService = new SNSService(SNS_TOPIC_ARN);
const classifier = new MessageClassifier();

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
            const classificationResult = classifier.classify(message || "");
            
            const messageId = Date.now().toString();
            const timestamp = Date.now();
            
            const item = {
                messageId, timestamp,
                message: sanitizeText(message),
                email: email || "anonimo",
                type: type || 'text',
                status: 'PENDING',
                classification: classificationResult.classification,
                confidence: classificationResult.confidence,
                aiReason: classificationResult.reason
            };

            await dbService.saveMessage(item);
            await snsService.notifyNewQuestion({
                alunoNome: email, mensagem: message,
                confidence: classificationResult.confidence,
                classification: classificationResult.classification
            });

            body = { message: "Recebido", id: messageId, classification: classificationResult.classification };
        }
        
        // GET /duvidas
        else if (path === '/duvidas' && method === 'GET') {
            const items = await dbService.getAllQuestions();
            body = items.sort((a, b) => b.timestamp - a.timestamp);
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
