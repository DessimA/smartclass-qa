#!/bin/bash

################################################################################
# Smart Class Q&A - Deploy Otimizado (v3.0)
# Premissa: O código local (frontend/backend) já está correto.
# Função: Gerenciar infraestrutura AWS sem sobrescrever código fonte.
################################################################################

set -e
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# --- Configurações ---
REGION="us-west-2"
PROJECT_NAME="smartclass-qa"
LAMBDA_FUNCTION_NAME="${PROJECT_NAME}-handler"
TABLE_NAME="SmartClassMessages"
SNS_TOPIC_NAME="${PROJECT_NAME}-notifications"

# Identidade
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="${PROJECT_NAME}-${ACCOUNT_ID}-${REGION}"
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/LabRole"
PROFESSOR_EMAIL="j.anderson.mect@gmail.com"

log_info "=========================================="
log_info "   DEPLOY OTIMIZADO - SMART CLASS Q&A     "
log_info "=========================================="
log_info "Região: $REGION"
log_info "Bucket Alvo: $BUCKET_NAME"
echo ""

# Validação de Pré-requisitos
if [ ! -f "lambda/index.js" ] || [ ! -f "frontend/aluno/index.html" ]; then
    echo -e "${RED}[ERRO]${NC} Arquivos do projeto não encontrados."
    echo "Execute este script da raiz do projeto."
    exit 1
fi

################################################################################
# 1. Infraestrutura de Armazenamento (S3)
################################################################################
log_info "1. Verificando Bucket S3..."

if aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    log_info "Bucket não encontrado. Criando..."
    aws s3 mb s3://${BUCKET_NAME} --region ${REGION}
    
    # Configurações iniciais (só precisa rodar na criação)
    aws s3api put-public-access-block \
        --bucket ${BUCKET_NAME} \
        --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
        --region ${REGION}
    
    aws s3 website s3://${BUCKET_NAME} --index-document index.html --error-document error.html
    
    # Política
    cat > bucket-policy.json <<EOF
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
    aws s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy file://bucket-policy.json
    rm bucket-policy.json
    log_success "Bucket configurado."
else
    log_success "Bucket já existe e está configurado."
fi

################################################################################
# 2. Banco de Dados (DynamoDB)
################################################################################
log_info "2. Verificando Tabela DynamoDB..."

if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} 2>&1 | grep -q 'ResourceNotFoundException'; then
    log_info "Tabela não encontrada. Criando..."
    aws dynamodb create-table \
        --table-name ${TABLE_NAME} \
        --attribute-definitions AttributeName=messageId,AttributeType=S AttributeName=timestamp,AttributeType=N AttributeName=status,AttributeType=S \
        --key-schema AttributeName=messageId,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
        --global-secondary-indexes "IndexName=status-index,KeySchema=[{AttributeName=status,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}" \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region ${REGION}
    
    log_info "Aguardando criação da tabela..."
    aws dynamodb wait table-exists --table-name ${TABLE_NAME} --region ${REGION}
    log_success "Tabela criada."
else
    log_success "Tabela já existe."
fi

################################################################################
# 3. Notificações (SNS)
################################################################################
log_info "3. Verificando SNS..."

# Create topic é idempotente (retorna o ARN se já existir)
SNS_TOPIC_ARN=$(aws sns create-topic --name ${SNS_TOPIC_NAME} --region ${REGION} --query 'TopicArn' --output text)

# Verifica se já existe assinatura para evitar spam de emails de confirmação
SUBSCRIPTION_CHECK=$(aws sns list-subscriptions-by-topic --topic-arn ${SNS_TOPIC_ARN} --region ${REGION} --query "Subscriptions[?Endpoint=='${PROFESSOR_EMAIL}']" --output text)

if [ -z "$SUBSCRIPTION_CHECK" ]; then
    log_info "Inscrevendo email ${PROFESSOR_EMAIL}..."
    aws sns subscribe --topic-arn ${SNS_TOPIC_ARN} --protocol email --notification-endpoint ${PROFESSOR_EMAIL} --region ${REGION}
else
    log_success "Email já inscrito no SNS."
fi

################################################################################
# 4. Backend (Lambda)
################################################################################
log_info "4. Empacotando e Atualizando Lambda..."

cd lambda

log_info "Instalando dependências de produção da Lambda..."
# O --silent evita poluir o log, mas mostra erros se ocorrerem.
# O --production garante que apenas as dependências de produção sejam instaladas.
npm install --production --silent

log_info "Criando pacote de deploy..."
rm -f ../lambda-deploy.zip

# Usando Python para compactar (cross-platform, funciona no Windows/MinGW sem 'zip' instalado)
python -c "
import zipfile
import os

