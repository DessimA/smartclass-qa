# 🤝 Guia de Contribuição - Smart Class Q&A

Seja bem-vindo à equipe! Para manter nosso código organizado e seguro, seguimos um fluxo de trabalho rigoroso:

## 🚩 Regra de Ouro
**NUNCA faça push direto na branch `main`.** 
A branch `main` é o nosso ambiente de produção (o que o professor e o aluno usam). Qualquer erro nela derruba o sistema.

## 🔄 Fluxo de Trabalho (Git Flow)

1.  **Trabalhe na branch `dev`**: 
    Sempre mude para a branch dev antes de começar:
    ```bash
    git checkout dev
    git pull origin dev
    ```

2.  **Envie suas alterações**:
    ```bash
    git add .
    git commit -m "Explicação curta do que você fez"
    git push origin dev
    ```

3.  **Abra um Pull Request (PR)**:
    - Vá no GitHub, mude para a aba "Pull Requests".
    - Clique em "New Pull Request".
    - Compare `main` <- `dev`.
    - Aguarde a revisão do @$(git config user.name).

## ⚠️ Consequências
Qualquer push direto na `main` fará com que o nosso sistema de monitoramento (GitHub Actions) falhe o build automaticamente e notifique o administrador.

Obrigado por colaborar! 🎓
