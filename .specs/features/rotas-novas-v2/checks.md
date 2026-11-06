# rotas novas da API v2 e trigger OAuth2 checks

Build: `npx tsc --noEmit`; `npm run lint`
Run unit: `npm test`
Plan: `.specs/features/rotas-novas-v2/plan.md`

## Intent

42 checks in 5 slices · 3 one-way doors · 0 open

## Checks

### S1 - leads, funis, etapas, fontes, motivos, usuários e produtos da negociação

**C1** - `leadV2` `create` chama `POST /leads` na base da API v2 com a credencial OAuth2, `timeout` 30000 e corpo `{ data: { name: 'Ana', status: 'ongoing', rating: 3, contact_ids: ['c1','c2'] } }` (S1, AC 1)
Proof: run unit | ok S1.1 lead create posts /leads with the data envelope

**C2** - `leadV2` `get` com `leadId` `{ mode: 'id', value: ' L9 ' }` chama `GET /leads/L9` (S1, AC 2)
Proof: run unit | ok S1.2 lead get reads the locator and trims it

**C3** - `leadV2` `update` chama `PUT /leads/L9` com `{ data: { status: 'converted' } }` (S1, AC 3)
Proof: run unit | ok S1.3 lead update puts only the changed fields

**C4** - `leadV2` `getMany` com limite 20 e filtro chama `GET /leads` com `qs` `{ filter: 'status:ongoing', 'page[size]': 20 }` (S1, AC 4)
Proof: run unit | ok S1.4 lead getMany sends the filter and the page size

**C5** - `pipelineV2` `get` e `getMany` chamam `GET /pipelines/P1` e `GET /pipelines` (S1, AC 5)
Proof: run unit | ok S1.5 pipeline get and getMany call the pipeline routes

**C6** - `stageV2` `getMany` e `get` chamam `GET /pipelines/P1/stages` e `GET /pipelines/P1/stages/S2` (S1, AC 6)
Proof: run unit | ok S1.6 stage get and getMany are nested under the pipeline

**C7** - `sourceV2` e `lostReasonV2` `get` e `getMany` chamam as quatro rotas de leitura (S1, AC 7)
Proof: run unit | ok S1.7 source and lost reason read routes

**C8** - `userV2` `get` e `getMany` chamam `GET /users/U1` e `GET /users` (S1, AC 8)
Proof: run unit | ok S1.8 user get and getMany call the user routes

**C9** - `dealProductV2` `create` chama `POST /deals/D1/products` com o corpo de preço, quantidade, desconto e frequência (S1, AC 9)
Proof: run unit | ok S1.9 deal product create posts the product line

**C10** - `dealProductV2` `getMany`, `update` e `delete` chamam `GET /deals/D1/products`, `PUT /deals/D1/products/X1` e `DELETE /deals/D1/products/X1` (S1, AC 10)
Proof: run unit | ok S1.10 deal product list update and delete routes

**C11** - Na versão 2 os IDs dos recursos novos são `resourceLocator` com modos `list` e `id`, e cada `searchListMethod` existe em `listSearch` (S1, AC 11)
Proof: run unit | ok S1.11 new ID fields are locators backed by existing searches

**C12** - Locator de `leadId` vazio lança `NodeOperationError` `The 'Lead' parameter is empty [item 0]` (S1, AC 12)
Proof: run unit | ok S1.12 empty lead locator fails with a guiding message

**C13** - Todo parâmetro de `origin/master` mantém `name` e `type` nas versões 1 e 2 (S1, AC 13)
Proof: run unit | ok S1.13 existing parameters keep name and type

### S2 - webhooks v2 e trigger OAuth2

**C14** - `webhookV2` `create` chama `POST /webhooks` com `event_name`, `http_method` `POST`, `url` e, quando dados, `auth_header` e `auth_key` (S2, AC 1)
Proof: run unit | ok S2.1 webhook create posts the v2 body

