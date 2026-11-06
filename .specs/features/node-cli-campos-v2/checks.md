# node-cli e campos guiados (versão 2 do node) checks

Build: `npx tsc --noEmit`; `npm run lint`
Run unit: `node --test --test-reporter=tap test/*.test.cjs`
Plan: `.specs/features/node-cli-campos-v2/plan.md`

## Intent

24 checks in 4 slices · 3 one-way doors · 0 open

## Checks

### S1 - toolchain do node-cli 0.55.5

**C1** - `npm run build` gera os dois nodes, as duas credenciais e os ícones `.svg` em `dist/` (S1, AC 1)
Proof: run unit | ok build generates both nodes, both credentials and the icons

**C2** - `npm run lint` (`n8n-node lint`) sai com código 0 e 0 erros (S1, AC 2)
Proof: `npm run lint`

**C3** - O `package.json` tem `build: n8n-node build`, `lint: n8n-node lint`, `n8n.strict: true`, `@n8n/node-cli` `0.55.5`, nenhum `dependencies` e nenhum `gulp` (S1, AC 3)
Proof: run unit | ok package.json follows the node-cli template

**C4** - O `ci.yml` roda `npm ci`, `npm run lint`, `npm test` e `npm run build` em Pull Request (S1, AC 4)
Proof: run unit | ok ci workflow runs install, lint, test and build on pull requests

**C5** - `npm test` termina com `# fail 0` (S1, AC 5)
Proof: `npm test 2>&1 | grep -q '^# fail 0'`

### S2 - versão 1 continua igual

**C6** - Com `typeVersion` 1, `contact` `get` e `contactId` `'abc123'` chamam GET `/contacts/abc123` na base `https://crm.rdstation.com/api/v1` com a credencial `rdStationCrmApi` (S2, AC 1)
Proof: run unit | ok version 1 contact get calls GET /contacts/abc123

**C7** - Com `typeVersion` 1, `deal` `moveToStage`, `dealId` `'d1'` e `dealStageId` `'s9'` chamam `PUT /deals/d1` com corpo `{ "deal_stage_id": "s9" }` (S2, AC 2)
Proof: run unit | ok version 1 deal moveToStage calls PUT /deals/d1

**C8** - Todo parâmetro da 2.3.2 (52 pares `name`/`type`) continua visível para `@version` 1 com o mesmo `name` e o mesmo `type` (S2, AC 3)
Proof: run unit | ok version 1 keeps every parameter name and type of 2.3.2

### S3 - campos de ID guiados na versão 2

**C9** - O node novo nasce com `typeVersion` 2: `version: [1, 2]` e `defaultVersion: 2` (S3, AC 1)
Proof: run unit | ok node defaults to version 2 and still lists version 1

**C10** - Na versão 2 cada campo de ID principal é `resourceLocator` com modos `list` (padrão, `searchable: true`) e `id`, e a versão 1 mantém o campo em texto, cada um com `@version` próprio (S3, AC 2)
Proof: run unit | ok version 2 exposes every guided ID field as a resourceLocator

**C11** - Com `typeVersion` 2 e `contactId` `{ mode: 'list', value: 'abc123' }`, o execute chama `GET /contacts/abc123` (S3, AC 3)
Proof: run unit | ok version 2 list mode reads the contact ID

**C12** - Com `typeVersion` 2 e `contactId` `{ mode: 'id', value: ' abc123 ' }`, o execute chama `GET /contacts/abc123` sem os espaços (S3, AC 4)
Proof: run unit | ok version 2 id mode trims the pasted ID

**C13** - Resource Locator com `value` vazio lança `NodeOperationError` com a mensagem `The 'Contact' parameter is empty [item 0]` e a descrição `Choose a contact from the list or paste its ID` (S3, AC 5)
Proof: run unit | ok version 2 empty locator fails with a guiding message

**C14** - `listSearch` com o texto `ana` devolve `{ results: [{ name, value }] }` só com os itens que casam, sem diferenciar acento (S3, AC 6)
Proof: run unit | ok listSearch filters by the typed text

**C15** - Todo `searchListMethod` declarado em um campo existe em `methods.listSearch` (S3, AC 6)
Proof: run unit | ok every searchListMethod exists in listSearch

