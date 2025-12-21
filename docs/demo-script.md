# 🎤 Roteiro de Apresentação - Smart Class Q&A

> **Duração Total:** 15 minutos  
> **Formato:** Demonstração ao vivo + Slides  
> **Público:** Instrutores AWS Re/Start + Colegas de turma

---

## 📋 Índice Rápido

1. [Preparação Pré-Apresentação](#preparação-pré-apresentação) (Fazer ANTES!)
2. [Estrutura da Apresentação](#estrutura-da-apresentação) (15 min)
3. [Script Detalhado](#script-detalhado) (O que falar)
4. [Checklist Final](#checklist-final)
5. [Plano B](#plano-b) (Se algo der errado)
6. [Perguntas Frequentes](#perguntas-frequentes)

---

## 🛠️ Preparação Pré-Apresentação

### ✅ Checklist 30 Minutos ANTES

#### **1. Validar Deploy (CRÍTICO)**
```bash
# Testar se tudo está funcionando
cd infrastructure
./test-api.sh

# Deve retornar: ✓ Todos os testes passaram
```

#### **2. Abrir Abas do Navegador (Ordem Específica)**

**Aba 1:** Console AWS - Lambda
- URL: https://console.aws.amazon.com/lambda
- Mostrar função `smartclass-qa-handler`

**Aba 2:** Console AWS - DynamoDB
- URL: https://console.aws.amazon.com/dynamodb
- Tabela `SmartClassMessages` aberta

**Aba 3:** Console AWS - CloudWatch Logs
- URL: https://console.aws.amazon.com/cloudwatch
- Log group `/aws/lambda/smartclass-qa-handler`

**Aba 4:** Interface do Aluno
- URL: `http://SEU-BUCKET.s3-website-us-west-2.amazonaws.com/aluno/`
- Limpar histórico: `localStorage.clear()`

**Aba 5:** Dashboard do Professor
- URL: `http://SEU-BUCKET.s3-website-us-west-2.amazonaws.com/professor/`
- Refresh para limpar cache

**Aba 6:** Diagrama de Arquitetura (Draw.io)
- Ter PNG exportado como backup

**Aba 7:** Email (Gmail)
- Pasta de entrada aberta
- Demonstrar notificação SNS

#### **3. Preparar Mensagens de Teste**

Copiar para arquivo de texto:

```
DÚVIDAS (para testar):
1. Como funciona o Lambda?
2. Não entendi essa parte, pode explicar novamente?
3. Qual o comando para fazer deploy?

INTERAÇÕES (para testar):
1. Obrigado pela aula!
2. Boa noite pessoal
3. Entendi, valeu!
```

#### **4. Backup de Segurança**

- [ ] Screenshots de TUDO funcionando
- [ ] Vídeo gravado (2-3 min) como Plano B
- [ ] Slides em PDF (caso internet caia)

#### **5. Testar Equipamento**

- [ ] Microfone funcionando
- [ ] Projetor/compartilhamento de tela OK
- [ ] Mouse/Trackpad responsivo
- [ ] Conexão internet estável

---

## 📊 Estrutura da Apresentação

### Divisão de Tempo (15 minutos)

| Seção | Tempo | Conteúdo |
|-------|-------|----------|
| 1. Introdução | 2 min | Problema + Solução |
| 2. Arquitetura | 3 min | Diagrama + Tecnologias |
| 3. Demo ao Vivo | 7 min | Interface + IA + Dashboard |
| 4. Diferenciais | 2 min | Algoritmo + Metodologia |
| 5. Conclusão | 1 min | Resultados + Próximos passos |

### Transições

```
Introdução → Arquitetura
  ↓
Arquitetura → Demo
  ↓
Demo → Diferenciais
  ↓
Diferenciais → Conclusão
```

---

## 🎬 Script Detalhado

### **SEÇÃO 1: Introdução (2 minutos)**

#### **Slide 1: Título**
```
[MOSTRAR SLIDE COM TÍTULO E LOGO]

👋 Olá, somos a equipe do projeto Smart Class Q&A!

[APONTAR PARA TELA]
Nosso projeto resolve um problema real que todos nós 
já enfrentamos em aulas online.
```

#### **Slide 2: O Problema**
```
[MOSTRAR SLIDE COM CAPTURA DE TELA DE CHAT CAÓTICO]

🔴 O PROBLEMA:

Durante aulas remotas, o chat fica inundado com mensagens 
de interação social, cumprimentos e comentários paralelos.

[PAUSA DE 2 SEGUNDOS]

O resultado? Dúvidas técnicas importantes dos alunos 
passam despercebidas pelo professor.

[MOSTRAR ESTATÍSTICA]
Em uma aula de 2 horas, podem ser trocadas mais de 
100 mensagens, mas apenas 10-15 são dúvidas reais.
```

#### **Slide 3: A Solução**
```
[MOSTRAR SLIDE COM LOGO + TAGLINE]

✅ A SOLUÇÃO: Smart Class Q&A

Um sistema inteligente que utiliza IA para filtrar 
automaticamente DÚVIDAS de INTERAÇÕES.

[MOSTRAR BENEFÍCIOS]
• Professor vê APENAS dúvidas importantes
• Alunos têm certeza que serão ouvidos
• Notificação automática via email
• Zero custo - 100% no AWS Free Tier
```

**[TRANSIÇÃO: "Agora vamos ver como funciona..."]**

---

### **SEÇÃO 2: Arquitetura (3 minutos)**

#### **Slide 4: Arquitetura AWS**
```
[MOSTRAR DIAGRAMA DO DRAW.IO]

🏗️ ARQUITETURA SERVERLESS NA AWS

Nossa solução utiliza 6 serviços principais:

[APONTAR CADA UM NO DIAGRAMA]

1. Amazon S3 → Frontend estático
   [PAUSA] Interface web acessível via browser

2. API Gateway → Endpoints REST
   [PAUSA] 3 rotas: enviar mensagem, listar dúvidas, atualizar status

3. AWS Lambda → Processamento serverless
   [PAUSA] Nosso código roda aqui, em Node.js 18

4. IA Proprietária → Classificador interno
   [PAUSA] **Este é nosso diferencial!** Não usamos serviços externos

5. DynamoDB → Banco NoSQL
   [PAUSA] Armazena todas as mensagens com alta disponibilidade

6. Amazon SNS → Notificações
   [PAUSA] Email automático para o professor
```

#### **Slide 5: Fluxo de Dados**
```
[ANIMAR FLUXO NO DIAGRAMA OU USAR SLIDE COM SETAS]

📊 FLUXO DE FUNCIONAMENTO:

[SEGUIR COM O DEDO/PONTEIRO]

1. Aluno digita mensagem no chat web
   ↓
2. Frontend envia via HTTPS para API Gateway
   ↓
3. Lambda processa usando nosso algoritmo de IA
   ↓
4. IA classifica: DÚVIDA ou INTERAÇÃO?
   ↓
5. Salva no DynamoDB
   ↓
6. Se DÚVIDA → Notifica professor via SNS
   ↓
7. Professor vê no dashboard e marca como respondida

[ENFATIZAR]
Tudo isso acontece em menos de 500ms!
```

**[TRANSIÇÃO: "Agora vamos ver funcionando ao vivo..."]**

---

### **SEÇÃO 3: Demonstração ao Vivo (7 minutos)**

#### **Parte 1: Interface do Aluno (2 min)**

```
[TROCAR PARA ABA: INTERFACE DO ALUNO]

👨‍🎓 INTERFACE DO ALUNO

Vou mostrar como um aluno interage com o sistema.

[DIGITAR NA TELA]
Nome: "João Silva"
Mensagem: "Como funciona o Lambda?"

[EXPLICAR ENQUANTO DIGITA]
Reparem na interface: simples, intuitiva, 
tema azul escuro para não cansar a vista.

[CLICAR EM "ENVIAR"]

[AGUARDAR RESPOSTA - 2 SEGUNDOS]

✅ Pronto! Vejam a resposta:
"Dúvida registrada! O professor será notificado."

[APONTAR PARA HISTÓRICO]
E aqui embaixo já aparece no histórico pessoal do aluno,
classificada como DÚVIDA com 95% de confiança.
```

**[MOSTRAR MAIS EXEMPLOS - RÁPIDO]**

```
[ENVIAR RAPIDAMENTE]
Mensagem 2: "Obrigado pela aula!"
→ Classificada como INTERAÇÃO ✓

Mensagem 3: "Não entendi essa parte"
→ Classificada como DÚVIDA ✓

[EXPLICAR]
Vejam como o algoritmo diferencia perfeitamente!
```

#### **Parte 2: Notificação por Email (1 min)**

```
[TROCAR PARA ABA: EMAIL]

📧 NOTIFICAÇÃO AUTOMÁTICA

[MOSTRAR EMAIL RECEBIDO]

Reparem que em menos de 30 segundos, 
o professor recebeu um email automático via SNS.

[LER CONTEÚDO]
"Nova Dúvida Detectada
 Aluno: João Silva
 Confiança: 95%
 Dúvida: Como funciona o Lambda?"

[ENFATIZAR]
Isso garante que nenhuma dúvida passe despercebida,
mesmo que o professor não esteja olhando o dashboard!
```

#### **Parte 3: Dashboard do Professor (3 min)**

```
[TROCAR PARA ABA: DASHBOARD PROFESSOR]

👨‍🏫 DASHBOARD DO PROFESSOR

Este é o painel principal onde o professor gerencia as dúvidas.

[APONTAR PARA ESTATÍSTICAS]
Aqui em cima vemos as métricas em tempo real:
• Total de Dúvidas: 3
• Não Respondidas: 3
• Respondidas: 0

[APONTAR PARA FILTROS]
O professor pode filtrar:
• Todas
• Não Respondidas ← mais importante
• Respondidas

[CLICAR EM "NÃO RESPONDIDAS"]

[MOSTRAR CARD DE DÚVIDA]
Vejam cada card de dúvida:
• Nome do aluno
• Tempo decorrido ("2 minutos atrás")
• Confiança da IA (95%)
• Mensagem completa
• Botão de ação

[CLICAR EM "MARCAR COMO RESPONDIDA"]

[CONFIRMAR]
Sim.

[MOSTRAR ANIMAÇÃO]
Pronto! A dúvida mudou de status e as 
estatísticas atualizaram automaticamente.

[EXPLICAR AUTO-REFRESH]
E esse indicador aqui em cima? 
"Próxima atualização em 25s"

O dashboard se atualiza sozinho a cada 30 segundos!
Isso significa que novas dúvidas aparecem automaticamente
sem o professor precisar dar refresh.
```

#### **Parte 4: Validação Técnica (1 min)**

```
[TROCAR PARA ABA: CONSOLE AWS - LAMBDA]

🔧 VALIDAÇÃO TÉCNICA

Para quem é técnico, vou mostrar rapidamente 
o que está acontecendo nos bastidores.

[MOSTRAR LAMBDA]
Aqui está nossa função Lambda rodando.

[TROCAR PARA: CLOUDWATCH LOGS]

[MOSTRAR LOGS]
E aqui os logs em tempo real mostrando 
cada processamento:
• Mensagem recebida
• Classificação: DUVIDA
• Score: 11.5
• Salvo no DynamoDB
• Notificação SNS enviada

[TROCAR PARA: DYNAMODB]

[MOSTRAR TABELA]
E aqui no DynamoDB, todas as mensagens 
persistidas com seus metadados.
```

**[TRANSIÇÃO: "Agora vou mostrar nossos diferenciais..."]**

---

### **SEÇÃO 4: Diferenciais (2 minutos)**

#### **Slide 6: Algoritmo de IA**

```
[MOSTRAR SLIDE COM DIAGRAMA DO ALGORITMO]

🤖 NOSSO DIFERENCIAL: IA PROPRIETÁRIA

Por que desenvolvemos nosso próprio algoritmo 
em vez de usar Amazon Comprehend?

[LISTAR RAZÕES]
1. Comprehend não está disponível no Sandbox
2. Controle total sobre a classificação
3. Custo ZERO - sem chamadas externas
4. Latência mínima - processamento local
5. Customização para contexto educacional

[MOSTRAR TÉCNICAS]
Nosso algoritmo utiliza:
• Processamento de Linguagem Natural (NLP)
• Análise léxica e tokenização
• Detecção de palavras-chave contextuais
• Sistema de score multi-critério
• Análise de sentimento simplificada

[MOSTRAR MÉTRICAS]
Resultados nos testes:
✓ Taxa de acerto: 90.91% (20/22 casos)
✓ Precisão: 83.3%
✓ Recall: 100%
✓ Confiança média: 85%
```

#### **Slide 7: Metodologia Ágil**

```
[MOSTRAR KANBAN BOARD]

📊 METODOLOGIA: DESENVOLVIMENTO ÁGIL

Utilizamos Scrum com sprints de 3 dias:

Sprint 1: Infraestrutura AWS
Sprint 2: Backend + IA
Sprint 3: Frontend
Sprint 4: Testes + Documentação

[MOSTRAR BOARD]
Aqui nosso board Kanban com:
• 8 tarefas concluídas
• 4 em andamento
• 3 planejadas
• Progresso: 47%

[ENFATIZAR]
Todo o código está documentado e disponível
no GitHub para revisão.
```

**[TRANSIÇÃO: "Para finalizar..."]**

---

### **SEÇÃO 5: Conclusão (1 minuto)**

#### **Slide 8: Resultados Alcançados**

```
[MOSTRAR SLIDE DE CONCLUSÃO]

🎯 RESULTADOS ALCANÇADOS

✅ Sistema 100% funcional
✅ Deploy automatizado (<10 minutos)
✅ Algoritmo de IA com 90%+ de acurácia
✅ Arquitetura serverless escalável
✅ Custo ZERO (Free Tier)
✅ Código documentado e testado

[PAUSA]

Impacto real:
• Reduz sobrecarga cognitiva do professor
• Garante que nenhuma dúvida seja perdida
• Melhora engajamento dos alunos
• Democratiza a atenção em sala de aula
```

#### **Slide 9: Próximos Passos**

```
[MOSTRAR ROADMAP]

🚀 EVOLUÇÕES FUTURAS

Para o módulo de IA avançada, planejamos:

1. Autenticação com AWS Cognito
2. Machine Learning com histórico real
3. Dashboard de analytics com tendências
4. Integração com Slack/Microsoft Teams
5. Suporte multi-idioma
6. Respostas automáticas com ChatGPT

[FINALIZAR]
Obrigado pela atenção!

Estamos disponíveis para perguntas.

[MOSTRAR CONTATO]
📧 j.anderson.mect@gmail.com
🔗 github.com/DessimA/smartclass-qa
```

**[ABRIR PARA PERGUNTAS]**

---

## ✅ Checklist Final (5 min antes)

### Verificação Rápida

- [ ] Todas as abas abertas e testadas
- [ ] URLs funcionando
- [ ] Mensagens de teste copiadas
- [ ] Email aberto
- [ ] Console AWS logado
- [ ] Slides carregados
- [ ] Backup preparado
- [ ] Água/respiração profunda

### Teste de Som e Imagem

- [ ] "Teste, teste, 1, 2, 3"
- [ ] Compartilhamento de tela visível para todos
- [ ] Fontes legíveis (zoom se necessário)

---

## 🆘 Plano B (Se algo der errado)

### Problema 1: Internet Cai

**Solução:**
1. Mostrar vídeo gravado (backup)
2. Continuar apresentação em slides
3. Mostrar screenshots das evidências

```
[DIZER COM CALMA]
"Estamos com problemas de conexão, mas preparamos 
um vídeo demonstrativo que mostra exatamente o 
que eu estava fazendo ao vivo..."
```

### Problema 2: API Não Responde

**Solução:**
1. Mostrar CloudWatch Logs
2. Explicar que o Sandbox pode ter expirado
3. Mostrar screenshots de quando funcionava

```
[EXPLICAR]
"Parece que as credenciais do Sandbox expiraram,
mas tenho aqui evidências de quando executamos 
com sucesso..."
```

### Problema 3: Classificação Errada

**Solução:**
1. Explicar que IA não é 100% perfeita
2. Mostrar estatísticas (90% de acerto)
3. Demonstrar com outro exemplo

```
[DIZER]
"Interessante! Este é exatamente um dos 10% de casos 
onde o algoritmo pode errar. Por isso temos o sistema 
de confiança, vejam que marcou apenas 65%..."
```

### Problema 4: Esquecer o que Falar

**Solução:**
1. Respirar fundo
2. Olhar para este roteiro (discreto)
3. Falar naturalmente

```
[TÉCNICA]
"Deixa eu mostrar mais um detalhe importante aqui..."
[GANHA TEMPO PARA LEMBRAR]
```

---

## ❓ Perguntas Frequentes (Preparar Respostas)

### Q1: "Por que não usaram Amazon Comprehend?"

**Resposta:**
```
Ótima pergunta! O Amazon Comprehend não está disponível 
no ambiente Sandbox do AWS Re/Start. Mas isso se tornou 
uma oportunidade de aprender e desenvolver nosso próprio 
algoritmo de classificação, aplicando conceitos de NLP e 
Machine Learning que estudamos no curso.

Além disso, nosso algoritmo tem custo zero e é totalmente 
customizável para o contexto educacional.
```

### Q2: "Como garantem a privacidade dos dados?"

**Resposta:**
```
Excelente ponto! A privacidade é fundamental. 
No nosso MVP:

1. Não pedimos email ou dados pessoais dos alunos
2. Apenas nome (pode ser fictício)
3. Dados armazenados no DynamoDB da AWS (seguro)
4. Sem compartilhamento com terceiros

Para produção, implementaríamos:
• Criptografia em trânsito e em repouso
• Autenticação com AWS Cognito
• Conformidade com LGPD
• Logs de auditoria
```

### Q3: "Quanto custa rodar em produção?"

**Resposta:**
```
No nosso teste com Free Tier, o custo foi ZERO.

Para produção, estimamos (100 alunos, 50 msgs/aula):

• Lambda: ~$0.20/mês (1M requests grátis)
• DynamoDB: ~$2.50/mês (25 GB grátis)
• S3: ~$0.50/mês (5 GB grátis)
• API Gateway: ~$3.50/mês (1M requests/mês)
• SNS: ~$0.10/mês

TOTAL: ~$6.80/mês

Extremamente acessível para instituições de ensino!
```

### Q4: "O algoritmo melhora com o tempo?"

**Resposta:**
```
No MVP atual, o algoritmo é baseado em regras fixas.

Mas está preparado para evoluir! Planejamos:

1. Armazenar feedback do professor 
   (quando corrige uma classificação)

2. Usar esse histórico para treinar um modelo 
   de Machine Learning supervisionado

3. Ajustar pesos dinamicamente com TensorFlow.js

4. Quanto mais usar, mais preciso fica

Essa é uma das evoluções para o módulo de IA avançada!
```

### Q5: "Funciona em outros idiomas?"

**Resposta:**
```
Atualmente está otimizado para português brasileiro.

Para adicionar outros idiomas, precisaríamos:

1. Criar dicionários de palavras-chave por idioma
2. Ajustar normalização (acentos diferentes)
3. Detectar idioma automaticamente

Tecnicamente viável! Com algumas horas de trabalho,
poderíamos adicionar inglês, espanhol, etc.
```

### Q6: "Como testaram o sistema?"

**Resposta:**
```
Criamos uma suíte completa de testes:

1. Testes Unitários (22 casos)
   • Dúvidas explícitas
   • Perguntas técnicas
   • Interações sociais
   • Casos ambíguos

2. Testes de Integração
   • API endpoints
   • Fluxo completo
   • Performance

3. Testes de Usabilidade
   • Interface intuitiva
   • Feedback visual claro

Resultado: 90.91% de acurácia!

Todo código de teste está disponível no GitHub.
```

---

## 🎭 Dicas de Apresentação

### Linguagem Corporal

✅ **Fazer:**
- Manter contato visual
- Sorrir naturalmente
- Gesticular moderadamente
- Postura ereta e confiante
- Pausar para respirar

❌ **Evitar:**
- Cruzar braços
- Mãos no bolso o tempo todo
- Balançar/mexer muito
- Ler slides palavra por palavra
- Falar muito rápido

### Tom de Voz

- **Introdução:** Entusiasmado, cativante
- **Arquitetura:** Técnico mas acessível
- **Demo:** Descritivo, pausado
- **Conclusão:** Confiante, inspirador

### Timing

- Se estiver **atrasado:** Pule exemplos extras
- Se estiver **adiantado:** Mostre mais detalhes técnicos
- **Sempre** deixe 2-3 min para perguntas

---

## 📝 Notas Finais

### Antes de Apresentar

```
[MANTRA MENTAL]
Eu conheço este projeto melhor que ninguém.
Eu construí cada linha de código.
Eu testei tudo múltiplas vezes.
Estou preparado para qualquer pergunta.
Vai dar tudo certo! 💪
```

### Durante a Apresentação

```
[LEMBRAR]
• Falar COM a audiência, não PARA a audiência
• Demonstrar paixão pelo projeto
• Ser autêntico
• Admitir se não souber algo
• Aproveitar o momento!
```

### Depois da Apresentação

```
[CHECKLIST]
- [ ] Agradecer ao instrutor
- [ ] Disponibilizar links
- [ ] Salvar feedback recebido
- [ ] Celebrar com a equipe! 🎉
```

---

## 🎯 Mensagem Final

**Lembre-se:** Você criou algo real, funcional e útil. Este projeto resolve um problema verdadeiro e demonstra domínio de múltiplas tecnologias AWS.

**Seja confiante, seja claro, seja você mesmo!**

**Boa sorte! Você vai arrasar! 🚀🎓**

---

**Contato Pós-Apresentação:**  
📧 j.anderson.mect@gmail.com  
🔗 github.com/DessimA/smartclass-qa  
👥 Turma BRSAO207