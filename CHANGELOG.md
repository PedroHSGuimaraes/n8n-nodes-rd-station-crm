# Changelog

## 2.4.0

- **Campos de ID em lista pesquisável (node version 2).** Em node novo, os campos de ID de contato, negócio, empresa, tarefa, funil, etapa, produto, origem, campanha, motivo de perda, campo personalizado, time, usuário e webhook mostram a lista da conta, com busca, e aceitam colar o ID. Contatos e negócios enviam o texto da busca à RD.
- **Workflows salvos não mudam.** O node passa a ter `version: [1, 2]` com `defaultVersion` 2. Workflows salvos guardam a version 1 e continuam com os campos em texto, enviando a mesma requisição da 2.3.2.
- **Migração para o `@n8n/node-cli` 0.55.5.** Build e lint passam a usar `n8n-node build` e `n8n-node lint`. O `gulp` saiu, e os ícones são copiados pelo próprio build.
- **Correção do lint.** Foram corrigidos os 121 erros do lint oficial: descrições com ponto final, texto padrão das listas dinâmicas, `any` explícito trocado por tipos reais e a categoria do arquivo `.node.json`.
- **Trigger registra o erro.** Ao remover um webhook que falha, o trigger registra o aviso no log e segue removendo os outros, em vez de engolir o erro.
- **Timeout de 30 s** em toda requisição à RD.
- **Testes e CI.** O pacote ganha testes automatizados (`npm test`) e um workflow de CI que roda lint, testes e build em todo Pull Request.
