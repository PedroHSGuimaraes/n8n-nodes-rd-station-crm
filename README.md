# n8n-nodes-rd-station-crm

Nós personalizados do n8n para integração com a API do RD Station CRM (v1).

## 🚀 Funcionalidades

Este pacote fornece nós personalizados para o n8n que permitem integração completa com a API do RD Station CRM, incluindo:

### 📋 Nós Disponíveis

1. **RD Station CRM Contatos** - Gerenciamento de contatos
2. **RD Station CRM Negócios** - Operações com negócios/deals
3. **RD Station CRM Tarefas** - Gestão de tarefas
4. **RD Station CRM Notas** - Criação e gerenciamento de notas
5. **RD Station CRM Empresas** - Operações com empresas
6. **RD Station CRM Produtos de Negócio** - Gestão de produtos em negócios
7. **RD Station CRM Usuários** - Informações de usuários
8. **RD Station CRM Times** - Gestão de equipes
9. **RD Station CRM Pipelines** - Operações com funis de vendas
10. **RD Station CRM Campanhas** - Gestão de campanhas
11. **RD Station CRM Fontes** - Informações sobre fontes de leads
12. **RD Station CRM Motivos de Perda** - Gestão de motivos de perda
13. **RD Station CRM Webhooks** - Configuração de webhooks

### 🔑 Credenciais

- **RD Station CRM API** - Autenticação via token de API

## 📦 Instalação

### Instalação via n8n Community Nodes

1. Acesse as configurações do n8n
2. Vá para "Community Nodes"
3. Clique em "Install"
4. Digite: `n8n-nodes-rd-station-crm`
5. Clique em "Install"

### Instalação Manual

```bash
# Clone o repositório
git clone https://github.com/rdstation/n8n-nodes-rd-station-crm.git
cd n8n-nodes-rd-station-crm

# Instale as dependências
npm install

# Compile o projeto
npm run build

# Instale globalmente (opcional)
npm install -g .
```

## 🔧 Configuração

### Obtendo o Token de API

1. Acesse sua conta do RD Station CRM
2. Vá para Configurações > Integrações > API
3. Gere um novo token de API
4. Copie o token gerado

### Configurando as Credenciais no n8n

1. No n8n, vá para "Credentials"
2. Clique em "Add Credential"
3. Selecione "RD Station CRM API"
4. Cole seu token de API no campo correspondente
5. Teste a conexão e salve

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
n8n-nodes-rd-station-crm/
├── credentials/           # Definições de credenciais
│   └── RdStationCrmApi.credentials.ts
├── nodes/                # Nós do n8n
│   ├── RdStationCrmContacts.node.ts
│   ├── RdStationCrmDeals.node.ts
│   ├── RdStationCrmTasks.node.ts
│   ├── RdStationCrmNotes.node.ts
│   ├── RdStationCrmCompanies.node.ts
│   ├── RdStationCrmDealProducts.node.ts
│   ├── RdStationCrmUsers.node.ts
│   ├── RdStationCrmTeams.node.ts
│   ├── RdStationCrmPipelines.node.ts
│   ├── RdStationCrmCampaigns.node.ts
│   ├── RdStationCrmSources.node.ts
│   ├── RdStationCrmLossReasons.node.ts
│   ├── RdStationCrmWebhooks.node.ts
│   └── rdstation.svg      # Ícone dos nós
├── dist/                 # Arquivos compilados
├── index.ts              # Arquivo principal de exportação
├── package.json          # Configurações do pacote
├── tsconfig.json         # Configurações do TypeScript
└── gulpfile.js          # Tarefas de build
```

### Scripts Disponíveis

```bash
# Compilar o projeto
npm run build

# Modo de desenvolvimento (watch)
npm run dev

# Executar linter
npm run lint

# Corrigir problemas de linting
npm run lintfix

