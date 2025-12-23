const MessageClassifier = require('../lambda/classifier');

const classifier = new MessageClassifier();

const failedCases = [
    "Não entendi o Comprehend, poderia explicar novamente?",
    "Como configuro o Rekognition?",
    "Onde vejo os logs do CloudWatch?",
    "Meu ECS não está subindo a task",
    "Erro de permissão no bucket S3",
    "Preciso de ajuda com o Glue", // Glue não adicionei explicitamente, vamos ver se passa por contexto
    "A tela do console travou",
    "Qual a diferença entre EFS e EBS?"
];

console.log("=== TESTE DE NOVOS FILTROS ===\n");

failedCases.forEach(msg => {
    const result = classifier.classify(msg);
    const passed = result.classification === 'DUVIDA';
    const icon = passed ? '✅' : '❌';
    
    console.log(`${icon} "${msg}"`);
    console.log(`   Resultado: ${result.classification} | Score: ${result.score} | Termos: ${result.analysis.technicalTermCount}`);
    
    if (!passed) {
        console.log(`   ⚠️ MOTIVO REJEIÇÃO: ${result.reason}`);
        console.log(`   Tokens: ${result.analysis.tokens.join(', ')}`);
    }
    console.log('---');
});
