#!/bin/bash

################################################################################
# Smart Class Q&A - Script de Limpeza Automática
# Remove TODOS os recursos criados no AWS Sandbox
# Tempo estimado: 2-3 minutos
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
LAMBDA_FUNCTION_NAME="${PROJECT_NAME}-handler"
API_NAME="${PROJECT_NAME}-api"
TABLE_NAME="SmartClassMessages"
SNS_TOPIC_NAME="${PROJECT_NAME}-notifications"

# Bucket S3 único
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -z "$ACCOUNT_ID" ]; then
    log_error "Não foi possível obter Account ID. Verifique credenciais AWS."
    exit 1
fi

BUCKET_NAME="${PROJECT_NAME}-${ACCOUNT_ID}-${REGION}"

log_info "=========================================="
log_info "Smart Class Q&A - Limpeza de Recursos"
log_info "=========================================="
log_info "Região: ${REGION}"
log_info "Conta AWS: ${ACCOUNT_ID}"
log_info "=========================================="
echo ""

################################################################################
# CONFIRMAÇÃO
################################################################################

log_warning "⚠️  ATENÇÃO: Esta operação irá DELETAR todos os recursos do projeto!"
log_warning "Recursos que serão removidos:"
echo "  • Função Lambda: ${LAMBDA_FUNCTION_NAME}"
echo "  • API Gateway: ${API_NAME}"
echo "  • Tabela DynamoDB: ${TABLE_NAME}"
echo "  • Tópico SNS: ${SNS_TOPIC_NAME}"
echo "  • Bucket S3: ${BUCKET_NAME}"
echo "  • Logs CloudWatch"
echo ""

read -p "Tem certeza que deseja continuar? (sim/não): " confirmation

if [ "$confirmation" != "sim" ]; then
    log_info "Operação cancelada pelo usuário."
    exit 0
fi

echo ""
log_info "Iniciando limpeza..."
echo ""

# Contador de recursos removidos
REMOVED_COUNT=0
FAILED_COUNT=0

################################################################################
# ETAPA 1: Deletar Função Lambda
################################################################################

log_info "ETAPA 1/6: Removendo função Lambda..."

if aws lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION} &>/dev/null; then
    aws lambda delete-function \
        --function-name ${LAMBDA_FUNCTION_NAME} \
        --region ${REGION}
    
    log_success "Função Lambda removida: ${LAMBDA_FUNCTION_NAME}"
    ((REMOVED_COUNT++))
else
    log_warning "Função Lambda não encontrada (já foi removida ou não existe)"
fi

echo ""

################################################################################
# ETAPA 2: Deletar API Gateway
################################################################################

log_info "ETAPA 2/6: Removendo API Gateway..."

# Buscar API ID
API_ID=$(aws apigateway get-rest-apis \
    --region ${REGION} \
    --query "items[?name=='${API_NAME}'].id" \
    --output text 2>/dev/null || echo "")

if [ ! -z "$API_ID" ]; then
    aws apigateway delete-rest-api \
        --rest-api-id ${API_ID} \
        --region ${REGION}
    
    log_success "API Gateway removida: ${API_NAME} (${API_ID})"
    ((REMOVED_COUNT++))
else
    log_warning "API Gateway não encontrada (já foi removida ou não existe)"
fi

echo ""

################################################################################
# ETAPA 3: Deletar Tópico SNS
################################################################################

log_info "ETAPA 3/6: Removendo tópico SNS..."

# Buscar ARN do tópico
SNS_TOPIC_ARN=$(aws sns list-topics \
    --region ${REGION} \
    --query "Topics[?contains(TopicArn, '${SNS_TOPIC_NAME}')].TopicArn" \
    --output text 2>/dev/null || echo "")

if [ ! -z "$SNS_TOPIC_ARN" ]; then
    # Primeiro, remover todas as subscrições
    SUBSCRIPTIONS=$(aws sns list-subscriptions-by-topic \
        --topic-arn ${SNS_TOPIC_ARN} \
        --region ${REGION} \
        --query 'Subscriptions[].SubscriptionArn' \
        --output text 2>/dev/null || echo "")
    
    if [ ! -z "$SUBSCRIPTIONS" ]; then
        for sub_arn in $SUBSCRIPTIONS; do
            if [ "$sub_arn" != "PendingConfirmation" ]; then
                aws sns unsubscribe \
                    --subscription-arn ${sub_arn} \
                    --region ${REGION} 2>/dev/null || true
                log_info "  Subscrição removida: ${sub_arn}"
            fi
        done
    fi
    
    # Remover tópico
    aws sns delete-topic \
        --topic-arn ${SNS_TOPIC_ARN} \
        --region ${REGION}
    
    log_success "Tópico SNS removido: ${SNS_TOPIC_NAME}"
    ((REMOVED_COUNT++))
else
    log_warning "Tópico SNS não encontrado (já foi removido ou não existe)"
fi

echo ""

################################################################################
# ETAPA 4: Deletar Tabela DynamoDB
################################################################################

log_info "ETAPA 4/6: Removendo tabela DynamoDB..."

if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} &>/dev/null; then
    aws dynamodb delete-table \
        --table-name ${TABLE_NAME} \
        --region ${REGION}
    
    log_info "Aguardando remoção da tabela..."
    
    # Aguardar até tabela ser deletada (timeout 2 minutos)
    timeout=120
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if ! aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} &>/dev/null; then
            break
        fi
        sleep 5
        ((elapsed+=5))
        echo -n "."
    done
    echo ""
    
    log_success "Tabela DynamoDB removida: ${TABLE_NAME}"
    ((REMOVED_COUNT++))
else
    log_warning "Tabela DynamoDB não encontrada (já foi removida ou não existe)"
fi

echo ""

