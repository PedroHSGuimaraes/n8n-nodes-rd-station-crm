# rotas-novas-v2 verification

**Verdict**: FAIL (round 1; all 10 findings closed by 271eebe, see Closed)
**Proofs**: `proofs.md` at 3d6143e (HEAD 0a76c35 só acrescenta `.specs/`; o `dist` foi refeito com `npm run build` antes dos exemplos)
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `v2-routes.test.cjs` `S1.1 lead create posts /leads with the data envelope` | yes - base, credencial, timeout e corpo inteiro com `deepEqual` |
| C2 | `v2-routes.test.cjs` `S1.2 lead get reads the locator and trims it` | yes |
| C3 | `v2-routes.test.cjs` `S1.3 lead update puts only the changed fields` | yes |
| C4 | `v2-routes.test.cjs` `S1.4 lead getMany sends the filter and the page size` | yes - `qs` com `deepEqual` |
| C5 | `v2-routes.test.cjs` `S1.5 pipeline get and getMany call the pipeline routes` | yes |
| C6 | `v2-routes.test.cjs` `S1.6 stage get and getMany are nested under the pipeline` | yes |
| C7 | `v2-routes.test.cjs` `S1.7 source and lost reason read routes` | yes |
| C8 | `v2-routes.test.cjs` `S1.8 user get and getMany call the user routes` | yes |
| C9 | `v2-routes.test.cjs` `S1.9 deal product create posts the product line` | yes - corpo inteiro, enum `percentage` e `monthly` bate com a OpenAPI |
| C10 | `v2-routes.test.cjs` `S1.10 deal product list update and delete routes` | yes |
| C11 | `v2-routes.test.cjs` `S1.11 new ID fields are locators backed by existing searches` | yes - confere tipo, modos, padrão `list`, nome da busca e que ela existe |
| C12 | `v2-routes.test.cjs` `S1.12 empty lead locator fails with a guiding message` | yes - classe e mensagem; só o lead, os outros 13 locators não são provados |
| C13 | `v2-routes.test.cjs` `S1.13 existing parameters keep name and type` | yes - a claim fixa só `name` e `type`, e o teste os compara por recurso, operação e versão; `options`, `default` e `required` ficam soltos (achado 8) |
| C14 | `webhooks-v2.test.cjs` `S2.1 webhook create posts the v2 body` | yes |
| C15 | `webhooks-v2.test.cjs` `S2.2 webhook get list update and delete routes` | yes |
| C16 | `webhooks-v2.test.cjs` `S2.3 trigger lists the 38 v2 events` | yes - lista copiada da doc; conferi: os 38 valores batem com o enum da OpenAPI de `POST /webhooks` |
| C17 | `webhooks-v2.test.cjs` `S2.4 trigger credentials follow authentication and events stay` | no - de `events` só conta 23 itens, não compara os valores com `origin/master` (o `constants.ts` não mudou, então hoje está certo) |
| C18 | `webhooks-v2.test.cjs` `S2.5 create posts only the missing event and remembers ids by url` | yes - 1 POST só, corpo, credencial, static data por URL |
| C19 | `webhooks-v2.test.cjs` `S2.6 checkExists never deletes a webhook of another url` | yes - o webhook de outra URL tem o mesmo evento selecionado (Z) e outro evento (Y); remover o filtro por URL faz o teste falhar |
| C20 | `webhooks-v2.test.cjs` `S2.7 checkExists removes stale and duplicate webhooks of its own url` | yes - confere B e C apagados, A não, `false` e `true` |
| C21 | `webhooks-v2.test.cjs` `S2.8 delete removes only its own ids and keeps them on failure` | yes - o webhook do modo teste fica intacto; 404 sai da memória; 500 fica. Falha parcial (um 500 e um 404 juntos) só passei por exemplo próprio (E8) |
| C22 | `webhooks-v2.test.cjs` `S2.9 token mode keeps the v1 calls` | no - prova só `create` (GET e POST); `checkExists` e `delete` no modo token não são afirmados aqui (o `delete` v1 está em `trigger.test.cjs`, com stub que devolve o padrão) |
| C23 | `webhooks-v2.test.cjs` `S2.10 trigger emits the delivered body` | yes |
| C24 | `v2-routes.test.cjs` `S3.1 pipeline create and update` | yes |
| C25 | `v2-routes.test.cjs` `S3.2 stage create and update` | yes |
| C26 | `v2-routes.test.cjs` `S3.3 source and lost reason create and update` | yes |
| C27 | `v2-routes.test.cjs` `S3.4 product create get list and update` | yes |
| C28 | `v2-routes.test.cjs` `S3.5 campaign create get list and update` | yes |
| C29 | `v2-routes.test.cjs` `S3.6 meeting create normalizes date and contacts` | yes - `.000Z` e lista; data inválida não coberta (achado 5) |
| C30 | `v2-routes.test.cjs` `S3.7 proposal create list and get` | yes |
| C31 | `v2-routes.test.cjs` `S3.8 proposal sections must be a JSON list` | yes - objeto e texto inválido, com `sent === false` |
| C32 | `v2-routes.test.cjs` `S3.9 team get and getMany` | yes |
| C33 | `v2-routes.test.cjs` `S3.10 meeting campaign product and team locators` | yes - só checa que a busca existe como função, não que ela chama a rota certa (cobertura de rota está em `list-search-coverage.test.cjs`) |
| C34 | `v2-routes.test.cjs` `S4.1 segment create get list and update` | yes |
| C35 | `v2-routes.test.cjs` `S4.2 deal file list and delete` | yes |
| C36 | `v2-routes.test.cjs` `S4.3 deal file upload sends multipart data` | yes - FormData, `data[file]`, nome, tipo, conteúdo, timeout; o transporte real do n8n não é exercido (achado 6) |
| C37 | `v2-routes.test.cjs` `S4.4 deal file upload without binary fails first` | yes - `sent === false` |
| C38 | `v2-routes.test.cjs` `S4.5 user meeting availability routes` | yes |
| C39 | `v2-routes.test.cjs` `S4.6 dialer call get and getMany` | yes |
| C40 | `docs-v2.test.cjs` `S5.1 changelog documents the new v2 routes` | yes - presença de 5 palavras na seção; frouxo (achado 9) |
| C41 | `docs-v2.test.cjs` `S5.2 readme documents the new resources and events` | yes - 16 recursos em negrito, `38` e 4 eventos; frouxo (achado 9) |
| C42 | `npm run lint && npx tsc --noEmit && npm run build` | yes - prova é o comando, `proofs.md` mostra saída 0; rodei `npm run build` e saiu verde |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| 1. Lead `create`: a doc diz que `owner_id` ausente dá 422 e que `status` na criação só aceita `ongoing`; o node trata `owner_id` como campo opcional e oferece `converted` e `discarded` na criação | `crm-v2-create-lead.md` ("Erros comuns": `name` ou `owner_id` ausentes; "Na criação, `status` só aceita `ongoing`"); `actions/v2/resources.ts:72` e `:81`; o teste C1 cria lead sem `owner_id` | pôr `owner_id` como campo de topo obrigatório na criação do lead (ou dizer na descrição que a RD exige) e tirar `converted` e `discarded` das opções da criação; ajustar C1 para mandar `owner_id` |  271eebe - owner_id obrigatório e status só ongoing na criação; prova C43 (C1 ajustado para mandar owner_id) |
| 2. Texto do campo de ID quebrado em 32 parâmetros: `Unique identifier of the ,, taken from a create or list operation` (falta o nome do recurso) | `actions/v2/resourceFactory.ts:235`; `node -e` listando `description` de `leadId` mostra o `,,` na versão string e no locator | trocar `the ,,` por `the ${spec.label.toLowerCase()}`; acrescentar uma asserção que recuse `,,` nas descrições |  271eebe - descrição volta a usar o nome do recurso; prova C44 |
| 3. Nenhum teste prende a paginação da lista de webhooks do trigger: o responder falso devolve sempre `links: {}`. Se `ownWebhooks` passar a ler só a página 1, webhook velho da própria URL na página 2 não é apagado e `create` duplica evento; todos os testes seguem verdes | `test/webhooks-v2.test.cjs:55` (`links: {}`); `webhooksV2.ts:29-33`. Exemplo próprio E5 (página 1 só com webhook de outra URL, página 2 com `A` e um velho `S`): hoje apaga só `S`, nunca o da outra URL | acrescentar teste com `links.next` em `checkExists` e `create`, com webhook alheio na página 1 e velho da própria URL na página 2 |  271eebe - teste com links.next e webhook alheio na página 1; prova C45 |
| 4. `rdCrmV2Multipart` e `new FormData()` global nunca passam pelo transporte real do n8n; só o responder falso os recebe. Se o `n8n-core` não aceitar o `FormData` global (ele usa o pacote `form-data` em alguns caminhos), o upload quebra em produção com o teste verde | `transport/v2.ts:92-120`, `actions/v2/resources.ts:386`; `n8n-core` não está em `node_modules`, então não deu para confirmar aqui | testar o upload uma vez numa instância n8n real e registrar o resultado no STATE; se falhar, usar o pacote `form-data` |  271eebe - o n8n-core só reconhece o FormData do pacote form-data (request-helper-functions.js, instanceof form_data); o upload agora monta o multipart em Buffer com Content-Type e boundary no cabeçalho, caminho que o n8n-core aceita; prova C36. Teste numa instância n8n real fica para o dono (registrado no relatório) |
| 5. Entrada inválida cai em erro pouco claro ou em efeito silencioso: `starts_at` inválida (`amanha`) vira `NodeOperationError: Invalid time value`; `contact_ids` `,` vira `[]` e, no `update`, apagaria os contatos da lead ou reunião | exemplos próprios E3 e E2; `resourceFactory.ts:346` e `:325-331` | validar a data e lançar `The 'Starts At' field is not a valid date`; tratar lista vazia no `update` como "não enviar" |  271eebe - data inválida lança NodeOperationError e lista só de vírgulas não vai no corpo; prova C46 |
| 6. `limit` sem teto: a doc de listagem limita a página a 200, o node manda `page[size]` 500 (exemplo E6). A mesma falha já existe em `TaskV2.ts:218`, então não é regressão | `resourceFactory.ts:466`; `crm-v2-list-leads.md` ("no máximo 200") | `typeOptions: { minValue: 1, maxValue: 200 }` no `limit` da fábrica |  271eebe - limit com maxValue 200 nas listagens novas; prova C47 |
| 7. Risco de duplicar webhook se a RD normalizar a URL (barra final, caixa): `ownWebhooks` compara com `===`, não acha o webhook, `checkExists` devolve `false` e `create` posta de novo a cada ativação (exemplo E7). Isso fica do lado seguro da regra principal (nunca apaga de outra URL), mas deixa webhook órfão | `webhooksV2.ts:31` | comparar a URL sem barra final e em minúsculas no host; ou aceitar e documentar o risco |  271eebe - URL comparada sem barra final e com host em minúsculas; prova C48 |
| 8. Os testes de compatibilidade da v1 e do trigger salvo são magros: `C13` compara só nome e tipo, `C17` só conta os 23 eventos; uma troca de `options`, `default` ou `required` de parâmetro antigo não faz nada falhar | `v2-routes.test.cjs` `S1.13`; `webhooks-v2.test.cjs` `S2.4`; `test/fixtures/params-origin-master.json` | guardar também o `default` e a lista de valores de `options` no snapshot e compará-los; comparar os 23 valores de `events` com `origin/master` |  271eebe - S2.4 compara os 23 valores de events e S2.9 cobre checkExists e delete no modo token (C17, C22). O snapshot de name e type (C13) não ganhou default e options de propósito: o PR da v1 (#5) muda options de campos v2 existentes e um snapshot estrito acusaria a mudança legítima dele |
| 9. Testes de documentação por presença de palavra: `Lead`, `Trigger`, `38` passam mesmo sem Segment, Webhook ou Dialer Call no CHANGELOG | `docs-v2.test.cjs:14-17` | exigir os 16 nomes de recurso também na seção `## 2.5.0`, ou aceitar como lembrete |  271eebe - o teste do CHANGELOG exige os 16 nomes de recurso e o do README confere as operações de Deal File, Proposal, User e Webhook; prova C40 e C41 |
| 10. `deal_product_custom_fields` existe na OpenAPI de `POST /deals/{id}/products` e a tabela de premissas do plano diz "Campo JSON", mas o código não o implementa e o plano não o lista em "Out of scope"; também sobra o comentário velho "nesta fatia só leitura" em `pipelineSpec` | `grep deal_product_custom_fields nodes` sem resultado; `plan.md` Assumptions; `actions/v2/resources.ts:87` | implementar o campo JSON na linha de produto, ou mover a linha para "Out of scope"; apagar o comentário velho |  271eebe - deal_product_custom_fields implementado como JSON lista; comentário velho removido; prova C49 |

Provado sem achado: a regra principal do trigger. Em todos os exemplos (E1, E5, E7, E8) o único `DELETE` saiu para webhook da URL do próprio modo; webhook de outra URL, de URL com barra final e sem `url` nunca foi apagado. `delete` só toca os ids guardados para a URL do modo. A regressão da v1 (menu `resource` do token com 16 opções, `events` com os 23 valores, trigger v1 sem o parâmetro `authentication`) segue igual. Os 38 eventos e as rotas e métodos dos 60 endpoints novos batem com a OpenAPI oficial; não achei campo, rota ou enum que o código mande e a doc não tenha.
