# rotas-novas-v1 proofs

**HEAD**: a7d7b42
**Tree**: clean
**Shell**: /bin/sh
**Result**: 21 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ok v1 batch update sends PATCH to batch/update with only id amount and price` | pass |
| C2 | `run unit / ok v1 batch remove sends DELETE to batch/destroy with deal_products ids` | pass |
| C3 | `run unit / ok v1 deal product keeps every parameter name and type of 2.4.0` | pass |
| C4 | `run unit / ok v1 addOne posts a single deal product` | pass |
| C5 | `run unit / ok v1 updateOne puts a single deal product` | pass |
| C6 | `run unit / ok v1 removeOne deletes a single deal product` | pass |
| C7 | `run unit / ok v1 single deal product operations reject an empty id` | pass |
| C8 | `run unit / ok v1 single deal product operations send a 30 s timeout` | pass |
| C9 | `run unit / ok v1 contact sends legal_bases on create and update` | pass |
| C10 | `run unit / ok v1 deal create sends distribution_settings owner` | pass |
| C11 | `run unit / ok v1 bodies stay unchanged without the new fields` | pass |
| C12 | `run unit / ok v2 contact sends social_profiles and legal_bases` | pass |
| C13 | `run unit / ok v2 custom field sends product scope fields` | pass |
| C14 | `run unit / ok v2 custom field sends display and required rules` | pass |
| C15 | `run unit / ok v2 deal sends distribution_settings` | pass |
| C16 | `run unit / ok v2 organization sends address and follower_ids` | pass |
| C17 | `run unit / ok v2 bodies stay unchanged without the new fields` | pass |
| C18 | `run unit / ok release 2.5.0 is documented in the changelog` | pass |
| C19 | `npm run lint && npm test --silent / grep -q '^# fail 0' && npx tsc --noEmit && npm run build` | pass |
| Build | `npx tsc --noEmit` | pass |
| Build | `npm run lint` | pass |

## Output

`Run unit` - exit 0

```
    1..4
ok 12 - version 1
  ---
  duration_ms: 8.681248
  type: 'suite'
  ...
1..12
# tests 52
# suites 12
# pass 52
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 919.560574
```

`npm run lint && npm test --silent / grep -q '^# fail 0' && npx tsc --noEmit && npm run build` - exit 0

```
> n8n-nodes-rd-station-crm@2.5.0 lint
> n8n-node lint

┌   n8n-node lint  v0.55.5

> n8n-nodes-rd-station-crm@2.5.0 build
> n8n-node build

┌   n8n-node build  v0.55.5
│
◒  Building TypeScript files◐  Building TypeScript files◓  Building TypeScript files◑  Building TypeScript files◒  Building TypeScript files◐  Building TypeScript files◓  Building TypeScript files◑  Building TypeScript files◒  Building TypeScript files.◐  Building TypeScript files.◓  Building TypeScript files.◑  Building TypeScript files.◒  Building TypeScript files.◐  Building TypeScript files.◓  Building TypeScript files.◑  Building TypeScript files.◒  Building TypeScript files..◐  Building TypeScript files..◓  Building TypeScript files..◇  TypeScript build successful
│
◇  Copied static files
│
└  ✓ Build successful
```
