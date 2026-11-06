# node-cli e campos guiados (versão 2 do node) verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 19c9dda
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `toolchain.test.cjs` `build generates both nodes, both credentials and the icons` | no - only checks the files exist in `dist`; the `run unit` command does not build, so a stale `dist` passes (F4) |
| C2 | `npm run lint` | yes |
| C3 | `toolchain.test.cjs` `package.json follows the node-cli template` | yes |
| C4 | `toolchain.test.cjs` `ci workflow runs install, lint, test and build on pull requests` | no - `ci.includes(step)` also matches a comment or a disabled step (F4) |
| C5 | `npm test 2>&1 \| grep -q '^# fail 0'` | yes |
| C6 | `v1-compat.test.cjs` `version 1 contact get calls GET /contacts/abc123` | yes |
| C7 | `v1-compat.test.cjs` `version 1 deal moveToStage calls PUT /deals/d1` | yes |
| C8 | `v1-compat.test.cjs` `version 1 keeps every parameter name and type of 2.3.2` | no - checks a set of pares nome e tipo pairs visible anywhere, not tied to resource and operation (F4) |
| C9 | `resource-locator.test.cjs` `node defaults to version 2 and still lists version 1` | yes |
| C10 | `resource-locator.test.cjs` `version 2 exposes every guided ID field as a resourceLocator` | yes |
| C11 | `resource-locator.test.cjs` `version 2 list mode reads the contact ID` | yes |
| C12 | `resource-locator.test.cjs` `version 2 id mode trims the pasted ID` | yes |
| C13 | `resource-locator.test.cjs` `version 2 empty locator fails with a guiding message` | yes |
| C14 | `list-search.test.cjs` `listSearch filters by the typed text` | yes |
| C15 | `resource-locator.test.cjs` `every searchListMethod exists in listSearch` | no - checks the name exists, not that the field points at the right list (v1 or v2) (F5) |
| C16 | `resource-locator.test.cjs` `every guided field reads its locator value in execute` | yes |
| C17 | `resource-locator.test.cjs` `a 401 from RD becomes a NodeApiError` | yes |
| C18 | `list-search.test.cjs` `listSearch sends the search text to RD where the route filters` | yes |
| C19 | `trigger.test.cjs` `trigger delete logs a failed removal and keeps going` | yes |
| C20 | `release.test.cjs` `release 2.4.0 is documented in the changelog` | yes |
| C21 | `release.test.cjs` `publish workflow keeps the v tag trigger and provenance` | yes |
| C22 | `npm run lint` | yes |
| C23 | `list-search.test.cjs` `listSearch quotes RDQL text that has spaces` | yes - exact equality on `name:~"Ana Lima"` fails if `~` or the quotes go; inner quotes stripped; no-space form `name:~ana` covered by C18; see F6 for blank-text edge |
| C24 | `list-search.test.cjs` `listSearch pages tasks one page at a time` | yes - one request per call, `page`/`limit`, token `2` and page 2 on the next call (v1), `links.next` token and no filter (v2); a loop over all pages would fail on `requests.length` |
| C25 | `toolchain.test.cjs` `publish workflow stages the package instead of publishing it` | yes - reads only `run:` lines, so a comment quoting the command does not count; fails if no `npm@12.2.2 stage publish ... --provenance` step exists, and fails if any `npm publish` step comes back; the same-Node-as-CI part of the claim is held by `publish workflow uses the same Node version as the ci workflow` (judged by the orchestrator, not the author of C25) |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 (alta) `getStages` lê `pipelineId` como texto, mas na versão 2 ele é um Resource Locator: o objeto `{ mode, value }` vai como `deal_pipeline_id` | `nodes/RdStationCrm/methods/loadOptions.ts:63` e `searchStages` em `methods/listSearch.ts`; sonda com `pipelineId = { mode: 'list', value: 'p1' }` enviou `qs.deal_pipeline_id = {"mode":"list","value":"p1"}`; com o padrão `{ mode: 'list', value: '' }` o objeto vazio também é truthy e filtra a lista por lixo | em `getStages` ler `value` do locator (e usar texto na versão 1), e provar com teste de `searchStages` e do dropdown de etapa com locator cheio e vazio | 76cb85f (plainId + teste searchStages) |
| F2 (média) A maioria do `listSearch` não tem teste de comportamento: `searchStages`, `searchWebhooks`, `searchTasks`, `searchTasksV2`, `searchCustomFields`, `searchCustomFieldsV2`, `searchUsers`, `searchTeams` e as demais | C14 só chama `searchOrganizations`; C15 só confere que o nome existe. `searchWebhooks` (nome `evento (url)`, `uuid` ou `id`) e `searchTasks` (campo `subject`, `name` na v2) não têm nenhuma asserção | testes que chamam cada método com a resposta falsa e afirmam `{ name, value }` e o filtro | 76cb85f (teste de cada método do listSearch) |
| F3 (baixa) Paginação do `listSearch` sem teste: `paginationToken`, regra `has_more` ou `items.length === 50`, e `links.next` da v2 | C18 afirma só o `qs` da primeira requisição; sonda: página cheia de 50 sem `has_more` devolve token `2`, e o token `3` vira `page: 3` | teste com página cheia, página parcial e token recebido nos dois transportes | 76cb85f (teste de paginação) |
| F4 (baixa) Asserções mais frouxas que o critério em C1, C4 e C8 | C1 `toolchain.test.cjs` só `existsSync` em `dist`; C4 `ci.includes(step)` aceita o texto em comentário; C8 compara um conjunto de pares pares nome e tipo sem resource e operation | C1 rodar o build antes de olhar `dist` (ou provar por `npm run build`); C4 ler o YAML e achar os passos em `run:`; C8 amarrar o par ao resource e à operation | 76cb85f (C4 e C1 apertados; C8 fica como guarda de pares, risco aceito) |
| F5 (baixa) Nenhum teste prende cada campo à lista certa (v1 ou v2) | C10 só exige `typeof searchListMethod === 'string'` e C15 só a existência; sonda manual: os 6 campos de recurso `V2` apontam para `*V2` e os demais para a lista v1, mas uma troca passaria verde | table-driven: resource -> `searchListMethod` esperado | 76cb85f (teste da lista certa por campo) |
| F6 (baixa) `rdqlContains` com texto só de espaços ou só de aspas manda filtro vazio `name:~` | sonda sobre `dist`: `searchContactsV2.call(ctx, '   ')`, `'""'` e `'"'` enviam `qs.filter = "name:~"`; o guarda `if (filter && filterable)` deixa passar `'   '` (truthy) e a RDQL fica sem valor, provável 400 da RD | em `pagedV2` aparar `filter` antes do teste (ou não enviar `filter` quando `rdqlContains` ficar sem valor) e provar com teste de `'   '` e `'""'` | 7f6863b (teste de texto em branco) |

Sondas fora do plano, rodadas sobre `dist` (descartáveis, em `/tmp/probe.cjs`): locator só com espaços lança o erro guiado; `value` numérico (`12345`) e `0` viram `/contacts/12345` e `/contacts/0`; `dealV2` no modo `id` com `' d9 '` chama `/deals/d9`; `noteV2` `getMany` vazio lança o erro guiado; filtro sem resultado devolve `{ results: [] }` e filtro `.*` não é tratado como regex; `value` `a/../b?x=1` no modo `id` vai cru para a rota (igual à 2.3.2 em texto, sem regressão).
