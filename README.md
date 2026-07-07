# n8n-nodes-rd-station-crm

This is an [n8n](https://n8n.io/) community node. It lets you use **[RD Station CRM](https://www.rdstation.com/crm/)** in your n8n workflows.

RD Station CRM is a sales CRM used to manage contacts, deals, pipelines and tasks. This package supports both the **RD Station CRM API v1** (token) and **v2** (OAuth2), selectable per node.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Compatibility](#compatibility) · [Resources](#resources)

---

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In n8n, go to **Settings → Community Nodes → Install**, and enter:

```
n8n-nodes-rd-station-crm
```

## Credentials

You need an **RD Station CRM API token**.

1. Sign in to RD Station CRM (a Basic, Pro or Advanced plan with Developer Mode enabled is required).
2. Go to **Settings → Integrations → API**.
3. Copy your private user token.
4. In n8n, create a new **RD Station CRM API** credential and paste the token.

The token is sent as the `token` query-string parameter on every request. The credential includes a built-in test that calls `GET /token/check` so you can verify it works before running a workflow.

### OAuth2 (API v2)

The node also supports the **RD Station CRM API v2** via OAuth2. Set the node's **Authentication** field to **OAuth2 (API V2)** and create an **RD Station CRM OAuth2 API** credential.

1. Register an app in the [RD Station App Store — App Publisher](https://appstore.rdstation.com/pt-BR/publisher), targeting the **RD Station CRM** product.
2. Add n8n's OAuth callback URL (shown in the credential) as an authorized redirect URL — it must be `https://`.
3. Copy the generated **Client ID** and **Client Secret** into the credential and connect.

n8n handles the token refresh (including RD's rolling refresh-token rotation) automatically. Note: RD's refresh token expires after 14 days of inactivity, after which you must reconnect.

## Operations

This package ships a single **RD Station CRM** action node with a **Resource → Operation** selector, plus an **RD Station CRM Trigger** node.

| Resource | Operations |
| --- | --- |
| **Contact** | Create, Get, Get Many, Update |
| **Deal** | Create, Get, Get Many, Update, Get Contacts, Mark as Won, Mark as Lost, Move to Stage |
| **Organization** | Create, Get, Get Many, Update, Get Contacts |
| **Task** | Create, Get, Get Many, Update |
| **Note** | Create, Get Many |
| **Pipeline** | Create, Get, Get Many, Update |
| **Stage** | Create, Get, Get Many, Update |
| **Product** | Create, Get, Get Many, Update |
| **Deal Product** | Add, Get Many, Update, Remove |
| **Custom Field** | Create, Get, Get Many, Update, Delete |
| **Source** | Create, Get, Get Many, Update |
| **Campaign** | Create, Get, Get Many, Update |
| **Loss Reason** | Create, Get, Get Many, Update |
| **User** | Get, Get Many, Get Current |
| **Team** | Get, Get Many |

Highlights:

- **Dynamic dropdowns** — pipelines, stages, users, teams, sources, campaigns, loss reasons, products and custom fields are loaded straight from your account, so you pick by name instead of copying IDs.
- **Return All** — every *Get Many* operation can page through all results automatically, or you can cap it with a limit.
- Fields you pick by name accept an expression as a fallback ("Name or ID").

### Example

*Create a deal and move it to a stage:*

1. **RD Station CRM** → Resource **Deal**, Operation **Create**. Set a name, pick a **Stage** and **Owner** from the dropdowns.
2. **RD Station CRM** → Resource **Deal**, Operation **Move to Stage**, using the ID from the previous node.

## Trigger

The **RD Station CRM Trigger** node starts a workflow when events happen in RD Station CRM. Select one or more events under **Trigger On** (a webhook is registered per event when the workflow is activated, and removed when it is deactivated).

Supported events include deal, contact, organization, task, product, campaign, source and loss-reason `created` / `updated` / `deleted` events.

> **Tip:** RD Station delivers each event at least once and retries on failure. Deduplicate downstream on the payload's `transaction_uuid` if exactly-once processing matters.

## Compatibility

- Requires n8n with `n8nNodesApiVersion` 1.
- Targets the RD Station CRM **API v1**.

> **Upgrading from 1.x:** version 2.0.0 is a full rewrite. The previous 13 separate nodes were consolidated into a single **RD Station CRM** node (plus a trigger). Workflows built on the 1.x nodes must be updated to use the new node.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [RD Station CRM API reference](https://developers.rdstation.com/reference)

## License

[MIT](LICENSE.md)
