/**
 * Smart Class Q&A - Testes do Classificador
 * Validar algoritmo de IA com casos reais
 */

const MessageClassifier = require('../lambda/classifier');

// Cores para output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Inicializar classificador
const classifier = new MessageClassifier();

// Casos de teste baseados nas mensagens fornecidas
const testCases = [
  // DÚVIDAS ESPERADAS
  {
    mensagem: "Professor não entendi essa parte pode explicar novamente",
    esperado: "DUVIDA",
    categoria: "Dúvida Explícita"
  },
  {
    mensagem: "onde fica essa tela?",
    esperado: "DUVIDA",
    categoria: "Pergunta Técnica"
  },
  {
    mensagem: "Qual o nome do Lab?",
    esperado: "DUVIDA",
    categoria: "Pergunta Direta"
  },
  {
    mensagem: "Qual é o KC?",
    esperado: "DUVIDA",
    categoria: "Pergunta Técnica"
  },
  {
    mensagem: "Qual o comando?",
    esperado: "DUVIDA",
    categoria: "Pergunta Técnica"
  },
  
  // INTERAÇÕES ESPERADAS
  {
    mensagem: "Boa noite",
    esperado: "INTERACAO",
    categoria: "Cumprimento"
  },
  {
    mensagem: "Boa noite pessoal!",
    esperado: "INTERACAO",
    categoria: "Cumprimento"
  },
  {
    mensagem: "Pois é cara foi isso que entendi",
    esperado: "INTERACAO",
    categoria: "Comentário Social"
  },
  {
    mensagem: "Obrigado",
    esperado: "INTERACAO",
    categoria: "Agradecimento"
  },
  {
    mensagem: "Entendi",
    esperado: "INTERACAO",
    categoria: "Confirmação"
  },
  {
    mensagem: "Certo",
    esperado: "INTERACAO",
    categoria: "Confirmação"
  },
  {
    mensagem: "Consegui",
    esperado: "INTERACAO",
    categoria: "Confirmação de Sucesso"
  },
  
  // CASOS ADICIONAIS DE DÚVIDAS
  {
    mensagem: "Como funciona o Lambda?",
    esperado: "DUVIDA",
    categoria: "Pergunta Conceitual"
  },
  {
    mensagem: "Não entendi o conceito de serverless",
    esperado: "DUVIDA",
    categoria: "Dúvida Conceitual"
  },
  {
    mensagem: "Qual a diferença entre S3 e EBS?",
    esperado: "DUVIDA",
    categoria: "Comparação Técnica"
  },
  {
    mensagem: "Posso usar EC2 para isso?",
    esperado: "DUVIDA",
    categoria: "Pergunta de Aplicação"
  },
  {
    mensagem: "Quando devo usar DynamoDB?",
    esperado: "DUVIDA",
    categoria: "Pergunta de Uso"
  },
  
  // CASOS ADICIONAIS DE INTERAÇÕES
  {
    mensagem: "Parabéns pela aula!",
    esperado: "INTERACAO",
    categoria: "Elogio"
  },
  {
    mensagem: "kkkk muito bom",
    esperado: "INTERACAO",
    categoria: "Expressão Informal"
  },
  {
    mensagem: "Show de bola!",
    esperado: "INTERACAO",
    categoria: "Expressão Positiva"
  },
  {
    mensagem: "Estou aqui",
    esperado: "INTERACAO",
    categoria: "Confirmação de Presença"
  },
  {
    mensagem: "Legal!",
    esperado: "INTERACAO",
    categoria: "Expressão Positiva"
  }
];

/**
 * Executar todos os testes
 */
