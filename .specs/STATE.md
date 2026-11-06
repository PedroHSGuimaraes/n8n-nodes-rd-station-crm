# Project state

## Decisions

| ID | Decision | Rationale | Status | Date |
| --- | --- | --- | --- | --- |
| AD-001 | RD Station Marketing e RD Station Conversas viram pacotes npm próprios (`n8n-nodes-rd-station-marketing` e `n8n-nodes-rd-station-conversas`), cada um com repositório próprio; este pacote continua só CRM | A guideline de verificação do n8n pede um serviço por pacote, e a RD documenta as três APIs como distintas. Menu: "Onde devem morar os novos nodes..." → "Pacotes separados" (Jev 0,84) | active | 2026-11-06 |
| AD-002 | O pacote usa o `@n8n/node-cli` 0.55.5 para build e lint (`n8n-node build`, `n8n-node lint`), sem gulp e sem config própria de ESLint | A guideline de verificação manda usar a ferramenta `n8n-node`. Menu: "Qual escopo de atualização..." → "Migrar para node-cli" (Jev 0,96) | active | 2026-11-06 |
| AD-003 | Mudança de formato de parâmetro entra como versão leve do node (`version: [1, 2]`, `defaultVersion` 2, `@version` em `displayOptions`); a versão 1 mantém nome e tipo de todo parâmetro | Workflows salvos não podem quebrar; a guia `.agents/versioning.md` do node-cli manda versão leve e proíbe versão completa sem reescrita. Menu: "Como tratar isso nos nodes já publicados?" → "Nova versão do node" (Jev 0,83) | active | 2026-11-06 |
| AD-004 | A entrega é branch, Pull Request, merge na `master` e tag `vX.Y.Z`, que publica no npm pelo `publish.yml` com provenance | Menu: "Como entregar e publicar as mudanças?" → "PR e publicar" (o dono escolheu contra o Jev, que deu 0,10) | active | 2026-11-06 |