**C16** - O execute de cada recurso lê o valor do Resource Locator e monta a rota com o ID certo, em todos os campos guiados (S3, AC 3)
Proof: run unit | ok every guided field reads its locator value in execute

**C17** - A RD respondendo `401` vira `NodeApiError` no execute da versão 1, da versão 2 e no `listSearch` (S1-S3, Surface)
Proof: run unit | ok a 401 from RD becomes a NodeApiError

**C18** - `listSearch` de contatos e negócios manda o texto à RD (`q` na v1, `name` na v1 de negócios, `filter=name:` na v2) em vez de baixar a lista inteira (S3, AC 6)
Proof: run unit | ok listSearch sends the search text to RD where the route filters

**C19** - O trigger registra o erro ao remover um webhook em vez de engoli-lo, e segue removendo os outros (Out of scope, trigger)
Proof: run unit | ok trigger delete logs a failed removal and keeps going

### S4 - lançamento 2.4.0

**C20** - O `package.json` está em `2.4.0` e o `CHANGELOG.md` tem a seção `## 2.4.0` com a migração, a versão 2 do node e a correção do lint (S4, AC 1)
Proof: run unit | ok release 2.4.0 is documented in the changelog

**C21** - O `publish.yml` continua publicando na tag `v*` com `npm publish --provenance` (S4, AC 2)
Proof: run unit | ok publish workflow keeps the v tag trigger and provenance

**C22** - Nenhum teste e nenhum arquivo de produção usa `any` explícito nem `catch` vazio (lint do node-cli cobre) (S1, AC 2)
Proof: `npm run lint`

**C23** - A busca v2 de contatos e negócios manda o filtro RDQL de trecho `name:~texto`, com aspas quando o texto tem espaço (S3, AC 6)
Proof: run unit | ok listSearch quotes RDQL text that has spaces

**C24** - A busca de tarefas (v1 e v2) pede uma página por vez com `paginationToken`, sem baixar todas as páginas (S3, AC 6)
Proof: run unit | ok listSearch pages tasks one page at a time

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| campos de ID guiados na v2 (14) - contactId, dealId, organizationId, taskId, pipelineId, stageId, productId, sourceId, campaignId, lossReasonId, customFieldId, teamId, userId, webhookId | todos em C10 e C16, table-driven sobre os 14 | - |
| dealId extra (3) - Note, Task, Deal Product | note C10 · task C10 · dealProduct C10 · leitura C16 | - |
| API do campo (2) | v1 C6 · v2 C11 | - |
| modos do locator (2) | list C11 · id C12 | - |
| locator vazio (1) | C13 | - |
| `listSearch` (3 estados) | filtro C14 · existência C15 · filtro na RD C18 | - |
| node `rdStationCrm` v2 statuses (2) | 200 C11 · 401 C17 | - |
| node `rdStationCrm` v1 statuses (2) | 200 C6 · 401 C17 | - |
| `listSearch` statuses (2) | 200 C14 · 401 C17 | - |
| arquivos de saída do build (4 grupos) | nodes C1 · credenciais C1 · ícones C1 · lint C2 | - |
| startup config: assemblies que montam o node (2) | `dist` carregado pelo teste C1 · `package.json` `n8n.nodes` C3 | - |

- Claims naming a status code, route or response shape: C6, C7, C11, C12, C17 - each proof crosses the boundary by calling the real `execute` with a fake HTTP responder
- No other check claims more than the single case its proof exercises

## Swept

- validation: C13
- failure modes: C17
- idempotency: n/a - o node só repassa leitura e escrita pontuais à RD, sem chave de repetição própria
- authorization: C17
- concurrency: n/a - nenhum estado compartilhado; cada item do workflow roda isolado
- data lifecycle: C12
- dependency failure: C17, C19
- state transitions: n/a - o node não guarda estado
- observability: C19

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier (sonnet) enviado em HEAD 19c9dda; returned (achados F1-F5 fechados em 76cb85f)
- **Boundary:** C1-C22 fechados em 19c9dda
- **Abandoned:** nenhum
- **Walked:** sem tela; a conferência no editor do n8n fica para o dono (abrir um workflow novo, adicionar o node RD Station CRM e ver a lista no campo de ID)
