# RD Station CRM: rotas novas da v1 e campos novos checks

Build: `npx tsc --noEmit`; `npm run lint`
Run unit: `node --test --test-reporter=tap test/*.test.cjs`
Plan: `.specs/features/rotas-novas-v1/plan.md`

## Intent

19 checks in 5 slices · 3 one-way doors · 0 open

## Checks

### S1 - rota em lote da v1 segue a doc

**C1** - Update em lote de Deal Product chama `PATCH /deals/d1/deal_products/batch/update` com `{deal_products:[{id:'P1',amount:2,price:15.1}]}` e sem os campos que a doc não lista (S1, AC 1)
Proof: run unit | ok v1 batch update sends PATCH to batch/update with only id amount and price

**C2** - Remove em lote chama `DELETE /deals/d1/deal_products/batch/destroy` com `{deal_products:[{id:'P1'},{id:'P2'}]}` e devolve `{deleted:true}` (S1, AC 2)
Proof: run unit | ok v1 batch remove sends DELETE to batch/destroy with deal_products ids

**C3** - Todo parâmetro visível da 2.4.0 mantém `name` e `type` na versão 1 (S1, AC 3)
Proof: run unit | ok v1 deal product keeps every parameter name and type of 2.4.0

### S2 - três operações novas em Deal Product

**C4** - `addOne` chama `POST /deals/d1/deal_products` com `product_id`, `amount`, `price`, `discount`, `discount_type`, `recurrence` (S2, AC 1)
Proof: run unit | ok v1 addOne posts a single deal product

**C5** - `updateOne` chama `PUT /deals/d1/deal_products/DP9` com corpo `{price:500}` (S2, AC 2)
Proof: run unit | ok v1 updateOne puts a single deal product

**C6** - `removeOne` chama `DELETE /deals/d1/deal_products/DP9` sem corpo e devolve `{deleted:true}` (S2, AC 3)
Proof: run unit | ok v1 removeOne deletes a single deal product

**C7** - `dealProductId` vazio em `updateOne` e em `removeOne` lança `NodeOperationError` sem requisição (S2, AC 4)
Proof: run unit | ok v1 single deal product operations reject an empty id

**C8** - As três requisições levam `timeout` 30000 (S2, AC 5)
Proof: run unit | ok v1 single deal product operations send a 30 s timeout

### S3 - campos novos da v1

**C9** - Contato create e update enviam `contact.legal_bases` com `category`, `type`, `status` (S3, AC 1)
Proof: run unit | ok v1 contact sends legal_bases on create and update

**C10** - Negociação create envia `distribution_settings.owner` com `type`, `id` e `email` (S3, AC 2)
Proof: run unit | ok v1 deal create sends distribution_settings owner

**C11** - Sem campo novo, contato e negociação v1 enviam o corpo da 2.4.0 (S3, AC 3)
Proof: run unit | ok v1 bodies stay unchanged without the new fields

### S4 - campos novos da v2

**C12** - Contato v2 envia `social_profiles` e `legal_bases` (S4, AC 1)
Proof: run unit | ok v2 contact sends social_profiles and legal_bases

**C13** - Campo personalizado v2 envia `application_scope`, `product_ids`, `calculation_action`, `editable_on_deal` (S4, AC 2)
Proof: run unit | ok v2 custom field sends product scope fields

**C14** - Campo personalizado v2 envia `display_rules` e `required_rules` (S4, AC 3)
Proof: run unit | ok v2 custom field sends display and required rules

**C15** - Negociação v2 envia `distribution_settings` com `stage_id` e `rule` (S4, AC 4)
Proof: run unit | ok v2 deal sends distribution_settings

**C16** - Empresa v2 envia `address` e `follower_ids` (S4, AC 5)
Proof: run unit | ok v2 organization sends address and follower_ids

**C17** - Sem campo novo, os corpos v2 são os da 2.4.0 (S4, AC 6)
Proof: run unit | ok v2 bodies stay unchanged without the new fields

### S5 - lançamento 2.5.0

**C18** - `package.json` 2.5.0, `CHANGELOG.md` com `## 2.5.0` e `STATE.md` com AD-007 (S5, AC 1, AC 2)
Proof: run unit | ok release 2.5.0 is documented in the changelog

**C19** - lint, testes, tsc e build saem com 0 (S5, AC 3)
Proof: `npm run lint && npm test --silent | grep -q '^# fail 0' && npx tsc --noEmit && npm run build`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| rotas de Deal Product na Surface (5) | `PATCH /deals/{deal_id}/deal_products/batch/update` C1 · `DELETE /deals/{deal_id}/deal_products/batch/destroy` C2 · `POST /deals/{deal_id}/deal_products` C4 · `PUT /deals/{deal_id}/deal_products/{deal_product_id}` C5 · `DELETE /deals/{deal_id}/deal_products/{deal_product_id}` C6 | - |
| campos novos v1 (2) | `legal_bases` C9 · `distribution_settings` C10 | - |
| campos novos v2 (11) | `social_profiles` C12 · `legal_bases` C12 · `application_scope` C13 · `product_ids` C13 · `calculation_action` C13 · `editable_on_deal` C13 · `display_rules` C14 · `required_rules` C14 · `distribution_settings` C15 · `address` C16 · `follower_ids` C16 | - |
| operações novas (3) | addOne C4 · updateOne C5 · removeOne C6 | - |

## Swept

- validation: C7
- failure modes: existing - `rdCrmApiRequest` transforma erro da RD em `NodeApiError`
- idempotency: n/a - o node repassa a requisição; a RD decide
- authorization: existing - credencial v1 no `rdCrmApiRequest`; `401` volta como `NodeApiError`
- concurrency: n/a - cada item roda em sequência
- data lifecycle: C11, C17
- dependency failure: C8
- state transitions: n/a - sem estado no node
- observability: n/a - sem requisito de log nesta fatia

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier (sonnet) at HEAD d8eea70
- **Boundary:** C1-C19 closed at d8eea70
- **Abandoned:** none