**C15** - `webhookV2` `get`, `getMany`, `update` e `delete` chamam as rotas `/webhooks` (S2, AC 2)
Proof: run unit | ok S2.2 webhook get list update and delete routes

**C16** - O trigger lista em `eventsV2` os 38 eventos da OpenAPI (S2, AC 3)
Proof: run unit | ok S2.3 trigger lists the 38 v2 events

**C17** - O trigger declara as duas credenciais por `authentication`, padrão `accessToken`, e mantém `events` com 23 valores (S2, AC 4)
Proof: run unit | ok S2.4 trigger credentials follow authentication and events stay

**C18** - `create` com OAuth2 cria só o webhook que falta e guarda os ids por URL (S2, AC 5)
Proof: run unit | ok S2.5 create posts only the missing event and remembers ids by url

**C19** - `checkExists` nunca apaga webhook de outra URL (S2, AC 6)
Proof: run unit | ok S2.6 checkExists never deletes a webhook of another url

**C20** - `checkExists` apaga o webhook da URL cujo evento saiu da seleção ou repetido, e devolve `false` se falta evento e `true` se todos existem (S2, AC 7)
Proof: run unit | ok S2.7 checkExists removes stale and duplicate webhooks of its own url

**C21** - `delete` apaga só os ids da URL do modo, trata `404` como apagado e mantém o id em outro erro (S2, AC 8)
Proof: run unit | ok S2.8 delete removes only its own ids and keeps them on failure

**C22** - Com `accessToken` o trigger faz as mesmas chamadas v1 de hoje (S2, AC 9)
Proof: run unit | ok S2.9 token mode keeps the v1 calls

**C23** - O trigger emite o corpo que a RD entrega (S2, AC 10)
Proof: run unit | ok S2.10 trigger emits the delivered body

### S3 - criar e atualizar, produtos, campanhas, reuniões, propostas, equipes

**C24** - `pipelineV2` `create` e `update` chamam `POST /pipelines` e `PUT /pipelines/P1` (S3, AC 1)
Proof: run unit | ok S3.1 pipeline create and update

**C25** - `stageV2` `create` e `update` chamam `POST /pipelines/P1/stages` e `PUT /pipelines/P1/stages/S2` (S3, AC 2)
Proof: run unit | ok S3.2 stage create and update

**C26** - `sourceV2` e `lostReasonV2` `create` e `update` chamam as rotas de escrita com os campos (S3, AC 3)
Proof: run unit | ok S3.3 source and lost reason create and update

**C27** - `productV2` `create`, `get`, `getMany` e `update` chamam `/products` (S3, AC 4)
Proof: run unit | ok S3.4 product create get list and update

**C28** - `campaignV2` `create`, `get`, `getMany` e `update` chamam `/campaigns` (S3, AC 5)
Proof: run unit | ok S3.5 campaign create get list and update

**C29** - `meetingV2` `create` manda `starts_at` em ISO UTC e `contact_ids` em lista; `get`, `getMany` e `update` chamam `/meetings` (S3, AC 6)
Proof: run unit | ok S3.6 meeting create normalizes date and contacts

**C30** - `proposalV2` `create`, `getMany` e `get` chamam `/deals/D1/proposals` com as seções em JSON (S3, AC 7)
Proof: run unit | ok S3.7 proposal create list and get

**C31** - `sections` que não é lista JSON falha antes de qualquer requisição (S3, AC 8)
Proof: run unit | ok S3.8 proposal sections must be a JSON list

**C32** - `teamV2` `get` e `getMany` chamam `/teams` (S3, AC 9)
Proof: run unit | ok S3.9 team get and getMany

**C33** - `meetingId`, `campaignId`, `productId` e `teamId` dos recursos novos são locators com listas existentes (S3, AC 10)
Proof: run unit | ok S3.10 meeting campaign product and team locators

### S4 - segmentos, anexos, disponibilidade e ligações

**C34** - `segmentV2` `create`, `get`, `getMany` e `update` chamam `/segments` (S4, AC 1)
Proof: run unit | ok S4.1 segment create get list and update

