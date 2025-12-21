#!/bin/bash

################################################################################
# Smart Class Q&A - Script de Deploy Automático
# Região: us-west-2
# Tempo estimado: 8-12 minutos
# Compatível com: AWS Sandbox (Vocareum Labs)
################################################################################

set -e  # Para em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções auxiliares
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

################################################################################
# CONFIGURAÇÕES DO PROJETO
################################################################################

REGION="us-west-2"
PROJECT_NAME="smartclass-qa"
STACK_NAME="${PROJECT_NAME}-stack"
LAMBDA_FUNCTION_NAME="${PROJECT_NAME}-handler"
API_NAME="${PROJECT_NAME}-api"
TABLE_NAME="SmartClassMessages"
SNS_TOPIC_NAME="${PROJECT_NAME}-notifications"

# Bucket S3 único (baseado no account ID)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="${PROJECT_NAME}-${ACCOUNT_ID}-${REGION}"

# Lambda Role (LabRole do Sandbox)
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/LabRole"

# Email para notificações
PROFESSOR_EMAIL="j.anderson.mect@gmail.com"

log_info "=========================================="
log_info "Smart Class Q&A - Deploy Automático"
log_info "=========================================="
log_info "Região: ${REGION}"
log_info "Bucket S3: ${BUCKET_NAME}"
log_info "Conta AWS: ${ACCOUNT_ID}"
log_info "=========================================="
echo ""

# Validação de email
read -p "Email do professor para notificações [$PROFESSOR_EMAIL]: " input_email
if [ ! -z "$input_email" ]; then
    PROFESSOR_EMAIL=$input_email
fi

log_info "Email configurado: ${PROFESSOR_EMAIL}"
echo ""

read -p "Pressione ENTER para iniciar o deploy..."
echo ""

################################################################################
# ETAPA 1: Criar Bucket S3 para Frontend
################################################################################

log_info "ETAPA 1/7: Criando bucket S3..."

if aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb s3://${BUCKET_NAME} --region ${REGION}
    log_success "Bucket criado: ${BUCKET_NAME}"
else
    log_warning "Bucket já existe, continuando..."
fi

# Configurar website estático
aws s3 website s3://${BUCKET_NAME} \
    --index-document index.html \
    --error-document error.html

# Política pública para o bucket
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket ${BUCKET_NAME} \
    --policy file:///tmp/bucket-policy.json

log_success "Bucket S3 configurado com website estático"
echo ""

################################################################################
# ETAPA 2: Criar Tabela DynamoDB
################################################################################

log_info "ETAPA 2/7: Criando tabela DynamoDB..."

if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} 2>&1 | grep -q 'ResourceNotFoundException'; then
    aws dynamodb create-table \
        --table-name ${TABLE_NAME} \
        --attribute-definitions \
            AttributeName=messageId,AttributeType=S \
            AttributeName=timestamp,AttributeType=N \
            AttributeName=status,AttributeType=S \
        --key-schema \
            AttributeName=messageId,KeyType=HASH \
            AttributeName=timestamp,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=status-index,KeySchema=[{AttributeName=status,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
        --provisioned-throughput \
            ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region ${REGION}
    
    log_info "Aguardando tabela ficar ativa..."
    aws dynamodb wait table-exists --table-name ${TABLE_NAME} --region ${REGION}
    log_success "Tabela DynamoDB criada: ${TABLE_NAME}"
else
    log_warning "Tabela já existe, continuando..."
fi

echo ""

################################################################################
# ETAPA 3: Criar Tópico SNS para Notificações
################################################################################

log_info "ETAPA 3/7: Criando tópico SNS..."

SNS_TOPIC_ARN=$(aws sns create-topic \
    --name ${SNS_TOPIC_NAME} \
    --region ${REGION} \
    --query 'TopicArn' \
    --output text)

log_success "Tópico SNS criado: ${SNS_TOPIC_ARN}"

# Subscrever email do professor
aws sns subscribe \
    --topic-arn ${SNS_TOPIC_ARN} \
    --protocol email \
    --notification-endpoint ${PROFESSOR_EMAIL} \
    --region ${REGION}

log_warning "IMPORTANTE: Verifique o email ${PROFESSOR_EMAIL} e confirme a inscrição!"
echo ""

################################################################################
# ETAPA 4: Preparar e Fazer Deploy da Lambda
################################################################################

log_info "ETAPA 4/7: Preparando função Lambda..."

cd lambda

# Instalar dependências
log_info "Instalando dependências Node.js..."
npm install --production

# Criar pacote ZIP
log_info "Criando pacote de deployment..."
zip -r /tmp/lambda-function.zip . -x "*.git*" "node_modules/.bin/*"

cd ..

# Criar função Lambda
log_info "Fazendo deploy da função Lambda..."

if aws lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION} 2>&1 | grep -q 'ResourceNotFoundException'; then
    aws lambda create-function \
        --function-name ${LAMBDA_FUNCTION_NAME} \
        --runtime nodejs18.x \
        --role ${LAMBDA_ROLE_ARN} \
        --handler index.handler \
        --zip-file fileb:///tmp/lambda-function.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{
            TABLE_NAME=${TABLE_NAME},
            SNS_TOPIC_ARN=${SNS_TOPIC_ARN},
            REGION=${REGION}
        }" \
        --region ${REGION}
    
    log_success "Função Lambda criada: ${LAMBDA_FUNCTION_NAME}"
