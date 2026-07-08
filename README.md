# n8n-nodes-rd-station-crm

Node community do [n8n](https://n8n.io/) para integrar seus fluxos com o **[RD Station CRM](https://www.rdstation.com/crm/)**.

O RD Station CRM é o CRM de vendas usado para gerenciar contatos, negociações, funis e tarefas. Este pacote suporta **as duas versões da API**, selecionáveis no próprio node:

- **API v1** — autenticação por **token** (privado, na query string).
- **API v2** — autenticação por **OAuth2** (com refresh automático gerenciado pelo n8n).

[n8n](https://n8n.io/) é uma plataforma de automação de fluxos com [licença fair-code](https://docs.n8n.io/reference/license/).

[Instalação](#-instalação) · [Credenciais](#-credenciais) · [Nós e Operações](#-nós-e-operações) · [Trigger](#-trigger) · [Tool de IA](#-usar-como-tool-de-agente-de-ia) · [v1 vs v2](#-v1-ou-v2-qual-usar) · [Desenvolvimento](#️-desenvolvimento) · [Versões](#-versões)

---

## 🚀 Funcionalidades

- **1 node unificado** — `RD Station CRM` com seletor **Recurso → Operação** (chega de um node por entidade). Mais um node de **gatilho** (`RD Station CRM Trigger`).
- **Duas APIs no mesmo node** — campo **Authentication** para alternar entre **Access Token (API V1)** e **OAuth2 (API V2)**.
- **OAuth2 pronto** — o **Redirect URL é gerado automaticamente pelo n8n a partir do domínio da sua instância** (igual ao "Google Drive OAuth2 API"). Basta colar essa URL no seu app do RD.
- **Dropdowns dinâmicos** — funis, etapas, usuários, times, fontes, campanhas, motivos de perda, produtos e campos personalizados são carregados direto da sua conta: você escolhe pelo nome, sem copiar IDs.
- **Return All** — toda operação *Get Many* pagina todos os resultados automaticamente (ou você limita a quantidade).
- **Trigger de verdade** — registra um webhook por evento ao ativar o workflow e remove ao desativar.
- **Usável como Tool de IA** — o node tem `usableAsTool: true`, então um **AI Agent** do n8n pode chamar qualquer operação (criar contato, mover negócio de etapa, buscar tarefas…) preenchendo os parâmetros sozinho via `$fromAI()`. Veja [Usar como Tool de Agente de IA](#-usar-como-tool-de-agente-de-ia).
- **Zero dependências de runtime** — usa o `httpRequestWithAuthentication` do próprio n8n. Passa no ESLint `@n8n/eslint-plugin-community-nodes` (0 erros) e é publicado no npm **com provenance**.

## 📦 Instalação

Siga o [guia de community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) do n8n.

No n8n, vá em **Settings → Community Nodes → Install** e digite:

```
n8n-nodes-rd-station-crm
```

> Requer uma instância n8n com `n8nNodesApiVersion` 1.

## 🔑 Credenciais

O node aceita **dois tipos de credencial**, um para cada versão da API. Ao criar a credencial, escolha no seletor do topo entre **Access Token (API V1)** e **OAuth2 (API V2)**:

![Seleção de autenticação na credencial: Access Token (API V1) ou OAuth2 (API V2)](https://raw.githubusercontent.com/PedroHSGuimaraes/n8n-nodes-rd-station-crm/master/docs/credential-auth.png)

No node, o campo **Authentication** define qual das duas credenciais será usada.

### 1. RD Station CRM API — token (API v1)

Essa é a autenticação clássica, **igual às versões anteriores**, e é a opção **padrão** do node.

1. Entre no RD Station CRM (é preciso um plano **Basic, Pro ou Advanced** com o **Modo Desenvolvedor** habilitado).
2. Vá em **Configurações → Integrações → API**.
3. Copie seu **token de usuário** (privado).
4. No n8n, crie uma credencial **RD Station CRM API** e cole o token.

O token é enviado como parâmetro `token` na query string de cada requisição. A credencial tem um **teste embutido** que chama `GET /token/check`, então dá pra validar antes de rodar o fluxo.

### 2. RD Station CRM OAuth2 API — OAuth2 (API v2)

Para usar a **API v2**, mude o campo **Authentication** do node para **OAuth2 (API V2)** e crie uma credencial **RD Station CRM OAuth2 API**.

1. Registre um app no [RD Station App Store — App Publisher](https://appstore.rdstation.com/pt-BR/publisher), apontando para o produto **RD Station CRM**.
2. Copie o **OAuth Redirect URL** que aparece na credencial do n8n — ele é montado **automaticamente com o domínio da sua instância**, no formato:

   ```
   https://SEU-DOMINIO-N8N/rest/oauth2-credential/callback
   ```

   Cadastre essa URL como **redirect autorizado** no app do RD (precisa ser `https://`).
3. Cole o **Client ID** e o **Client Secret** gerados na credencial e clique em **Connect / Sign in with RD Station**.

Fluxo OAuth2 usado (você não precisa configurar isso manualmente — já vem pronto na credencial):

| Item | Valor |
| --- | --- |
| Authorization URL | `https://accounts.rdstation.com/oauth/authorize` |
| Access Token URL | `https://api.rd.services/oauth2/token` |
| Credenciais do cliente | Enviadas no **body** (não em HTTP Basic) |
| Scopes | Nenhum |
| Base da API v2 | `https://api.rd.services/crm/v2` |

O n8n cuida da **renovação do token** (incluindo a rotação do refresh-token do RD) automaticamente.

> ⚠️ O refresh-token do RD expira após **14 dias de inatividade** — depois disso é preciso reconectar a credencial.

## 🧩 Nós e Operações

O pacote traz **um node de ação** (`RD Station CRM`) com seletor **Recurso → Operação** e **um node de gatilho** (`RD Station CRM Trigger`).

As operações disponíveis dependem da **Authentication** escolhida:

### Access Token (API V1)

| Recurso | Operações |
| --- | --- |
| **Contact** (Contato) | Create, Get, Get Many, Update |
| **Deal** (Negócio) | Create, Get, Get Many, Update, Get Contacts, Mark as Won, Mark as Lost, Move to Stage |
| **Organization** (Organização) | Create, Get, Get Many, Update, Get Contacts |
| **Task** (Tarefa) | Create, Get, Get Many, Update |
| **Note** (Nota) | Create, Get Many |
| **Pipeline** (Funil) | Create, Get, Get Many, Update |
| **Stage** (Etapa) | Create, Get, Get Many, Update |
| **Product** (Produto) | Create, Get, Get Many, Update |
| **Deal Product** (Produto do Negócio) | Add, Get Many, Update, Remove |
| **Custom Field** (Campo Personalizado) | Create, Get, Get Many, Update, Delete |
| **Source** (Fonte) | Create, Get, Get Many, Update |
| **Campaign** (Campanha) | Create, Get, Get Many, Update |
| **Loss Reason** (Motivo de Perda) | Create, Get, Get Many, Update |
| **User** (Usuário) | Get, Get Many, Get Current |
| **Team** (Time) | Get, Get Many |
| **Webhook** | Create, Get, Get Many, Update, Delete |

### OAuth2 (API V2)

A API v2 cobre os recursos principais (envelope JSON:API `{ data }`, paginação por `links.next`):

| Recurso | Operações |
| --- | --- |
| **Contact** (Contato) | Create, Get, Get Many, Update |
| **Deal** (Negócio) | Create, Get, Get Many, Update, Mark as Won, Mark as Lost, Move to Stage |
| **Organization** (Organização) | Create, Get, Get Many, Update |
| **Task** (Tarefa) | Create, Get, Get Many, Update |
| **Note** (Nota) | Create, Get Many |
| **Custom Field** (Campo Personalizado) | Create, Get, Get Many, Update, Delete |

**Destaques:**

- Campos escolhidos pelo nome aceitam também uma **expressão** como alternativa (padrão "Name or ID" do n8n).
- *Get Many* com **Return All** pagina tudo, ou você define um **Limit**.

### Exemplo — criar um negócio e movê-lo de etapa

1. **RD Station CRM** → Recurso **Deal**, Operação **Create**. Defina um nome e escolha **Stage** e **Owner** pelos dropdowns.
2. **RD Station CRM** → Recurso **Deal**, Operação **Move to Stage**, usando o ID retornado no node anterior.

## 🔔 Trigger

O node **RD Station CRM Trigger** inicia um fluxo quando eventos acontecem no RD Station CRM. Em **Trigger On**, selecione um ou mais eventos (um webhook é registrado por evento ao **ativar** o workflow e removido ao **desativar**).

> O trigger usa a credencial de **token (API v1)** — os webhooks são um recurso da API v1.

Eventos suportados (23):

| Entidade | Eventos |
| --- | --- |
| **Deal** (Negócio) | Created, Updated, Deleted |
| **Contact** (Contato) | Created, Updated, Deleted |
| **Organization** (Organização) | Created, Updated, Deleted |
| **Product** (Produto) | Created, Updated, Deleted |
| **Campaign** (Campanha) | Created, Updated, Deleted |
| **Source** (Fonte) | Created, Updated, Deleted |
| **Loss Reason** (Motivo de Perda) | Created, Updated, Deleted |
| **Task** (Tarefa) | Created, Updated |

> **Dica:** o RD entrega cada evento **pelo menos uma vez** e tenta de novo em caso de falha. Se você precisa de processamento exatamente-uma-vez, deduplique a jusante pelo `transaction_uuid` do payload.

## 🤖 Usar como Tool de Agente de IA

O node `RD Station CRM` é **usável como tool** por nós de **AI Agent** do n8n (Tools Agent). Isso deixa o modelo **executar ações no seu CRM sozinho** — por exemplo: *"crie um contato chamado Maria com o e-mail maria@empresa.com e abra um negócio para ela no funil de Vendas"*.

### Como ligar (2 passos)

1. **No servidor n8n**, habilite o uso de community nodes como tools (por segurança, vem **desligado por padrão**). Defina a variável de ambiente:

   ```bash
   N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
   ```

   | Instalação | Onde definir |
   | --- | --- |
   | **Docker / docker-compose** | Adicione em `environment:` do serviço n8n (ou no `.env`) e recrie o container (`docker compose up -d`). |
   | **npm / npx** | Exporte antes de subir: `export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true && n8n start`. |
   | **n8n Cloud** | Já habilitado nos planos que suportam community nodes. |

   > Sem essa variável o node **não aparece** na lista de tools do AI Agent — é a causa nº 1 de "não acho o node como tool".

2. **No workflow**, adicione um node **AI Agent**, conecte um **Chat Model** e, no conector **Tool**, adicione o **RD Station CRM**. Escolha o **Recurso** e a **Operação** que o agente pode usar (ex.: Contact → Create). Uma tool por operação é a prática recomendada.

### Deixe o modelo preencher os campos (`$fromAI`)

Em cada campo do node em modo tool aparece o botão **"Let the model define this"**, que usa a expressão:

```
{{ $fromAI('email', 'E-mail do contato a ser criado', 'string') }}
```

- Assinatura: `$fromAI(key, description?, type?, defaultValue?)` — `key` de 1–64 caracteres (`[a-zA-Z0-9_-]`); `type` = `string` | `number` | `boolean` | `json`.
- Você pode **misturar**: fixar alguns campos (ex.: sempre o mesmo funil) e deixar o modelo preencher outros (nome, e-mail, valor).
- As **descrições de cada operação e campo** deste node foram escritas para o LLM entender o que cada uma faz e como preencher — quanto mais específico o seu prompt/System Message do agente, melhor o resultado.

### Boas práticas

- **Restrinja o escopo:** exponha só as operações que o agente precisa (ex.: só *Create*/*Get Many* de Contact e Deal), em vez de liberar tudo.
- **Credencial dedicada** com permissões mínimas para o agente.
- **n8n atualizado:** versões antigas tinham um bug em que a tool de community node retornava resposta vazia para o agente ([n8n#26202](https://github.com/n8n-io/n8n/issues/26202)); já corrigido.
- O **Trigger** (`RD Station CRM Trigger`) **não** é uma tool — triggers não podem ser usados por agentes (por design do n8n).

### Referências

- [Tools Agent — n8n Docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)
- [Let AI specify tool parameters (`$fromAI`) — n8n Docs](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/)
- [Variáveis de ambiente de nodes — n8n Docs](https://docs.n8n.io/hosting/configuration/environment-variables/nodes/)

## 🔀 v1 ou v2: qual usar?

| | **API v1 (token)** | **API v2 (OAuth2)** |
| --- | --- | --- |
| Autenticação | Token privado do usuário | OAuth2 (app no RD App Store) |
| Configuração | Mais simples (cola o token) | Requer registrar app + redirect `https://` |
| Cobertura neste node | Completa (16 recursos + trigger) | Recursos principais (6 recursos) |
| Webhooks/Trigger | ✅ | Use o trigger v1 |
| Indicado para | Uso interno, scripts, começar rápido | Integrações distribuídas para vários clientes |

Se você só precisa automatizar a sua própria conta, o **token (v1)** é o caminho mais rápido — e continua funcionando exatamente como antes. Use **OAuth2 (v2)** quando for publicar uma integração que vários clientes RD vão conectar.

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Compilar (tsc + cópia de ícones via gulp)
npm run build

# Modo watch
npm run dev

# Lint (ESLint + plugin de community nodes)
npm run lint
npm run lintfix

# Formatar
npm run format
```

Estrutura resumida:

```
n8n-nodes-rd-station-crm/
├── credentials/
│   ├── RdStationCrmApi.credentials.ts        # token (v1)
│   └── RdStationCrmOAuth2Api.credentials.ts  # OAuth2 (v2)
├── nodes/
│   ├── RdStationCrm/            # node de ação (v1 + v2)
│   │   ├── actions/            # recursos e operações (v1 e v2/)
│   │   ├── methods/           # loadOptions (dropdowns dinâmicos)
│   │   └── transport/         # index.ts (v1) e v2.ts (OAuth2)
│   └── RdStationCrmTrigger/    # node de gatilho (webhooks v1)
└── dist/                       # saída compilada (publicada)
```

## ✅ Compatibilidade

- Requer n8n com `n8nNodesApiVersion` 1.
- API v1: `https://crm.rdstation.com/api/v1` · API v2: `https://api.rd.services/crm/v2`.

> **Atualizando da 1.x:** a versão 2.0.0 foi uma reescrita completa. Os 13 nós separados viraram **um único node `RD Station CRM`** (mais o trigger). Fluxos feitos com os nós 1.x precisam ser recriados com o novo node.

## 📚 Recursos

- [Documentação de community nodes do n8n](https://docs.n8n.io/integrations/community-nodes/)
- [Referência da API do RD Station CRM](https://developers.rdstation.com/reference)
- [Autenticação da API v2 (OAuth2)](https://developers.rdstation.com/reference/crm-v2-authentication)

## 📈 Versões

- **2.2.0** — **Otimização para uso como Tool de Agente de IA.** Descrições de todas as operações e campos reescritas para o LLM entender e preencher os parâmetros corretamente; descrição do node e dos recursos enriquecidas; categoria **AI → Tools** no codex; nova seção no README explicando o `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` e o `$fromAI()`. O node já expunha `usableAsTool: true` desde a 2.x.
- **2.1.4** — Ícone passa a usar o **símbolo (marca) do RD Station** — quadrado e nítido em qualquer tamanho do nó (light preto, dark branco, chevron ciano nos dois temas).
- **2.1.1–2.1.3** — README completo em pt-BR e screenshot da seleção de autenticação.
- **2.1.0** — Publicação da API v2 (OAuth2) e ajustes de ícone. Publicação da **API v2 (OAuth2)**: credencial `RdStationCrmOAuth2Api`, seletor de Authentication (v1/v2), transporte v2 (Bearer, envelope `{ data }`, paginação `links.next`) e 6 recursos principais (Contact, Deal, Organization, Task, Note, Custom Field). O auth por **token (v1) continua** e é o padrão.
- **2.0.2** — Recurso **Webhook** (Create, Get, Get Many, Update, Delete).
- **2.0.1** — Publicação com **provenance** (via GitHub Action) e ajustes de ícone/lint.
- **2.0.0** — Reescrita completa: node único `RD Station CRM` (Recurso → Operação) + `RD Station CRM Trigger`, dropdowns dinâmicos e Return All.
- **1.3.1** e anteriores — nós separados por entidade, apenas API v1 (token). Veja o histórico no Git.

## 🆘 Suporte

Se algo não funcionar:

1. Confirme se o **token** (v1) está correto, ou se o **Client ID/Secret e o Redirect URL** (v2) estão certos e o redirect é `https://`.
2. Verifique se a versão do n8n é compatível.
3. Consulte os logs do n8n para detalhes do erro.
4. Abra uma [issue no GitHub](https://github.com/PedroHSGuimaraes/n8n-nodes-rd-station-crm/issues).

## 📄 Licença

[MIT](LICENSE.md)