function runTests() {
  console.log(`${BLUE}╔════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║    SMART CLASS Q&A - TESTES DO CLASSIFICADOR     ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════╝${RESET}\n`);
  
  let passed = 0;
  let failed = 0;
  const failedTests = [];
  
  testCases.forEach((testCase, index) => {
    const result = classifier.classify(testCase.mensagem);
    const success = result.classification === testCase.esperado;
    
    if (success) {
      passed++;
      console.log(`${GREEN}✓${RESET} Teste ${index + 1}: ${testCase.categoria}`);
    } else {
      failed++;
      console.log(`${RED}✗${RESET} Teste ${index + 1}: ${testCase.categoria}`);
      failedTests.push({
        index: index + 1,
        ...testCase,
        resultado: result.classification,
        score: result.score,
        confidence: result.confidence
      });
    }
    
    console.log(`  Mensagem: "${testCase.mensagem}"`);
    console.log(`  Esperado: ${testCase.esperado} | Obtido: ${result.classification}`);
    console.log(`  Score: ${result.score} | Confiança: ${result.confidence}%`);
    console.log(`  Razão: ${result.reason}\n`);
  });
  
  // Resumo
  console.log(`${BLUE}════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}RESUMO DOS TESTES${RESET}\n`);
  console.log(`Total de testes: ${testCases.length}`);
  console.log(`${GREEN}Passou: ${passed}${RESET}`);
  console.log(`${RED}Falhou: ${failed}${RESET}`);
  
  const accuracy = (passed / testCases.length) * 100;
  console.log(`\n${YELLOW}Taxa de Acerto: ${accuracy.toFixed(2)}%${RESET}\n`);
  
  // Detalhes dos testes que falharam
  if (failedTests.length > 0) {
    console.log(`${RED}TESTES QUE FALHARAM:${RESET}\n`);
    failedTests.forEach(test => {
      console.log(`${RED}✗ Teste ${test.index}: ${test.categoria}${RESET}`);
      console.log(`  Mensagem: "${test.mensagem}"`);
      console.log(`  Esperado: ${test.esperado}`);
      console.log(`  Obtido: ${test.resultado}`);
      console.log(`  Score: ${test.score} | Confiança: ${test.confidence}%\n`);
    });
  }
  
  // Análise por categoria
  console.log(`${BLUE}════════════════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}ANÁLISE POR CATEGORIA${RESET}\n`);
  
  const categorias = {};
  testCases.forEach(testCase => {
    if (!categorias[testCase.categoria]) {
      categorias[testCase.categoria] = { total: 0, acertos: 0 };
    }
    categorias[testCase.categoria].total++;
    
    const result = classifier.classify(testCase.mensagem);
    if (result.classification === testCase.esperado) {
      categorias[testCase.categoria].acertos++;
    }
  });
  
  Object.keys(categorias).sort().forEach(categoria => {
    const stats = categorias[categoria];
    const taxa = (stats.acertos / stats.total) * 100;
    const status = taxa === 100 ? GREEN : taxa >= 70 ? YELLOW : RED;
    console.log(`${status}${categoria}: ${stats.acertos}/${stats.total} (${taxa.toFixed(0)}%)${RESET}`);
  });
  
  console.log(`\n${BLUE}════════════════════════════════════════════════════${RESET}`);
  
  // Status final
  if (accuracy >= 90) {
    console.log(`\n${GREEN}✓ ALGORITMO APROVADO! Taxa de acerto acima de 90%${RESET}\n`);
    return 0;
  } else if (accuracy >= 70) {
    console.log(`\n${YELLOW}⚠ ALGORITMO PRECISA DE AJUSTES. Taxa de acerto entre 70-90%${RESET}\n`);
    return 1;
  } else {
    console.log(`\n${RED}✗ ALGORITMO REPROVADO. Taxa de acerto abaixo de 70%${RESET}\n`);
    return 2;
  }
}

/**
 * Testar mensagem individual
 */
function testSingleMessage(mensagem) {
  console.log(`\n${BLUE}Testando mensagem:${RESET} "${mensagem}"\n`);
  const result = classifier.classify(mensagem);
  
  console.log(`Classificação: ${result.classification}`);
  console.log(`Score: ${result.score}`);
  console.log(`Confiança: ${result.confidence}%`);
  console.log(`Razão: ${result.reason}`);
  console.log(`\nAnálise Completa:`);
  console.log(JSON.stringify(result.analysis, null, 2));
}

// Executar testes
if (require.main === module) {
  // Se executado diretamente
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Testar mensagem específica
    testSingleMessage(args.join(' '));
  } else {
    // Executar todos os testes
    const exitCode = runTests();
    process.exit(exitCode);
  }
}

module.exports = { runTests, testSingleMessage };