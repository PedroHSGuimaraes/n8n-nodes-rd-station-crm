# node-cli-campos-v2 proofs

**HEAD**: 9141858
**Tree**: clean
**Shell**: /bin/sh
**Result**: 24 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ok build generates both nodes, both credentials and the icons` | pass |
| C2 | `npm run lint` | pass |
| C3 | `run unit / ok package.json follows the node-cli template` | pass |
| C4 | `run unit / ok ci workflow runs install, lint, test and build on pull requests` | pass |
| C5 | `npm test 2>&1 / grep -q '^# fail 0'` | pass |
| C6 | `run unit / ok version 1 contact get calls GET /contacts/abc123` | pass |
| C7 | `run unit / ok version 1 deal moveToStage calls PUT /deals/d1` | pass |
| C8 | `run unit / ok version 1 keeps every parameter name and type of 2.3.2` | pass |
| C9 | `run unit / ok node defaults to version 2 and still lists version 1` | pass |
| C10 | `run unit / ok version 2 exposes every guided ID field as a resourceLocator` | pass |
| C11 | `run unit / ok version 2 list mode reads the contact ID` | pass |
| C12 | `run unit / ok version 2 id mode trims the pasted ID` | pass |
| C13 | `run unit / ok version 2 empty locator fails with a guiding message` | pass |
| C14 | `run unit / ok listSearch filters by the typed text` | pass |
| C15 | `run unit / ok every searchListMethod exists in listSearch` | pass |
| C16 | `run unit / ok every guided field reads its locator value in execute` | pass |
| C17 | `run unit / ok a 401 from RD becomes a NodeApiError` | pass |
| C18 | `run unit / ok listSearch sends the search text to RD where the route filters` | pass |
| C19 | `run unit / ok trigger delete logs a failed removal and keeps going` | pass |
| C20 | `run unit / ok release 2.4.0 is documented in the changelog` | pass |
| C21 | `run unit / ok publish workflow keeps the v tag trigger and provenance` | pass |
| C22 | `npm run lint` | pass |
| Build | `npx tsc --noEmit` | pass |
| Build | `npm run lint` | pass |

## Output

`Run unit` - exit 0

```
    1..4
ok 8 - version 1
  ---
  duration_ms: 6.376918
  type: 'suite'
  ...
1..8
# tests 25
# suites 8
# pass 25
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 548.927329
```

`npm run lint` - exit 0

```
> n8n-nodes-rd-station-crm@2.4.0 lint
> n8n-node lint

┌   n8n-node lint  v0.55.5
```

`npm test 2>&1 / grep -q '^# fail 0'` - exit 0

```
(no output)
```