else
    log_info "Atualizando função Lambda existente..."
    aws lambda update-function-code \
        --function-name ${LAMBDA_FUNCTION_NAME} \
        --zip-file fileb:///tmp/lambda-function.zip \
        --region ${REGION}
    
    aws lambda update-function-configuration \
        --function-name ${LAMBDA_FUNCTION_NAME} \
        --environment Variables="{
            TABLE_NAME=${TABLE_NAME},
            SNS_TOPIC_ARN=${SNS_TOPIC_ARN},
            REGION=${REGION}
        }" \
        --region ${REGION}
    
    log_success "Função Lambda atualizada"
fi

echo ""

################################################################################
# ETAPA 5: Criar API Gateway
################################################################################

log_info "ETAPA 5/7: Criando API Gateway..."

# Criar REST API
API_ID=$(aws apigateway create-rest-api \
    --name ${API_NAME} \
    --description "API para Smart Class Q&A" \
    --region ${REGION} \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-rest-apis --region ${REGION} --query "items[?name=='${API_NAME}'].id" --output text)

log_info "API ID: ${API_ID}"

# Obter root resource
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id ${API_ID} \
    --region ${REGION} \
    --query 'items[?path==`/`].id' \
    --output text)

# Criar recursos e métodos
log_info "Configurando endpoints..."

# Endpoint: POST /mensagem
create_endpoint() {
    local PATH_PART=$1
    local HTTP_METHOD=$2
    
    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id ${API_ID} \
        --parent-id ${ROOT_RESOURCE_ID} \
        --path-part ${PATH_PART} \
        --region ${REGION} \
        --query 'id' \
        --output text 2>/dev/null || \
        aws apigateway get-resources \
            --rest-api-id ${API_ID} \
            --region ${REGION} \
            --query "items[?pathPart=='${PATH_PART}'].id" \
            --output text)
    
    aws apigateway put-method \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${HTTP_METHOD} \
        --authorization-type NONE \
        --region ${REGION} 2>/dev/null || true
    
    aws apigateway put-integration \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method ${HTTP_METHOD} \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION_NAME}/invocations" \
        --region ${REGION} 2>/dev/null || true
    
    # Habilitar CORS
    aws apigateway put-method \
        --rest-api-id ${API_ID} \
        --resource-id ${RESOURCE_ID} \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region ${REGION} 2>/dev/null || true
}

create_endpoint "mensagem" "POST"
create_endpoint "duvidas" "GET"
create_endpoint "status" "PUT"

# Deploy da API
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --region ${REGION} \
    --query 'id' \
    --output text)

# Dar permissão para API Gateway invocar Lambda
aws lambda add-permission \
    --function-name ${LAMBDA_FUNCTION_NAME} \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region ${REGION} 2>/dev/null || true

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
log_success "API Gateway configurada: ${API_URL}"
echo ""

################################################################################
# ETAPA 6: Upload do Frontend
################################################################################

log_info "ETAPA 6/7: Fazendo upload do frontend..."

# Atualizar configuração da API no frontend
cat > frontend/shared/config.js <<EOF
const API_CONFIG = {
  baseURL: '${API_URL}',
  endpoints: {
    mensagem: '/mensagem',
    duvidas: '/duvidas',
    status: '/status'
  }
};
EOF

# Upload para S3
aws s3 sync frontend/ s3://${BUCKET_NAME}/ \
    --region ${REGION} \
    --exclude ".git/*" \
    --exclude ".DS_Store"

WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
log_success "Frontend publicado: ${WEBSITE_URL}"
echo ""

################################################################################
# ETAPA 7: Resumo e URLs
################################################################################

log_success "=========================================="
log_success "DEPLOY CONCLUÍDO COM SUCESSO!"
log_success "=========================================="
echo ""
echo -e "${GREEN}URLs do Projeto:${NC}"
echo -e "  Interface Aluno:    ${WEBSITE_URL}/aluno/"
echo -e "  Dashboard Professor: ${WEBSITE_URL}/professor/"
echo -e "  API Endpoint:       ${API_URL}"
echo ""
echo -e "${YELLOW}Próximos Passos:${NC}"
echo "  1. Confirme a inscrição no email: ${PROFESSOR_EMAIL}"
echo "  2. Acesse a interface do aluno e envie mensagens de teste"
echo "  3. Verifique o dashboard do professor"
echo "  4. Execute os testes: ./tests/run-tests.sh"
echo ""
echo -e "${BLUE}Recursos Criados:${NC}"
echo "  ✓ Bucket S3: ${BUCKET_NAME}"
echo "  ✓ Tabela DynamoDB: ${TABLE_NAME}"
echo "  ✓ Função Lambda: ${LAMBDA_FUNCTION_NAME}"
echo "  ✓ API Gateway: ${API_ID}"
echo "  ✓ Tópico SNS: ${SNS_TOPIC_ARN}"
echo ""
log_info "Para limpar recursos: ./infrastructure/cleanup.sh"
log_success "=========================================="