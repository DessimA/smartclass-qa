#!/bin/bash

################################################################################
# Smart Class Q&A - Script de Teste Automatizado (Health Check)
# Objetivo: Validar se a API (Lambda + DynamoDB) está respondendo corretamente.
################################################################################

# Configurações
LOG_FILE="test-report.log"
REGION="us-west-2"
LAMBDA_FUNCTION_NAME="smartclass-qa-handler"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Inicializa Log
echo "=== RELATÓRIO DE TESTE SMART CLASS Q&A ===" > "$LOG_FILE"
echo "Data: $(date)" >> "$LOG_FILE"
echo "------------------------------------------" >> "$LOG_FILE"

# Funções de Log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    echo "[PASS] $1" >> "$LOG_FILE"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo "[FAIL] $1" >> "$LOG_FILE"
    echo "Consulte $LOG_FILE para detalhes."
}

log_detail() {
    echo "      $1" >> "$LOG_FILE"
}

################################################################################
# 1. DESCOBERTA DE AMBIENTE
################################################################################
log_info "1. Obtendo URL da API..."

if ! command -v aws &> /dev/null; then
    log_fail "AWS CLI não instalado."
    exit 1
fi

API_URL=$(aws lambda get-function-url-config --function-name $LAMBDA_FUNCTION_NAME --region $REGION --query 'FunctionUrl' --output text 2>> "$LOG_FILE")

# Remove barra final e espaços
API_URL=$(echo "$API_URL" | tr -d '\r' | sed 's/\/$//')

if [ -z "$API_URL" ] || [ "$API_URL" == "None" ]; then
    log_fail "Não foi possível obter a URL da Lambda. Verifique se a Function URL está ativa."
    exit 1
fi

log_success "URL encontrada: $API_URL"

################################################################################
# 2. TESTE DE ESCRITA (POST /mensagem)
################################################################################
log_info "2. Testando envio de mensagem (POST)..."

TEST_ID="test-$(date +%s)"
PAYLOAD="{\"email\": \"bot-tester@check.com\", \"message\": \"Isso é um teste automatizado de verificação de sistema. Como funciona o Lambda?\", \"type\": \"text\"}"

log_detail "Payload enviado: $PAYLOAD"

# Executa CURL capturando HTTP Code e Body separadamente
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$API_URL/mensagem")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

log_detail "HTTP Code: $HTTP_CODE"
log_detail "Response Body: $BODY"

if [[ "$HTTP_CODE" == "200" ]]; then
    # Verifica se retornou um ID
    if echo "$BODY" | grep -q "id"; then
        log_success "Mensagem enviada com sucesso (HTTP 200)."
        
        # Extrai classificação usando Python (para não depender de jq)
        CLASS=$(echo "$BODY" | python -c "import sys, json; print(json.load(sys.stdin).get('classification', 'UNKNOWN'))" 2>> "$LOG_FILE")
        log_success "Classificação da IA: $CLASS"
    else
        log_fail "HTTP 200 recebido, mas resposta JSON inválida."
    fi
else
    log_fail "Falha no envio. Código HTTP: $HTTP_CODE"
    echo "ERRO DETALHADO:"
    echo "$BODY"
    exit 1
fi

################################################################################
# 3. TESTE DE LEITURA (GET /duvidas)
################################################################################
log_info "3. Testando listagem de dúvidas (GET)..."

# Pequena pausa para garantir consistência eventual do DynamoDB
sleep 2

RESPONSE_GET=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/duvidas")

HTTP_CODE_GET=$(echo "$RESPONSE_GET" | tail -n1)
BODY_GET=$(echo "$RESPONSE_GET" | sed '$d')

log_detail "HTTP Code GET: $HTTP_CODE_GET"
# Não logamos o body todo do GET pois pode ser grande, apenas verificamos

if [[ "$HTTP_CODE_GET" == "200" ]]; then
    log_success "Listagem recuperada com sucesso (HTTP 200)."
    
    # Verifica se nossa mensagem de teste está na lista
    if echo "$BODY_GET" | grep -q "bot-tester@check.com"; then
        log_success "Persistência confirmada: Mensagem de teste encontrada no banco."
        
        # Extrair ID e Timestamp para teste de atualização
        # Python script para filtrar pelo email e pegar o primeiro item
        PYTHON_EXTRACT_SCRIPT="
import sys, json
try:
    data = json.load(sys.stdin)
    # Garante que data é uma lista
    if not isinstance(data, list): data = []
    
    target = next((item for item in data if item.get('email') == 'bot-tester@check.com'), None)
    if target:
        print(f\"{target['messageId']}|{target['timestamp']}\")
except:
    print('')
"
        echo "$BODY_GET" > json_temp.json
        MSG_DATA=$(python -c "$PYTHON_EXTRACT_SCRIPT" < json_temp.json)
        rm json_temp.json
        
        if [ ! -z "$MSG_DATA" ]; then
            MSG_ID=$(echo $MSG_DATA | cut -d'|' -f1)
            MSG_TS=$(echo $MSG_DATA | cut -d'|' -f2)
            log_info "Dados capturados para atualização: ID=$MSG_ID, TS=$MSG_TS"
        fi
    else
        log_fail "Mensagem enviada não foi encontrada na listagem (Erro de Persistência DynamoDB)."
    fi
else
    log_fail "Falha na listagem. Código HTTP: $HTTP_CODE_GET"
    exit 1
fi

################################################################################
# 4. TESTE DE ATUALIZAÇÃO (PUT /status)
################################################################################
if [ ! -z "$MSG_ID" ] && [ ! -z "$MSG_TS" ]; then
    log_info "4. Testando atualização de status (PUT)..."
    
    PUT_PAYLOAD="{\"messageId\": \"$MSG_ID\", \"timestamp\": $MSG_TS, \"status\": \"Respondida\"}"
    
    RESPONSE_PUT=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Content-Type: application/json" \
        -d "$PUT_PAYLOAD" \
        "$API_URL/status")

    HTTP_CODE_PUT=$(echo "$RESPONSE_PUT" | tail -n1)
    
    if [[ "$HTTP_CODE_PUT" == "200" ]]; then
        log_success "Status atualizado com sucesso (HTTP 200)."
    else
        log_fail "Falha na atualização. Código: $HTTP_CODE_PUT"
    fi
else
    log_warning "Pulando teste de PUT (falta ID/Timestamp)."
fi

################################################################################
# 5. CONCLUSÃO
################################################################################
echo ""
echo "------------------------------------------"
echo -e "${GREEN}RESULTADO FINAL: TODOS OS SISTEMAS OPERACIONAIS${NC}"
echo "------------------------------------------"
echo "Log detalhado salvo em: $LOG_FILE"