################################################################################
# ETAPA 5: Deletar Bucket S3
################################################################################

log_info "ETAPA 5/6: Removendo bucket S3..."

if aws s3 ls "s3://${BUCKET_NAME}" --region ${REGION} &>/dev/null; then
    # Contar objetos
    OBJECT_COUNT=$(aws s3 ls s3://${BUCKET_NAME} --recursive --region ${REGION} | wc -l)
    
    if [ $OBJECT_COUNT -gt 0 ]; then
        log_info "Removendo ${OBJECT_COUNT} objeto(s) do bucket..."
        aws s3 rm s3://${BUCKET_NAME} --recursive --region ${REGION}
        log_success "Objetos removidos do bucket"
    fi
    
    # Remover bucket
    aws s3 rb s3://${BUCKET_NAME} --region ${REGION}
    
    log_success "Bucket S3 removido: ${BUCKET_NAME}"
    ((REMOVED_COUNT++))
else
    log_warning "Bucket S3 não encontrado (já foi removido ou não existe)"
fi

echo ""

################################################################################
# ETAPA 6: Limpar Logs CloudWatch
################################################################################

log_info "ETAPA 6/6: Limpando logs CloudWatch..."

LOG_GROUP_NAME="/aws/lambda/${LAMBDA_FUNCTION_NAME}"

if aws logs describe-log-groups \
    --log-group-name-prefix ${LOG_GROUP_NAME} \
    --region ${REGION} 2>/dev/null | grep -q ${LOG_GROUP_NAME}; then
    
    aws logs delete-log-group \
        --log-group-name ${LOG_GROUP_NAME} \
        --region ${REGION}
    
    log_success "Log group removido: ${LOG_GROUP_NAME}"
    ((REMOVED_COUNT++))
else
    log_warning "Log group não encontrado (já foi removido ou não existe)"
fi

echo ""

################################################################################
# ETAPA EXTRA: Remover Permissões Lambda (se existirem)
################################################################################

log_info "EXTRA: Verificando permissões Lambda residuais..."

# Tentar remover statement de permissão (pode não existir)
aws lambda remove-permission \
    --function-name ${LAMBDA_FUNCTION_NAME} \
    --statement-id apigateway-invoke \
    --region ${REGION} 2>/dev/null || true

log_info "Permissões verificadas"
echo ""

################################################################################
# ETAPA EXTRA 2: Remover Arquivo ZIP da Lambda (local)
################################################################################

log_info "EXTRA: Limpando arquivos temporários locais..."

if [ -f "/tmp/lambda-function.zip" ]; then
    rm /tmp/lambda-function.zip
    log_success "Arquivo ZIP removido: /tmp/lambda-function.zip"
fi

if [ -f "/tmp/bucket-policy.json" ]; then
    rm /tmp/bucket-policy.json
    log_success "Arquivo removido: /tmp/bucket-policy.json"
fi

echo ""

################################################################################
# RESUMO FINAL
################################################################################

log_success "=========================================="
log_success "LIMPEZA CONCLUÍDA!"
log_success "=========================================="
echo ""
echo -e "${GREEN}Recursos removidos: ${REMOVED_COUNT}${NC}"

if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}Recursos não encontrados/já removidos: ${FAILED_COUNT}${NC}"
fi

echo ""
log_info "Recursos que foram removidos:"
echo "  ✓ Função Lambda (${LAMBDA_FUNCTION_NAME})"
echo "  ✓ API Gateway (${API_NAME})"
echo "  ✓ Tópico SNS (${SNS_TOPIC_NAME})"
echo "  ✓ Tabela DynamoDB (${TABLE_NAME})"
echo "  ✓ Bucket S3 (${BUCKET_NAME})"
echo "  ✓ Logs CloudWatch"
echo ""

log_info "Verificação final..."

# Verificar se algo ainda existe
REMAINING_RESOURCES=""

# Verificar Lambda
if aws lambda get-function --function-name ${LAMBDA_FUNCTION_NAME} --region ${REGION} &>/dev/null; then
    REMAINING_RESOURCES="${REMAINING_RESOURCES}\n  ⚠ Lambda: ${LAMBDA_FUNCTION_NAME}"
fi

# Verificar DynamoDB
if aws dynamodb describe-table --table-name ${TABLE_NAME} --region ${REGION} &>/dev/null; then
    REMAINING_RESOURCES="${REMAINING_RESOURCES}\n  ⚠ DynamoDB: ${TABLE_NAME}"
fi

# Verificar S3
if aws s3 ls "s3://${BUCKET_NAME}" --region ${REGION} &>/dev/null; then
    REMAINING_RESOURCES="${REMAINING_RESOURCES}\n  ⚠ S3: ${BUCKET_NAME}"
fi

if [ ! -z "$REMAINING_RESOURCES" ]; then
    log_warning "=========================================="
    log_warning "Alguns recursos ainda existem:"
    echo -e "$REMAINING_RESOURCES"
    log_warning "=========================================="
    log_warning "Tente executar o script novamente ou remova manualmente"
else
    log_success "=========================================="
    log_success "✓ Todos os recursos foram removidos!"
    log_success "=========================================="
fi

echo ""
log_info "Limpeza concluída em $(date)"
log_info "Você pode fechar este terminal ou executar novamente se necessário"
echo ""

# Sugestões finais
log_info "=========================================="
log_info "Próximos Passos Sugeridos:"
log_info "=========================================="
echo "1. Verifique o console AWS para confirmar remoção"
echo "2. Salve evidências do projeto (screenshots, logs)"
echo "3. Faça backup do código no GitHub"
echo "4. Se necessário, execute deploy.sh novamente para recriar"
echo ""

log_success "Obrigado por usar Smart Class Q&A! 🎓"