def zipdir(path, ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk(path):
        for file in files:
            # Ignora arquivos desnecessários/ocultos comuns
            if file == '.DS_Store' or file.endswith('.zip'):
                continue
            
            file_path = os.path.join(root, file)
            # O arcname deve ser relativo à raiz do pacote
            arcname = os.path.relpath(file_path, path)
            ziph.write(file_path, arcname)

with zipfile.ZipFile('../lambda-deploy.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    zipdir('.', zf)
"

cd ..

# Verifica se a função existe
if aws lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION} 2>&1 | grep -q 'ResourceNotFoundException'; then
    log_info "Criando nova função Lambda..."
    aws lambda create-function \
        --function-name ${LAMBDA_FUNCTION_NAME} \
        --runtime nodejs18.x \
        --role ${LAMBDA_ROLE_ARN} \
        --handler index.handler \
        --zip-file fileb://lambda-deploy.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment Variables="{TABLE_NAME=${TABLE_NAME},SNS_TOPIC_ARN=${SNS_TOPIC_ARN},REGION=${REGION}}" \
        --region ${REGION}
else
    log_info "Atualizando código da função existente..."
    aws lambda update-function-code --function-name ${LAMBDA_FUNCTION_NAME} --zip-file fileb://lambda-deploy.zip --region ${REGION} > /dev/null
    
    log_info "Aguardando confirmação de atualização..."
    aws lambda wait function-updated --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION}
    sleep 2

    # Atualiza variáveis de ambiente (caso tenham mudado)
    aws lambda update-function-configuration --function-name ${LAMBDA_FUNCTION_NAME} --environment Variables="{TABLE_NAME=${TABLE_NAME},SNS_TOPIC_ARN=${SNS_TOPIC_ARN},REGION=${REGION}}" --region ${REGION} > /dev/null
fi

rm lambda-deploy.zip

################################################################################
# 5. Configuração de Acesso (Function URL & CORS)
################################################################################
log_info "5. Verificando Function URL..."

# Configuração CORS (Sempre aplica para garantir)
cat > cors-config.json <<EOF
{
  "AllowOrigins": ["*"],
  "AllowMethods": ["*"],
  "AllowHeaders": ["Content-Type", "Authorization"],
  "ExposeHeaders": [],
  "MaxAge": 86400
}
EOF

if ! aws lambda get-function-url-config --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION} >/dev/null 2>&1; then
    log_info "Criando URL pública..."
    aws lambda create-function-url-config --function-name ${LAMBDA_FUNCTION_NAME} --auth-type NONE --cors file://cors-config.json --region ${REGION} > /dev/null
    aws lambda add-permission --function-name ${LAMBDA_FUNCTION_NAME} --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --statement-id function-url-public-$(date +%s) --region ${REGION} 2>/dev/null || true
else
    log_info "Atualizando configuração CORS..."
    aws lambda update-function-url-config --function-name ${LAMBDA_FUNCTION_NAME} --auth-type NONE --cors file://cors-config.json --region ${REGION} > /dev/null
fi
rm cors-config.json

API_URL=$(aws lambda get-function-url-config --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION} --query 'FunctionUrl' --output text)
API_URL=${API_URL%/}

################################################################################
# 6. Frontend (Configuração e Upload)
################################################################################
log_info "6. Atualizando Frontend..."

# Apenas o config.js é recriado, pois depende da URL da API que pode mudar
log_info "Atualizando config.js com URL: $API_URL"
cat > frontend/shared/config.js <<EOF
/**
 * Configuração da API - Gerada Automaticamente pelo Deploy
 */
const API_CONFIG = {
  baseURL: '${API_URL}',
  endpoints: {
    mensagem: '/mensagem',
    duvidas: '/duvidas',
    status: '/status'
  }
};

window.API_CONFIG = API_CONFIG;

window.isAPIConfigured = function() {
  return API_CONFIG && API_CONFIG.baseURL;
};

window.getApiUrl = function(endpoint) {
  return API_CONFIG.baseURL + API_CONFIG.endpoints[endpoint];
};
EOF

log_info "Sincronizando arquivos com S3..."
# Sync inteligente: só faz upload se o arquivo mudou (tamanho ou timestamp)
aws s3 sync frontend/ s3://${BUCKET_NAME}/ \
    --region ${REGION} \
    --exclude ".git/*" \
    --exclude ".DS_Store" \
    --quiet

WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"

log_success "=========================================="
log_success "       INFRAESTRUTURA SINCRONIZADA        "
log_success "=========================================="
echo -e "${GREEN}URLs:${NC}"
echo -e "  Aluno:     ${WEBSITE_URL}/aluno/"
echo -e "  Professor: ${WEBSITE_URL}/professor/"
echo ""