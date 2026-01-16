#!/bin/bash

# ==========================================
# SMART CLASS Q&A - DEPLOY SCRIPT V4.0 (IAM Bypass Edition)
# ==========================================
# Estratégia: Function URL com AWS_IAM + SigV4 no Frontend
# Motivo: Vocareum bloqueia AuthType: NONE e criação de API Gateway.
# ==========================================

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configurações
REGION="us-west-2"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_NAME="smartclass-qa"
BUCKET_NAME="${PROJECT_NAME}-${ACCOUNT_ID}-${REGION}"
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/LabRole"
TABLE_NAME="SmartClassMessages"
TOPIC_NAME="${PROJECT_NAME}-notifications"
FUNCTION_NAME="${PROJECT_NAME}-handler"

echo -e "${BLUE}[INFO] ==========================================${NC}"
echo -e "${BLUE}[INFO]    DEPLOY IAM BYPASS - SMART CLASS Q&A    ${NC}"
echo -e "${BLUE}[INFO] ==========================================${NC}"

# Função Robust de Zip
function create_zip_robust() {
    local source_dir="$1"
    local output_zip="$2"
    local output_no_ext="${output_zip%.zip}"

    if command -v 7z >/dev/null 2>&1; then
        echo -e "${BLUE}[INFO] Usando 7-Zip...${NC}"
        7z a -tzip "$output_zip" "$source_dir"/* >/dev/null
        return $?
    fi
    if command -v zip >/dev/null 2>&1; then
        echo -e "${BLUE}[INFO] Usando Zip nativo...${NC}"
        zip -r -q "$output_zip" "$source_dir"
        return $?
    fi
    if command -v python >/dev/null 2>&1; then
        echo -e "${BLUE}[INFO] Usando Python...${NC}"
        python -c "import shutil; shutil.make_archive('$output_no_ext', 'zip', '$source_dir')"
        return $?
    fi
    if command -v powershell.exe >/dev/null 2>&1; then
        echo -e "${BLUE}[INFO] Usando PowerShell...${NC}"
        powershell.exe -NoProfile -Command "Compress-Archive -Path '$source_dir/*' -DestinationPath '$output_zip' -Force"
        return $?
    fi
    echo -e "${RED}[ERROR] Nenhuma ferramenta de zip encontrada.${NC}"
    return 1
}

# 1. VERIFICAR RECURSOS BÁSICOS
echo -e "${BLUE}[INFO] Verificando recursos base...${NC}"

# S3
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb s3://$BUCKET_NAME --region $REGION
    aws s3 website s3://$BUCKET_NAME/ --index-document index.html --error-document index.html
    aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
fi

# DynamoDB
if ! aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION >/dev/null 2>&1; then
    aws dynamodb create-table --table-name $TABLE_NAME \
        --attribute-definitions AttributeName=messageId,AttributeType=S AttributeName=timestamp,AttributeType=N AttributeName=status,AttributeType=S \
        --key-schema AttributeName=messageId,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --global-secondary-indexes '[{"IndexName":"status-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"timestamp","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"},"ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}}]' \
        --region $REGION
    aws dynamodb wait table-exists --table-name $TABLE_NAME --region $REGION
fi

# SNS
TOPIC_ARN=$(aws sns create-topic --name $TOPIC_NAME --region $REGION --output text --query TopicArn)

# 2. PREPARAR LAMBDA
echo ""
echo -e "${BLUE}[INFO] Empacotando Lambda...${NC}"
cd lambda
npm install --production --silent
rm -f ../function.zip
cd ..
create_zip_robust "./lambda" "./function.zip"

if [ ! -f "function.zip" ]; then
    echo -e "${RED}[ERROR] Falha ao criar function.zip${NC}"
    exit 1
fi

# 3. DEPLOY LAMBDA
echo ""
echo -e "${BLUE}[INFO] Deploy Lambda...${NC}"
if ! aws lambda get-function --function-name $FUNCTION_NAME --region $REGION >/dev/null 2>&1; then
    aws lambda create-function --function-name $FUNCTION_NAME --runtime nodejs20.x --role $LAMBDA_ROLE_ARN \
        --handler index.handler --zip-file fileb://function.zip --timeout 30 --memory-size 256 \
        --environment "Variables={TABLE_NAME=$TABLE_NAME,SNS_TOPIC_ARN=$TOPIC_ARN,REGION=$REGION}" --region $REGION >/dev/null
else
    aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://function.zip --region $REGION >/dev/null
    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION
    aws lambda update-function-configuration --function-name $FUNCTION_NAME --environment "Variables={TABLE_NAME=$TABLE_NAME,SNS_TOPIC_ARN=$TOPIC_ARN,REGION=$REGION}" --region $REGION >/dev/null
fi
rm -f function.zip

# 4. CONFIGURAR FUNCTION URL (AWS_IAM)
echo ""
echo -e "${BLUE}[INFO] Configurando Function URL (AWS_IAM)...${NC}"

# Tenta atualizar para IAM
aws lambda update-function-url-config --function-name $FUNCTION_NAME \
    --auth-type AWS_IAM \
    --cors '{"AllowOrigins": ["*"], "AllowMethods": ["*"], "AllowHeaders": ["content-type", "x-amz-date", "x-amz-security-token", "authorization"], "MaxAge": 86400}' \
    --region $REGION >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${BLUE}[INFO] Criando nova URL com IAM...${NC}"
    aws lambda create-function-url-config --function-name $FUNCTION_NAME --auth-type AWS_IAM \
        --cors '{"AllowOrigins": ["*"], "AllowMethods": ["*"], "AllowHeaders": ["content-type", "x-amz-date", "x-amz-security-token", "authorization"], "MaxAge": 86400}' \
        --region $REGION
fi

API_URL=$(aws lambda get-function-url-config --function-name $FUNCTION_NAME --region $REGION --output text --query FunctionUrl)
API_URL=${API_URL%/}

echo -e "${GREEN}[SUCCESS] API URL (IAM Protected): $API_URL${NC}"

# 5. OBTER CREDENCIAIS (Local ou .env)
echo ""
echo -e "${BLUE}[INFO] Capturando credenciais...${NC}"

# Tenta carregar do arquivo .env se ele existir
if [ -f .env ]; then
    echo -e "${BLUE}[INFO] Carregando variáveis do arquivo .env...${NC}"
    export $(grep -v '^#' .env | xargs)
fi

# Captura variáveis (priorizando ambiente do shell)
ACCESS_KEY=${AWS_ACCESS_KEY_ID}
SECRET_KEY=${AWS_SECRET_ACCESS_KEY}
SESSION_TOKEN=${AWS_SESSION_TOKEN}
FINAL_REGION=${AWS_REGION:-$REGION}

if [ -z "$ACCESS_KEY" ] || [ -z "$SECRET_KEY" ]; then
    echo -e "${RED}[ERROR] Credenciais não encontradas no shell ou no arquivo .env.${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Credenciais capturadas.${NC}"

# 6. CONFIGURAR FRONTEND
echo ""
echo -e "${BLUE}[INFO] Gerando config.js temporário...${NC}"

cat > frontend/shared/config.js <<EOF
window.API_CONFIG = {
    baseURL: "${API_URL}",
    region: "${FINAL_REGION}",
    credentials: {
        accessKeyId: "${ACCESS_KEY}",
        secretAccessKey: "${SECRET_KEY}",
        sessionToken: "${SESSION_TOKEN}"
    },
    endpoints: {
        mensagem: "/mensagem",
        duvidas: "/duvidas",
        status: "/status",
        feedback: "/feedback",
        relatorio: "/relatorio"
    }
};

window.isAPIConfigured = function() {
    return window.API_CONFIG.baseURL && window.API_CONFIG.baseURL.indexOf('lambda-url') !== -1;
};

window.getApiUrl = function(endpointName) {
    return window.API_CONFIG.baseURL + window.API_CONFIG.endpoints[endpointName];
};
EOF

echo -e "${BLUE}[INFO] Sincronizando Frontend...${NC}"
aws s3 sync ./frontend s3://$BUCKET_NAME --delete --region $REGION >/dev/null

echo -e "${GREEN}[SUCCESS] Deploy V4 (IAM Bypass) finalizado!${NC}"
echo "URLs:"
echo "  Aluno:     http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com/aluno/"
echo "  Professor: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com/professor/"