**C35** - `dealFileV2` `getMany` e `delete` chamam `/deals/D1/files` e `/deals/D1/files/F1` (S4, AC 2)
Proof: run unit | ok S4.2 deal file list and delete

**C36** - `dealFileV2` `upload` envia `multipart/form-data` com o arquivo em `data[file]` e `timeout` 30000 (S4, AC 3)
Proof: run unit | ok S4.3 deal file upload sends multipart data

**C37** - `upload` sem binário falha antes de qualquer requisição (S4, AC 4)
Proof: run unit | ok S4.4 deal file upload without binary fails first

**C38** - `userV2` disponibilidade chama `/users/U1/meeting_availability` e `/users/meeting_availability` (S4, AC 5)
Proof: run unit | ok S4.5 user meeting availability routes

**C39** - `dialerCallV2` `get` e `getMany` chamam `/dialer_calls` (S4, AC 6)
Proof: run unit | ok S4.6 dialer call get and getMany

### S5 - lançamento

**C40** - O `CHANGELOG.md` tem `## 2.5.0` com as rotas novas e o trigger OAuth2 (S5, AC 1)
Proof: run unit | ok S5.1 changelog documents the new v2 routes

**C41** - O `README.md` lista os recursos novos da v2 e os 38 eventos do trigger OAuth2 (S5, AC 2)
Proof: run unit | ok S5.2 readme documents the new resources and events

**C42** - Lint, typecheck e build saem com código 0 (S5, AC 3)
Proof: `npm run lint && npx tsc --noEmit && npm run build 2>&1 | tail -1`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| recursos novos do node (16) - leadV2, pipelineV2, stageV2, sourceV2, lostReasonV2, userV2, teamV2, dealProductV2, webhookV2, productV2, campaignV2, meetingV2, proposalV2, segmentV2, dealFileV2, dialerCallV2 | lead C1-C4 · pipeline C5 C24 · stage C6 C25 · source C7 C26 · lostReason C7 C26 · user C8 C38 · team C32 · dealProduct C9 C10 · webhook C14 C15 · product C27 · campaign C28 · meeting C29 · proposal C30 · segment C34 · dealFile C35 C36 · dialerCall C39 | - |
| lista `eventsV2` do trigger (1) | os 38 valores em C16 | - |
| modos do trigger (2) | oauth2 C18-C21 · accessToken C22 | - |
| IDs com locator (14) - leadId, pipelineId, stageId, sourceId, lossReasonId, userId, dealProductId, meetingId, campaignId, productId, teamId, segmentId, dialerCallId, webhookId | leadId C11 C2 C12 · pipelineId C11 · stageId C11 · sourceId C11 · lossReasonId C11 · userId C11 · dealProductId C11 · meetingId C33 · campaignId C33 · productId C33 · teamId C33 · segmentId C34 · dialerCallId C39 · webhookId C15 | - |
| node `rdStationCrm` statuses (2) | 200 C1 · erro 4xx vira `NodeApiError` C1 | - |
| trigger statuses (2) | 200 C23 · 401 da RD na criação C18 | - |

- Claims naming a status code, route or response shape: C1-C10, C14-C15, C18-C21, C24-C39 - each proof crosses the boundary by calling the real `execute` or `webhookMethods` with a fake HTTP responder

## Swept

- validation: C12, C31, C37
- failure modes: C21, C37
- idempotency: C18, C20
- authorization: n/a - a credencial OAuth2 é do n8n; a recusa `401` da RD sobe como `NodeApiError` pelo `rdCrmV2Request` já existente
- concurrency: n/a - cada item do workflow roda isolado
- data lifecycle: C18, C21
- dependency failure: C21
- state transitions: n/a - o node não guarda estado
- observability: C21

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier (sonnet) enviado em HEAD 1a8cfd0
- **Boundary:** C1-C42 construídos e provados em HEAD
- **Abandoned:** nenhum
- **Walked:** sem tela; a conferência no editor do n8n fica para o dono
