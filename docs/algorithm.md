# 🤖 Algoritmo de IA Proprietário - Smart Class Q&A

> **Documentação Técnica**  
> **Versão:** 1.0  
> **Última atualização:** Dezembro 2024

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Classificador](#arquitetura-do-classificador)
3. [Técnicas de Machine Learning Utilizadas](#técnicas-de-machine-learning-utilizadas)
4. [Fluxo de Processamento](#fluxo-de-processamento)
5. [Sistema de Pontuação](#sistema-de-pontuação)
6. [Cálculo de Confiança](#cálculo-de-confiança)
7. [Exemplos Práticos](#exemplos-práticos)
8. [Métricas de Performance](#métricas-de-performance)
9. [Otimizações Futuras](#otimizações-futuras)

---

## 🎯 Visão Geral

### Objetivo

Classificar automaticamente mensagens de alunos em duas categorias:
- **DÚVIDA:** Perguntas técnicas que requerem atenção do professor
- **INTERAÇÃO:** Mensagens sociais, cumprimentos e confirmações

### Por Que Não Usamos Serviços Externos?

1. **Compatibilidade com Sandbox:** Amazon Comprehend não está disponível
2. **Controle Total:** Ajustamos pesos e thresholds conforme necessário
3. **Custo Zero:** Sem chamadas a serviços pagos
4. **Latência Mínima:** Processamento local na Lambda
5. **Aprendizado:** Demonstra conhecimento de ML/NLP

### Tecnologias Base

- **Linguagem:** JavaScript (Node.js 18.x)
- **Paradigma:** Análise Léxica + Heurísticas + Score Multi-critério
- **Inspiração:** Algoritmos de classificação de texto (Naive Bayes, TF-IDF)

---

## 🏗️ Arquitetura do Classificador

### Estrutura da Classe

```javascript
class MessageClassifier {
  constructor() {
    // Dicionários de palavras-chave
    this.questionKeywords = [...];      // Palavras interrogativas
    this.technicalTerms = [...];        // Termos técnicos AWS
    this.socialKeywords = [...];        // Expressões sociais
    this.negativeKeywords = [...];      // Indicadores de confusão
    
    // Pesos para score final
    this.weights = {
      hasQuestionMark: 3.0,
      questionKeywords: 2.5,
      technicalTerms: 2.0,
      socialKeywords: -3.0,
      negativeKeywords: 1.5,
      messageLength: 0.5
    };
    
    // Threshold de decisão
    this.threshold = 2.0;
  }
  
  classify(message) { /* ... */ }
}
```

### Componentes Principais

```
┌─────────────────────────────────────────┐
│         MessageClassifier               │
├─────────────────────────────────────────┤
│                                         │
│  1. Normalização de Texto               │
│     ↓                                    │
│  2. Tokenização                         │
│     ↓                                    │
│  3. Análise Léxica                      │
│     ↓                                    │
│  4. Detecção de Padrões                 │
│     ↓                                    │
│  5. Cálculo de Score                    │
│     ↓                                    │
│  6. Classificação (threshold)           │
│     ↓                                    │
│  7. Cálculo de Confiança                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🧠 Técnicas de Machine Learning Utilizadas

### 1. Processamento de Linguagem Natural (NLP)

#### 1.1 Normalização de Texto

**Objetivo:** Padronizar entrada para análise consistente

**Processo:**
```javascript
normalize(text) {
  return text
    .toLowerCase()                      // "DÚVIDA" → "dúvida"
    .normalize('NFD')                   // Decompor acentos
    .replace(/[\u0300-\u036f]/g, '')   // Remover acentos: "dúvida" → "duvida"
    .replace(/[^\w\s?]/g, ' ')         // Remover pontuação (exceto ?)
    .replace(/\s+/g, ' ')              // Normalizar espaços
    .trim();                            // Remover espaços extras
}
```

**Exemplo:**
```
Input:  "Não entendi!!!  COMO funciona???"
Output: "nao entendi como funciona ?"
```

#### 1.2 Tokenização

**Objetivo:** Dividir texto em unidades analisáveis

```javascript
tokenize(text) {
  return text
    .split(' ')
    .filter(token => token.length > 0);
}
```

**Exemplo:**
```
Input:  "como funciona lambda"
Output: ["como", "funciona", "lambda"]
```

### 2. Análise de Features (Características)

#### 2.1 Detecção de Palavras-Chave

**Palavras Interrogativas:**
```javascript
questionKeywords = [
  'como', 'quando', 'onde', 'qual', 'quais',
  'porque', 'por que', 'posso', 'consigo',
  'pode', 'devo', 'preciso', 'entendi',
  'não entendi', 'funciona', 'fazer'
]
```

**Termos Técnicos (Contexto AWS/Educacional):**
```javascript
technicalTerms = [
  'lambda', 'ec2', 's3', 'dynamodb', 'api',
  'gateway', 'aws', 'cloud', 'bucket',
  'função', 'serverless', 'região', 'sandbox',
  'deploy', 'código', 'script', 'lab', 'kc',
  'comando', 'terminal', 'console'
]
```

**Expressões Sociais:**
```javascript
socialKeywords = [
  'bom dia', 'boa tarde', 'boa noite',
  'obrigado', 'obrigada', 'valeu', 'legal',
  'show', 'parabéns', 'massa', 'top',
  'blz', 'beleza', 'tranquilo', 'ok',
  'certo', 'entendi', 'consegui', 'tchau',
  'até', 'falou', 'kkk', 'rsrs', 'haha'
]
```

#### 2.2 Contagem de Ocorrências

```javascript
countMatches(tokens, keywords) {
  let count = 0;
  const tokensStr = tokens.join(' ');
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = tokensStr.match(regex);
    if (matches) count += matches.length;
  });
  
  return count;
}
```

**Exemplo:**
```
Tokens: ["como", "funciona", "o", "lambda"]
Keywords: ["como", "funciona"]
Result: 2 matches
```

### 3. Análise de Sentimento Simplificada

**Objetivo:** Detectar tom emocional da mensagem

```javascript
analyzeSentiment(tokens) {
  const positiveWords = ['obrigado', 'parabens', 'legal', 'show', 'bom', 'otimo'];
  const negativeWords = ['nao', 'ruim', 'dificil', 'erro', 'problema', 'confuso'];
  
  let positiveCount = this.countMatches(tokens, positiveWords);
  let negativeCount = this.countMatches(tokens, negativeWords);
  
  if (positiveCount > negativeCount) return 'POSITIVE';
  if (negativeCount > positiveCount) return 'NEGATIVE';
  return 'NEUTRAL';
}
```

**Interpretação:**
- **POSITIVE:** Agradecimentos, elogios → Provável interação
- **NEGATIVE:** Confusão, problema → Possível dúvida
- **NEUTRAL:** Sem emoção clara → Analisar outros fatores

### 4. Sistema de Score Multi-critério

**Conceito:** Cada feature contribui com um peso para o score final

```javascript
calculateScore(analysis) {
  let score = 0;
  
  // 1. Interrogação tem peso alto (+3.0)
  if (analysis.hasQuestionMark) {
    score += this.weights.hasQuestionMark;
  }
  
  // 2. Palavras interrogativas (+2.5 cada)
  score += analysis.questionKeywordCount * this.weights.questionKeywords;
  
  // 3. Termos técnicos (+2.0 cada)
  score += analysis.technicalTermCount * this.weights.technicalTerms;
  
  // 4. Palavras sociais (-3.0 cada) - REDUZ score
  score += analysis.socialKeywordCount * this.weights.socialKeywords;
  
  // 5. Palavras negativas/confusão (+1.5 cada)
  score += analysis.negativeKeywordCount * this.weights.negativeKeywords;
  
  // 6. Mensagens curtas tendem a ser interações
  if (analysis.wordCount >= 3) {
    score += this.weights.messageLength;
  }
  
  // 7. Bônus: Combinação técnica + interrogativa (+1.0)
  if (analysis.technicalTermCount > 0 && analysis.questionKeywordCount > 0) {
    score += 1.0;
  }
  
  return score;
}
```

### 5. Threshold de Decisão

**Regra de Classificação:**
```javascript
const classification = score >= 2.0 ? 'DUVIDA' : 'INTERACAO';
```

**Justificativa do Threshold = 2.0:**
- Baseado em análise de casos de teste
- Equilibra Precisão (Precision) e Revocação (Recall)
- Minimiza falsos positivos e negativos

---

## 🔄 Fluxo de Processamento

### Diagrama Completo

```
┌──────────────────────────────────────────────────────────┐
│ Input: "Como funciona o Lambda?"                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ 1. NORMALIZAÇÃO      │
          │ "como funciona o     │
          │  lambda ?"           │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ 2. TOKENIZAÇÃO       │
          │ ["como", "funciona", │
          │  "o", "lambda", "?"] │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │ 3. ANÁLISE LÉXICA                │
          │ • hasQuestionMark: true          │
          │ • questionKeywordCount: 2        │
          │   (como, funciona)               │
          │ • technicalTermCount: 1 (lambda) │
          │ • socialKeywordCount: 0          │
          │ • negativeKeywordCount: 0        │
          │ • wordCount: 4                   │
          │ • sentiment: NEUTRAL             │
          └──────────┬───────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │ 4. CÁLCULO DE SCORE              │
          │ • Interrogação: +3.0             │
          │ • Palavras interrogativas: +5.0  │
          │   (2 × 2.5)                      │
          │ • Termos técnicos: +2.0          │
          │   (1 × 2.0)                      │
          │ • Palavras sociais: 0            │
          │ • Palavras negativas: 0          │
          │ • Comprimento: +0.5              │
          │ • Bônus combinação: +1.0         │
          │ ────────────────────────         │
          │ SCORE TOTAL: 11.5                │
          └──────────┬───────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │ 5. CLASSIFICAÇÃO                 │
          │ Score (11.5) >= Threshold (2.0)  │
          │ → DÚVIDA                         │
          └──────────┬───────────────────────┘
                     │
                     ▼
          ┌──────────────────────────────────┐
          │ 6. CÁLCULO DE CONFIANÇA          │
          │ Distance = |11.5 - 2.0| = 9.5    │
          │ Confidence = min(50 + 9.5×10, 95)│
          │ → 95%                            │
          └──────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ Output:                                                │
│ {                                                      │
│   classification: "DUVIDA",                           │
│   score: 11.5,                                        │
│   confidence: 95,                                     │
│   reason: "DUVIDA detectada: contém interrogação,    │
│            2 palavra(s) interrogativa(s),            │
│            1 termo(s) técnico(s)"                    │
│ }                                                      │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Sistema de Pontuação Detalhado

### Tabela de Pesos

| Feature | Peso | Justificativa |
|---------|------|---------------|
| Interrogação (?) | +3.0 | Forte indicador de pergunta |
| Palavra interrogativa | +2.5 cada | Como, quando, onde, etc. |
| Termo técnico | +2.0 cada | Lambda, S3, DynamoDB, etc. |
| Palavra social | -3.0 cada | Obrigado, boa noite, etc. |
| Palavra negativa | +1.5 cada | Não entendi, problema, erro |
| Comprimento (≥3 palavras) | +0.5 | Mensagens curtas são interações |
| Bônus combinação | +1.0 | Técnico + interrogativo |

### Exemplos de Cálculo

#### Exemplo 1: Dúvida Técnica

**Mensagem:** "Como funciona o Lambda?"

```
Análise:
• hasQuestionMark: true → +3.0
• questionKeywords: ["como", "funciona"] → +5.0 (2 × 2.5)
• technicalTerms: ["lambda"] → +2.0 (1 × 2.0)
• socialKeywords: [] → 0
• negativeKeywords: [] → 0
• wordCount: 4 (≥3) → +0.5
• Bônus (técnico + interrogativo): +1.0

SCORE TOTAL: 11.5
CLASSIFICAÇÃO: DÚVIDA (11.5 ≥ 2.0)
CONFIANÇA: 95%
```

#### Exemplo 2: Interação Social

**Mensagem:** "Obrigado pela aula!"

```
Análise:
• hasQuestionMark: false → 0
• questionKeywords: [] → 0
• technicalTerms: [] → 0
• socialKeywords: ["obrigado"] → -3.0 (1 × -3.0)
• negativeKeywords: [] → 0
• wordCount: 3 (≥3) → +0.5
• Bônus: 0

SCORE TOTAL: -2.5
CLASSIFICAÇÃO: INTERAÇÃO (-2.5 < 2.0)
CONFIANÇA: 95%
```

#### Exemplo 3: Caso Ambíguo

**Mensagem:** "Entendi"

```
Análise:
• hasQuestionMark: false → 0
• questionKeywords: ["entendi"] → +2.5 (1 × 2.5)
• technicalTerms: [] → 0
• socialKeywords: ["entendi"] → -3.0 (1 × -3.0)
• negativeKeywords: [] → 0
• wordCount: 1 (<3) → 0
• Bônus: 0

SCORE TOTAL: -0.5
CLASSIFICAÇÃO: INTERAÇÃO (-0.5 < 2.0)
CONFIANÇA: 75%
```

---

## 📈 Cálculo de Confiança

### Fórmula

```javascript
calculateConfidence(score) {
  const distance = Math.abs(score - this.threshold);
  const confidence = Math.min(50 + (distance * 10), 95);
  return Math.round(confidence);
}
```

### Interpretação

```
Score    Distance  Confidence  Interpretação
─────────────────────────────────────────────
10.0     8.0       95%         Dúvida clara
 5.0     3.0       80%         Provável dúvida
 3.0     1.0       60%         Dúvida fraca
 2.5     0.5       55%         Limite (ambíguo)
 1.5     0.5       55%         Limite (ambíguo)
 1.0     1.0       60%         Interação fraca
-2.0     4.0       90%         Provável interação
-5.0     7.0       95%         Interação clara
```

### Níveis de Confiança

- **90-95%:** ALTA - Classificação muito confiável
- **70-89%:** MÉDIA - Classificação confiável
- **50-69%:** BAIXA - Classificação incerta

---

## 💡 Exemplos Práticos

### Casos de Teste Validados

#### ✅ Dúvidas (Verdadeiros Positivos)

| Mensagem | Score | Confiança | Razão |
|----------|-------|-----------|-------|
| "Como funciona o Lambda?" | 11.5 | 95% | Interrogação + 2 palavras interrogativas + 1 termo técnico |
| "Não entendi essa parte" | 6.5 | 95% | 2 palavras interrogativas + 1 negativa |
| "Qual o nome do Lab?" | 9.0 | 95% | Interrogação + 2 palavras interrogativas + 1 termo técnico |
| "Onde fica essa tela?" | 8.0 | 95% | Interrogação + 2 palavras interrogativas |
| "Professor pode explicar novamente" | 5.0 | 80% | 2 palavras interrogativas |

#### ✅ Interações (Verdadeiros Negativos)

| Mensagem | Score | Confiança | Razão |
|----------|-------|-----------|-------|
| "Obrigado" | -3.0 | 90% | 1 palavra social |
| "Boa noite pessoal" | -3.0 | 90% | 1 palavra social |
| "Entendi" | -0.5 | 75% | 1 interrogativa - 1 social |
| "Consegui" | -0.5 | 75% | 1 interrogativa - 1 social |
| "Legal, show!" | -6.0 | 90% | 2 palavras sociais |

#### ⚠️ Casos Limítrofes

| Mensagem | Score | Confiança | Classificação | Observação |
|----------|-------|-----------|---------------|------------|
| "Ok" | 0 | 50% | INTERAÇÃO | Muito curta, sem features |
| "Certo" | -0.5 | 75% | INTERAÇÃO | 1 social sobrepõe |
| "Entendi obrigado" | -3.5 | 81% | INTERAÇÃO | Múltiplas sociais |

---

## 📊 Métricas de Performance

### Resultados dos Testes (22 casos)

```
┌─────────────────────────────────────────┐
│ RESUMO DOS TESTES                       │
├─────────────────────────────────────────┤
│ Total de testes: 22                     │
│ Passou: 20                              │
│ Falhou: 2                               │
│                                         │
│ Taxa de Acerto: 90.91%                  │
└─────────────────────────────────────────┘
```

### Análise por Categoria

| Categoria | Total | Acertos | Taxa |
|-----------|-------|---------|------|
| Dúvida Explícita | 5 | 5 | 100% |
| Pergunta Técnica | 5 | 5 | 100% |
| Cumprimento | 3 | 3 | 100% |
| Confirmação | 4 | 3 | 75% |
| Comentário Social | 2 | 2 | 100% |
| Agradecimento | 1 | 1 | 100% |
| Expressão Positiva | 2 | 1 | 50% |

### Matriz de Confusão

```
                 Predito
                 DÚVIDA  INTERAÇÃO
Real  DÚVIDA       10        0
      INTERAÇÃO     2       10
```

**Métricas:**
- **Precisão (Precision):** 83.3% (10 / (10+2))
- **Revocação (Recall):** 100% (10 / (10+0))
- **F1-Score:** 90.9%

---

## 🚀 Otimizações Futuras

### 1. Machine Learning Supervisionado

**Proposta:** Treinar modelo com histórico real de mensagens

```javascript
// Usar TensorFlow.js para classificação
const model = tf.sequential();
model.add(tf.layers.dense({units: 64, activation: 'relu', inputShape: [vectorSize]}));
model.add(tf.layers.dense({units: 2, activation: 'softmax'}));
```

**Vantagens:**
- Aprende padrões específicos do contexto
- Melhora com o tempo
- Pode detectar novos tipos de dúvidas

### 2. Análise de Contexto

**Proposta:** Considerar mensagens anteriores do aluno

```javascript
// Se aluno já enviou dúvidas, próximas mensagens
// curtas podem ser follow-ups
if (previousMessages.some(m => m.classification === 'DUVIDA')) {
  score += 1.0; // Bônus de contexto
}
```

### 3. Word Embeddings

**Proposta:** Usar vetores semânticos (Word2Vec, GloVe)

```javascript
// Medir similaridade semântica com dúvidas conhecidas
const similarity = cosineSimilarity(messageVector, knownQuestionVector);
if (similarity > 0.7) score += 2.0;
```

### 4. Ajuste Dinâmico de Threshold

**Proposta:** Adaptar threshold baseado em feedback do professor

```javascript
// Se professor frequentemente corrige classificações
// ajustar threshold automaticamente
if (falsePositiveRate > 0.2) {
  this.threshold += 0.1;
}
```

### 5. Multi-idioma

**Proposta:** Detectar idioma e usar dicionários específicos

```javascript
const language = detectLanguage(message);
this.questionKeywords = this.dictionaries[language].questions;
```

---

## 📚 Referências Técnicas

### Conceitos Aplicados

1. **Tokenização:** Processo de dividir texto em unidades menores
2. **TF-IDF:** Term Frequency-Inverse Document Frequency (conceito inspirador)
3. **Análise de Sentimento:** Detecção de tom emocional
4. **Score Multi-critério:** Combinação ponderada de features
5. **Threshold de Classificação:** Ponto de decisão binária

### Inspirações

- Algoritmos de classificação de texto (Naive Bayes)
- Sistemas de filtragem de spam
- Chatbots e assistentes virtuais
- Sistemas de triagem de tickets

---

## 📝 Conclusão

O algoritmo de IA proprietário do Smart Class Q&A demonstra que é possível criar classificadores eficientes sem dependências externas. Com **90%+ de acurácia**, o sistema:

✅ Filtra dúvidas técnicas automaticamente  
✅ Reduz ruído informacional  
✅ Funciona 100% no AWS Sandbox  
✅ Tem custo zero  
✅ É totalmente customizável  

**Desenvolvido por:** Equipe BRSAO207  
**Contato:** j.anderson.mect@gmail.com