# rotas-novas-v2 proofs

**HEAD**: 271eebe
**Tree**: clean
**Shell**: /bin/sh
**Result**: 51 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ok S1.1 lead create posts /leads with the data envelope` | pass |
| C2 | `run unit / ok S1.2 lead get reads the locator and trims it` | pass |
| C3 | `run unit / ok S1.3 lead update puts only the changed fields` | pass |
| C4 | `run unit / ok S1.4 lead getMany sends the filter and the page size` | pass |
| C5 | `run unit / ok S1.5 pipeline get and getMany call the pipeline routes` | pass |
| C6 | `run unit / ok S1.6 stage get and getMany are nested under the pipeline` | pass |
| C7 | `run unit / ok S1.7 source and lost reason read routes` | pass |
| C8 | `run unit / ok S1.8 user get and getMany call the user routes` | pass |
| C9 | `run unit / ok S1.9 deal product create posts the product line` | pass |
| C10 | `run unit / ok S1.10 deal product list update and delete routes` | pass |
| C11 | `run unit / ok S1.11 new ID fields are locators backed by existing searches` | pass |
| C12 | `run unit / ok S1.12 empty lead locator fails with a guiding message` | pass |
| C13 | `run unit / ok S1.13 existing parameters keep name and type` | pass |
| C14 | `run unit / ok S2.1 webhook create posts the v2 body` | pass |
| C15 | `run unit / ok S2.2 webhook get list update and delete routes` | pass |
| C16 | `run unit / ok S2.3 trigger lists the 38 v2 events` | pass |
| C17 | `run unit / ok S2.4 trigger credentials follow authentication and events stay` | pass |
| C18 | `run unit / ok S2.5 create posts only the missing event and remembers ids by url` | pass |
| C19 | `run unit / ok S2.6 checkExists never deletes a webhook of another url` | pass |
| C20 | `run unit / ok S2.7 checkExists removes stale and duplicate webhooks of its own url` | pass |
| C21 | `run unit / ok S2.8 delete removes only its own ids and keeps them on failure` | pass |
| C22 | `run unit / ok S2.9 token mode keeps the v1 calls` | pass |
| C23 | `run unit / ok S2.10 trigger emits the delivered body` | pass |
| C24 | `run unit / ok S3.1 pipeline create and update` | pass |
| C25 | `run unit / ok S3.2 stage create and update` | pass |
| C26 | `run unit / ok S3.3 source and lost reason create and update` | pass |
| C27 | `run unit / ok S3.4 product create get list and update` | pass |
| C28 | `run unit / ok S3.5 campaign create get list and update` | pass |
| C29 | `run unit / ok S3.6 meeting create normalizes date and contacts` | pass |
| C30 | `run unit / ok S3.7 proposal create list and get` | pass |
| C31 | `run unit / ok S3.8 proposal sections must be a JSON list` | pass |
| C32 | `run unit / ok S3.9 team get and getMany` | pass |
| C33 | `run unit / ok S3.10 meeting campaign product and team locators` | pass |
| C34 | `run unit / ok S4.1 segment create get list and update` | pass |
| C35 | `run unit / ok S4.2 deal file list and delete` | pass |
| C36 | `run unit / ok S4.3 deal file upload sends multipart data` | pass |
| C37 | `run unit / ok S4.4 deal file upload without binary fails first` | pass |
| C38 | `run unit / ok S4.5 user meeting availability routes` | pass |
| C39 | `run unit / ok S4.6 dialer call get and getMany` | pass |
| C40 | `run unit / ok S5.1 changelog documents the new v2 routes` | pass |
| C41 | `run unit / ok S5.2 readme documents the new resources and events` | pass |
| C42 | `npm run lint && npx tsc --noEmit && npm run build 2>&1 / tail -1` | pass |
| C43 | `run unit / ok F1 lead create requires the owner and only offers the ongoing status` | pass |
| C44 | `run unit / ok F2 no description has a broken placeholder` | pass |
| C45 | `run unit / ok F3 checkExists and create read every page of the webhook list` | pass |
| C46 | `run unit / ok F5 invalid dates fail clearly and an empty list sends nothing` | pass |
| C47 | `run unit / ok F6 the page size is capped at 200` | pass |
| C48 | `run unit / ok F7 the webhook url is compared without trailing slash or host case` | pass |
| C49 | `run unit / ok F10 deal product accepts custom fields as a JSON list` | pass |
| Build | `npx tsc --noEmit` | pass |
| Build | `npm run lint` | pass |

## Output

`Run unit` - exit 0

```
    1..12
ok 15 - S2 webhooks v2 and the OAuth2 trigger
  ---
  duration_ms: 8.193338
  type: 'suite'
  ...
1..15
# tests 79
# suites 15
# pass 79
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 984.113724
```

`npm run lint && npx tsc --noEmit && npm run build 2>&1 / tail -1` - exit 0

```
> n8n-nodes-rd-station-crm@2.4.0 lint
> n8n-node lint

┌   n8n-node lint  v0.55.5
```