# Formatar código
npm run format
```

## 🔄 Correções Implementadas

### Versão 1.0.2 - Correções de Carregamento

**Problemas Corrigidos:**

1. **Inconsistência no package.json**: Removidos nós inexistentes (`RdStationCrmFunnels`, `RdStationCrmStages`) e adicionado o nó `RdStationCrmPipelines` que estava faltando
2. **Arquivo index.js otimizado**: Simplificado para apenas redirecionar para `dist/index.js`
3. **Configuração TypeScript melhorada**: Adicionadas opções para melhor compatibilidade
4. **Estrutura de diretórios corrigida**: Removidos subdiretórios desnecessários em `dist/nodes`
5. **Gulpfile otimizado**: Corrigida a cópia de ícones SVG

**Erro Resolvido:**

```
Error loading package "n8n-nodes-rd-station-crm": The "paths[1]" argument must be of type string. Received an instance of Object
```

**Alterações Técnicas:**

- Corrigida a exportação de `nodeTypes` e `credentialTypes` no arquivo principal
- Melhorada a resolução de módulos no TypeScript
- Removidas estruturas de diretórios duplicadas
- Otimizada a configuração do Gulp para cópia de ícones

## 📚 Documentação da API

Para mais informações sobre a API do RD Station CRM, consulte:

- [Documentação Oficial da API](https://developers.rdstation.com/en/reference)
- [Guia de Autenticação](https://developers.rdstation.com/en/authentication)

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Se você encontrar problemas ou tiver dúvidas:

1. Verifique se o token de API está correto
2. Confirme se a versão do n8n é compatível
3. Consulte os logs do n8n para mais detalhes sobre erros
4. Abra uma issue no repositório do GitHub

## 📈 Versões

- **1.3.1** - Correção completa da estrutura de campos de email
  - **Emails**: Corrigida estrutura de campos de email nos nós Contatos e Negociações
  - Adicionados campos `type` (personal/work/other) e `primary` (boolean) para emails
  - Implementado processamento correto de emails com valores padrão
  - Garantida compatibilidade com a API oficial do RD Station CRM v1
- **1.3.0** - Correção completa de todos os nós seguindo a documentação oficial da API
  - **Contatos**: Corrigida estrutura de requisições, adicionados campos customizados e base legal
  - **Organizações**: Corrigido endpoint para `/organizations`, adicionados campos customizados
  - **Negociações**: Mantidas correções da v1.2.0
  - Todos os nós agora seguem exatamente a estrutura da API oficial do RD Station CRM v1
  - Padronizada estrutura de dados com objetos aninhados (ex: `{ contact: {...} }`)
  - Corrigidos tipos de campos e valores padrão
  - Adicionados campos obrigatórios faltantes
  - Melhoradas descrições de todos os campos
- **1.2.0** - Reescrita completa do nó de Negociações seguindo exatamente a documentação oficial da API
  - Corrigida estrutura de requisições para seguir exatamente o formato da API oficial
  - Corrigidos tipos de campos (boolean vs string) conforme documentação
  - Corrigido tratamento do campo `win` com valores true/false/null
  - Corrigido formato de datas para yyyy-mm-dd
  - Corrigida estrutura de contatos existentes (usando `_id` em vez de apenas `id`)
  - Adicionado suporte para base legal em contatos
  - Separado campo `deal_stage_id` no update conforme documentação
  - Melhoradas descrições de todos os campos seguindo a documentação oficial
  - Corrigidos filtros de período com validação booleana adequada
- **1.1.0** - Atualização completa do nó de Negociações (Deals) seguindo a documentação oficial da API
  - Adicionados todos os parâmetros de query para listagem de negociações
  - Implementados filtros de período (fechamento, criação, previsão)
  - Adicionado suporte completo para campos customizados
  - Implementada criação de novos contatos junto com a negociação
  - Adicionado suporte para associar contatos existentes
  - Implementado gerenciamento de produtos na negociação
  - Adicionados campos de campanha, fonte e organização
  - Melhorada a estrutura de dados seguindo exatamente a API oficial
- **1.0.9** - Correção na estrutura do package.json para compatibilidade com n8n
- **1.0.7** - Correções de sintaxe no package.json
- **1.0.6** - Correções de carregamento e otimizações finais
- **1.0.5** - Versão com nome alternativo para compatibilidade
- **1.0.4** - Correções de carregamento e otimizações
- **1.0.3** - Correções de carregamento e otimizações finais
- **1.0.2** - Correções de carregamento e otimizações
- **1.0.1** - Versão inicial com todos os nós básicos
- **1.0.0** - Primeira versão estável

## 🚀 Como Publicar no NPM

Para desenvolvedores que desejam publicar este pacote:

### Pré-requisitos

1. Conta no [npmjs.com](https://www.npmjs.com/)
2. Login no npm: `npm login`

### Opção 1: Script Automático (Windows)

```bash
# Execute o script de publicação
.\publish.bat
# ou
.\publish.ps1
```

### Opção 2: Manual

```bash
# 1. Fazer build
npm run build

# 2. Verificar conteúdo
npm pack --dry-run

# 3. Publicar
npm publish
```

### Verificação Pós-Publicação

- Acesse: https://www.npmjs.com/package/n8n-nodes-rd-station-crm
- Teste a instalação: `npm install n8n-nodes-rd-station-crm`
