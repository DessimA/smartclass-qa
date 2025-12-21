# 🚀 Guia Completo de Deploy - Smart Class Q&A

> **Tempo estimado:** 15-20 minutos  
> **Nível:** Intermediário  
> **Ambiente:** AWS Sandbox (Vocareum Labs)

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Ambiente](#preparação-do-ambiente)
3. [Método 1: Deploy Automático (Recomendado)](#método-1-deploy-automático-recomendado)
4. [Método 2: Deploy Manual](#método-2-deploy-manual)
5. [Configuração Pós-Deploy](#configuração-pós-deploy)
6. [Testes e Validação](#testes-e-validação)
7. [Troubleshooting](#troubleshooting)
8. [Limpeza de Recursos](#limpeza-de-recursos)

---

## ✅ Pré-requisitos

### Ferramentas Necessárias

- ✅ **Conta AWS Sandbox** ativa no Vocareum
- ✅ **AWS CLI** instalado e configurado
- ✅ **Node.js** 18.x ou superior
- ✅ **Git** instalado
- ✅ **Terminal/Bash** (Linux/Mac) ou Git Bash (Windows)

### Verificar Instalações

```bash
# Verificar AWS CLI
aws --version
# Deve mostrar: aws-cli/2.x.x ou superior

# Verificar Node.js
node --version
# Deve mostrar: v18.x.x ou superior

# Verificar npm
npm --version
# Deve mostrar: 9.x.x ou superior

# Verificar Git
git --version
# Deve mostrar: git version 2.x.x ou superior
```

### Configurar AWS CLI

```bash
# As credenciais do Sandbox são temporárias (3 horas)
# Você receberá no Vocareum:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - AWS_SESSION_TOKEN

# Configurar (método 1 - mais rápido)
export AWS_ACCESS_KEY_ID="seu-access-key"
export AWS_SECRET_ACCESS_KEY="seu-secret-key"
export AWS_SESSION_TOKEN="seu-session-token"
export AWS_DEFAULT_REGION="us-west-2"

# Ou configurar (método 2 - usando CLI)
aws configure
# Digite as credenciais quando solicitado
# Região: us-west-2
```

### Validar Acesso AWS

```bash
# Testar conexão
aws sts get-caller-identity

# Deve retornar algo como:
# {
#     "UserId": "...",
#     "Account": "123456789012",
#     "Arn": "arn:aws:sts::123456789012:assumed-role/voclabs/user..."
# }
```

---

## 🛠️ Preparação do Ambiente

### 1. Clonar o Repositório

```bash
# Clonar do GitHub
git clone https://github.com/DessimA/smartclass-qa.git
cd smartclass-qa

# Verificar estrutura
ls -la
# Deve mostrar: lambda/, frontend/, infrastructure/, tests/, README.md
```

### 2. Instalar Dependências da Lambda

```bash
cd lambda
npm install
cd ..
```

### 3. Tornar Scripts Executáveis

```bash
chmod +x infrastructure/deploy.sh
chmod +x infrastructure/cleanup.sh
chmod +x tests/run-tests.sh
```

---

## 🎯 Método 1: Deploy Automático (Recomendado)

### Passo 1: Executar Script de Deploy

```bash
cd infrastructure
./deploy.sh
```

### Passo 2: Confirmar Email

Durante o deploy, você será solicitado a confirmar o email para notificações:

```
Email do professor para notificações [seu-email@exemplo.com]: 
```

Digite: **j.anderson.mect@gmail.com** (ou seu email preferido)

### Passo 3: Aguardar Conclusão

O script irá:

1. ✅ Criar bucket S3 (~30 segundos)
2. ✅ Criar tabela DynamoDB (~1 minuto)
3. ✅ Criar tópico SNS (~15 segundos)
4. ✅ Fazer deploy da Lambda (~45 segundos)
5. ✅ Configurar API Gateway (~2 minutos)
6. ✅ Upload do frontend (~30 segundos)

**Tempo total:** ~5-8 minutos

### Passo 4: Salvar URLs

Ao final, o script mostrará:

```
==========================================
DEPLOY CONCLUÍDO COM SUCESSO!
==========================================

URLs do Projeto:
  Interface Aluno:     http://smartclass-qa-123456789012-us-west-2.s3-website-us-west-2.amazonaws.com/aluno/
  Dashboard Professor: http://smartclass-qa-123456789012-us-west-2.s3-website-us-west-2.amazonaws.com/professor/
  API Endpoint:        https://abc123xyz.execute-api.us-west-2.amazonaws.com/prod

Próximos Passos:
  1. Confirme a inscrição no email: j.anderson.mect@gmail.com
  2. Acesse a interface do aluno e envie mensagens de teste
  3. Verifique o dashboard do professor
```

**⚠️ IMPORTANTE:** Copie e salve essas URLs em um arquivo de texto!

---

## 🔧 Método 2: Deploy Manual

### Etapa 1: Criar Bucket S3

```bash
# Obter ID da conta
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Definir nome do bucket
BUCKET_NAME="smartclass-qa-${ACCOUNT_ID}-us-west-2"

# Criar bucket
aws s3 mb s3://${BUCKET_NAME} --region us-west-2

# Configurar website estático
aws s3 website s3://${BUCKET_NAME} \
    --index-document index.html \
    --error-document error.html

# Aplicar política pública
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
```

### Etapa 2: Criar Tabela DynamoDB

```bash
aws dynamodb create-table \
    --table-name SmartClassMessages \
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
    --region us-west-2

# Aguardar tabela ficar ativa
aws dynamodb wait table-exists \
    --table-name SmartClassMessages \
    --region us-west-2
```

### Etapa 3: Criar Tópico SNS

```bash
# Criar tópico
SNS_TOPIC_ARN=$(aws sns create-topic \
    --name smartclass-qa-notifications \
    --region us-west-2 \
    --query 'TopicArn' \
    --output text)

echo "Tópico SNS criado: ${SNS_TOPIC_ARN}"

# Subscrever email
aws sns subscribe \
    --topic-arn ${SNS_TOPIC_ARN} \
    --protocol email \
    --notification-endpoint j.anderson.mect@gmail.com \
    --region us-west-2
```

### Etapa 4: Deploy da Lambda

```bash
# Preparar pacote
cd lambda
npm install --production
zip -r /tmp/lambda-function.zip . -x "*.git*" "node_modules/.bin/*"
cd ..

# Obter ARN da LabRole
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/LabRole"

# Criar função
aws lambda create-function \
    --function-name smartclass-qa-handler \
    --runtime nodejs18.x \
    --role ${LAMBDA_ROLE_ARN} \
    --handler index.handler \
    --zip-file fileb:///tmp/lambda-function.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment Variables="{
        TABLE_NAME=SmartClassMessages,
        SNS_TOPIC_ARN=${SNS_TOPIC_ARN},
        REGION=us-west-2
    }" \
    --region us-west-2
```

### Etapa 5: Configurar API Gateway

```bash
# Criar REST API
API_ID=$(aws apigateway create-rest-api \
    --name smartclass-qa-api \
    --description "API para Smart Class Q&A" \
    --region us-west-2 \
    --query 'id' \
    --output text)

echo "API ID: ${API_ID}"

# Obter root resource
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id ${API_ID} \
    --region us-west-2 \
    --query 'items[?path==`/`].id' \
    --output text)

# Criar recurso /mensagem
MENSAGEM_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id ${API_ID} \
    --parent-id ${ROOT_RESOURCE_ID} \
    --path-part mensagem \
    --region us-west-2 \
    --query 'id' \
    --output text)

# Criar método POST /mensagem
aws apigateway put-method \
    --rest-api-id ${API_ID} \
    --resource-id ${MENSAGEM_RESOURCE_ID} \
    --http-method POST \
    --authorization-type NONE \
    --region us-west-2

# Integrar com Lambda
aws apigateway put-integration \
    --rest-api-id ${API_ID} \
    --resource-id ${MENSAGEM_RESOURCE_ID} \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:us-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:us-west-2:${ACCOUNT_ID}:function:smartclass-qa-handler/invocations" \
    --region us-west-2

# Repetir para /duvidas (GET) e /status (PUT)
# ... (comandos similares)

# Deploy da API
aws apigateway create-deployment \
    --rest-api-id ${API_ID} \
    --stage-name prod \
    --region us-west-2

# Dar permissão para API Gateway
aws lambda add-permission \
    --function-name smartclass-qa-handler \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-west-2:${ACCOUNT_ID}:${API_ID}/*" \
    --region us-west-2

# URL da API
API_URL="https://${API_ID}.execute-api.us-west-2.amazonaws.com/prod"
echo "API URL: ${API_URL}"
```

### Etapa 6: Upload do Frontend

```bash
# Atualizar config.js com URL da API
cat > frontend/shared/config.js <<EOF
const API_CONFIG = {
    baseURL: '${API_URL}',
    endpoints: {
        mensagem: '/mensagem',
        duvidas: '/duvidas',
        status: '/status'
    },
    timeout: 30000,
    defaultHeaders: {
        'Content-Type': 'application/json'
    }
};
EOF

# Upload para S3
aws s3 sync frontend/ s3://${BUCKET_NAME}/ \
    --region us-west-2 \
    --exclude ".git/*" \
    --exclude ".DS_Store"

# URL do site
WEBSITE_URL="http://${BUCKET_NAME}.s3-website-us-west-2.amazonaws.com"
echo "Website URL: ${WEBSITE_URL}"
```

---

## ⚙️ Configuração Pós-Deploy

### 1. Confirmar Inscrição SNS

1. Verifique seu email: **j.anderson.mect@gmail.com**
2. Procure por email da AWS SNS com assunto: **"AWS Notification - Subscription Confirmation"**
3. Clique no link de confirmação
4. Você verá: **"Subscription confirmed!"**

### 2. Testar Endpoints da API

```bash
# Definir URL da API
API_URL="https://SEU_API_ID.execute-api.us-west-2.amazonaws.com/prod"

# Teste 1: Enviar mensagem
curl -X POST ${API_URL}/mensagem \
    -H "Content-Type: application/json" \
    -d '{
        "alunoNome": "Teste Deploy",
        "mensagem": "Como funciona o Lambda?"
    }'

# Deve retornar: {"success": true, "classification": "DUVIDA", ...}

# Teste 2: Listar dúvidas
curl ${API_URL}/duvidas

# Deve retornar: {"success": true, "count": 1, "duvidas": [...]}
```

### 3. Acessar Interfaces

```bash
# Abrir no navegador
# Interface Aluno
http://SEU-BUCKET.s3-website-us-west-2.amazonaws.com/aluno/

# Dashboard Professor
http://SEU-BUCKET.s3-website-us-west-2.amazonaws.com/professor/
```

---

## 🧪 Testes e Validação

### Teste Completo do Fluxo

#### 1. Interface do Aluno

1. Acesse a URL do aluno
2. Digite seu nome: **"João Teste"**
3. Digite mensagem: **"Como funciona o DynamoDB?"**
4. Clique em **"Enviar Mensagem"**
5. ✅ Deve mostrar: **"Dúvida registrada! O professor será notificado."**
6. ✅ Verifique o histórico na mesma página

#### 2. Notificação Email

1. Verifique seu email em **~30 segundos**
2. ✅ Deve receber: **"🔔 Nova Dúvida Detectada - Smart Class Q&A"**
3. Conteúdo deve mostrar a mensagem do aluno

#### 3. Dashboard Professor

1. Acesse a URL do professor
2. ✅ Deve mostrar a dúvida em **"Não Respondidas"**
3. Clique em **"Marcar como Respondida"**
4. ✅ Deve mover para **"Respondidas"**
5. Estatísticas devem atualizar automaticamente

#### 4. Validar Classificação IA

Envie estas mensagens e valide a classificação:

**Dúvidas Esperadas:**
- "Não entendi essa parte"
- "Qual o comando?"
- "Como funciona?"

**Interações Esperadas:**
- "Obrigado"
- "Entendi"
- "Boa noite"

### Teste de Performance

```bash
# Enviar 10 mensagens simultâneas
for i in {1..10}; do
  curl -X POST ${API_URL}/mensagem \
      -H "Content-Type: application/json" \
      -d "{\"alunoNome\": \"Aluno $i\", \"mensagem\": \"Teste $i\"}" &
done
wait

# Verificar se todas foram processadas
curl ${API_URL}/duvidas | jq '.count'
# Deve retornar: 10 (ou mais)
```

### Validar CloudWatch Logs

```bash
# Ver logs da Lambda
aws logs tail /aws/lambda/smartclass-qa-handler \
    --follow \
    --region us-west-2

# Deve mostrar logs de processamento em tempo real
```

---

## 🔍 Troubleshooting

### Problema 1: "API não configurada"

**Sintoma:** Frontend mostra erro de API não configurada

**Solução:**
```bash
# Verificar se config.js foi atualizado
cat frontend/shared/config.js | grep baseURL

# Deve mostrar URL real, não "YOUR_API_ID"
# Se não, execute novamente o upload:
aws s3 sync frontend/ s3://${BUCKET_NAME}/ --region us-west-2
```

### Problema 2: CORS Error

**Sintoma:** Console do navegador mostra erro de CORS

**Solução:**
```bash
# Verificar se Lambda retorna headers CORS corretos
# Veja index.js - função createResponse()
# Deve incluir:
# 'Access-Control-Allow-Origin': '*'
# 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
```

### Problema 3: Lambda Timeout

**Sintoma:** Erro 504 Gateway Timeout

**Solução:**
```bash
# Aumentar timeout da Lambda
aws lambda update-function-configuration \
    --function-name smartclass-qa-handler \
    --timeout 60 \
    --region us-west-2
```

### Problema 4: DynamoDB Access Denied

**Sintoma:** Erro "Access Denied" ao salvar mensagem

**Solução:**
```bash
# Verificar se LabRole tem permissões
# No Sandbox, isso deve estar OK por padrão
# Se não, verifique IAM Role usado pela Lambda
```

### Problema 5: Email Não Chega

**Sintoma:** Não recebe notificação por email

**Verificar:**
1. ✅ Confirmou inscrição SNS?
2. ✅ Verifique pasta de spam
3. ✅ Email correto no deploy?

```bash
# Verificar inscrições SNS
aws sns list-subscriptions-by-topic \
    --topic-arn ${SNS_TOPIC_ARN} \
    --region us-west-2

# Deve mostrar status: "Confirmed"
```

### Logs de Debug

```bash
# Ver logs detalhados
aws logs get-log-events \
    --log-group-name /aws/lambda/smartclass-qa-handler \
    --log-stream-name $(aws logs describe-log-streams \
        --log-group-name /aws/lambda/smartclass-qa-handler \
        --order-by LastEventTime \
        --descending \
        --limit 1 \
        --query 'logStreams[0].logStreamName' \
        --output text) \
    --region us-west-2
```

---

## 🧹 Limpeza de Recursos

### Método Rápido

```bash
cd infrastructure
./cleanup.sh
```

### Método Manual

```bash
# 1. Deletar função Lambda
aws lambda delete-function \
    --function-name smartclass-qa-handler \
    --region us-west-2

# 2. Deletar API Gateway
aws apigateway delete-rest-api \
    --rest-api-id ${API_ID} \
    --region us-west-2

# 3. Deletar tópico SNS
aws sns delete-topic \
    --topic-arn ${SNS_TOPIC_ARN} \
    --region us-west-2

# 4. Deletar tabela DynamoDB
aws dynamodb delete-table \
    --table-name SmartClassMessages \
    --region us-west-2

# 5. Esvaziar e deletar bucket S3
aws s3 rm s3://${BUCKET_NAME} --recursive
aws s3 rb s3://${BUCKET_NAME} --region us-west-2
```

---

## 📊 Checklist Final

### Antes da Apresentação

- [ ] Deploy completo realizado
- [ ] URLs salvas em local seguro
- [ ] Email SNS confirmado
- [ ] Testes de fluxo completo realizados
- [ ] Classificação IA validada
- [ ] Screenshots capturados
- [ ] Vídeo de backup gravado (opcional)

### Durante a Apresentação

- [ ] Abrir dashboard professor em uma aba
- [ ] Abrir interface aluno em outra aba
- [ ] Console AWS aberto (mostrar recursos)
- [ ] CloudWatch logs preparado
- [ ] Casos de teste prontos

### Após a Apresentação

- [ ] Limpar recursos do Sandbox
- [ ] Salvar evidências (screenshots, logs)
- [ ] Documentar lições aprendidas

---

## 🆘 Suporte

**Problemas durante o deploy?**

1. Consulte a seção [Troubleshooting](#troubleshooting)
2. Verifique logs no CloudWatch
3. Revise o README.md do projeto
4. Contato: j.anderson.mect@gmail.com

---

## 📝 Notas Importantes

⚠️ **Sandbox Expira em 3 Horas:** Planeje seu tempo  
⚠️ **Credenciais Temporárias:** Salve URLs antes de expirar  
⚠️ **Custo Zero:** Tudo no Free Tier  
⚠️ **Limpe Recursos:** Execute cleanup.sh ao final  

---

**Bom deploy! 🚀**