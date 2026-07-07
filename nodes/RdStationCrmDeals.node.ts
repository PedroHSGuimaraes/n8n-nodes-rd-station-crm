import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";
import { OptionsWithUri } from "request-promise-native";

/**
 * Classe para o nó de Negociações (Deals) do RD Station CRM
 *
 * A Negociação é uma das três Entidades do RD Station CRM:
 * - Negociação
 * - Contato
 * - Empresa
 *
 * Ela representa a possibilidade de negociar uma venda e contém todas as fases do processo de negociação.
 * Toda Negociação cadastrada percorre o funil de vendas e, a cada atualização, as informações referentes
 * ao avanço da negociação podem ser registradas em campos específicos.
 */
export class RdStationCrmDeals implements INodeType {
  description: INodeTypeDescription = {
    // Informações básicas do nó
    displayName: "RD Station CRM Negociações",
    name: "rdStationCrmDeals",
    icon: "file:rdstation.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Operações com negociações no RD Station CRM",
    defaults: {
      name: "RD Station CRM Negociações",
    },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [
      {
        name: "rdStationCrmApi",
        required: true,
      },
    ],
    properties: [
      // Seleção do recurso
      {
        displayName: "Recurso",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          {
            name: "Negociação",
            value: "deal",
          },
        ],
        default: "deal",
        required: true,
      },
      // Seleção da operação
      {
        displayName: "Operação",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["deal"],
          },
        },
        options: [
          {
            name: "Criar",
            value: "create",
            description: "Criar uma nova negociação",
            action: "Criar uma negociação",
          },
          {
            name: "Atualizar",
            value: "update",
            description: "Atualizar uma negociação existente",
            action: "Atualizar uma negociação",
          },
          {
            name: "Listar",
            value: "getAll",
            description: "Listar negociações",
            action: "Listar negociações",
          },
          {
            name: "Obter",
            value: "get",
            description: "Obter uma negociação pelo ID",
            action: "Obter uma negociação",
          },
          {
            name: "Listar Contatos",
            value: "getContacts",
            description: "Listar contatos associados a uma negociação",
            action: "Listar contatos de uma negociação",
          },
        ],
        default: "getAll",
      },

      // ===== CAMPOS PARA LISTAR NEGOCIAÇÕES =====
      {
        displayName: "Filtros",
        name: "filters",
        type: "collection",
        placeholder: "Adicionar Filtro",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["getAll"],
          },
        },
        options: [
          // Paginação
          {
            displayName: "Página",
            name: "page",
            type: "number",
            default: 1,
            description: "Número da página listada",
          },
          {
            displayName: "Limite",
            name: "limit",
            type: "number",
            default: 20,
            description: "Limite de negociações por página. Máximo: 200",
          },
          // Ordenação
          {
            displayName: "Ordenar Por",
            name: "order",
            type: "string",
            default: "created_at",
            description: "Campo para ordenação. Padrão: created_at",
          },
          {
            displayName: "Direção",
            name: "direction",
            type: "options",
            options: [
              {
                name: "Ascendente",
                value: "asc",
              },
              {
                name: "Descendente",
                value: "desc",
              },
            ],
            default: "desc",
            description: "Direção da ordenação",
          },
          // Filtros de busca
          {
            displayName: "Nome",
            name: "name",
            type: "string",
            default: "",
            description: "Nome da negociação",
          },
          {
            displayName: "Nome Exato",
            name: "exact_name",
            type: "boolean",
            default: false,
            description: "Para buscas com nome exato",
          },
          // Status da negociação
          {
            displayName: "Status Ganho/Perdido",
            name: "win",
            type: "options",
            options: [
              {
                name: "Ganhas",
                value: "true",
              },
              {
                name: "Perdidas",
                value: "false",
              },
              {
                name: "Em Aberto",
                value: "null",
              },
            ],
            default: "null",
            description: "Status da negociação: ganhas, perdidas ou em aberto",
          },
          {
            displayName: "Fechadas",
            name: "closed_at",
            type: "options",
            options: [
              {
                name: "Ganhas/Perdidas",
                value: "true",
              },
              {
                name: "Em Aberto/Pausadas",
                value: "false",
              },
            ],
            default: "false",
            description: "Filtrar por negociações fechadas ou abertas",
          },
          {
            displayName: "Pausadas",
            name: "hold",
            type: "boolean",
            default: false,
            description:
              "Se marcado como true, retorna apenas negociações pausadas",
          },
          // IDs específicos
          {
            displayName: "ID do Usuário",
            name: "user_id",
            type: "string",
            default: "",
            description: "ID do usuário responsável pela negociação",
          },
          {
            displayName: "ID da Etapa",
            name: "deal_stage_id",
            type: "string",
            default: "",
            description: "ID da etapa do funil",
          },
          {
            displayName: "ID do Funil",
            name: "deal_pipeline_id",
            type: "string",
            default: "",
            description: "ID do funil de vendas",
          },
          {
            displayName: "ID da Empresa",
            name: "organization",
            type: "string",
            default: "",
            description: "ID da empresa associada",
          },
          {
            displayName: "ID do Motivo de Perda",
            name: "deal_lost_reason_id",
            type: "string",
            default: "",
            description: "ID do motivo de perda",
          },
          {
            displayName: "ID da Campanha",
            name: "campaign_id",
            type: "string",
            default: "",
            description: "ID da campanha",
          },
          {
            displayName: "ID do Usuário que Fechou",
            name: "closed_by_id",
            type: "string",
            default: "",
            description: "ID do usuário que fechou a venda",
          },
          // Produtos
          {
            displayName: "Presença de Produtos",
            name: "product_presence",
            type: "string",
            default: "",
            description:
              "false (sem produtos), true (com produtos) ou lista de IDs separados por vírgula",
          },
          // Próxima página
          {
            displayName: "Próxima Página",
            name: "next_page",
            type: "string",
            default: "",
            description: "Token para consultar a próxima página de resultados",
          },
        ],
      },
      // Filtros de período
      {
        displayName: "Filtros de Período",
        name: "periodFilters",
        type: "collection",
        placeholder: "Adicionar Filtro de Período",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["getAll"],
          },
        },
        options: [
          {
            displayName: "Período de Fechamento",
            name: "closed_at_period",
            type: "boolean",
            default: false,
            description: "Filtrar por data de fechamento",
          },
          {
            displayName: "Período de Criação",
            name: "created_at_period",
            type: "boolean",
            default: false,
            description: "Filtrar por data de criação",
          },
          {
            displayName: "Período de Previsão",
            name: "prediction_date_period",
            type: "boolean",
            default: false,
            description: "Filtrar por data de previsão de fechamento",
          },
          {
            displayName: "Data Inicial",
            name: "start_date",
            type: "dateTime",
            default: "",
            description:
              "Data/hora inicial do período. Ex: 2020-12-14T15:00:00",
          },
          {
            displayName: "Data Final",
            name: "end_date",
            type: "dateTime",
            default: "",
            description: "Data/hora final do período. Ex: 2020-12-14T15:00:00",
          },
        ],
      },

      // ===== CAMPOS PARA OBTER/ATUALIZAR NEGOCIAÇÃO =====
      {
        displayName: "ID da Negociação",
        name: "deal_id",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["get", "update", "getContacts"],
          },
        },
        description: "ID da negociação",
      },

      // ===== CAMPOS PARA CRIAR NEGOCIAÇÃO =====
      {
        displayName: "Nome da Negociação",
        name: "name",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create"],
          },
        },
        description: "Nome da negociação (obrigatório, mínimo 2 caracteres)",
      },

      // ===== CAMPOS PARA CRIAR/ATUALIZAR NEGOCIAÇÃO =====
      {
        displayName: "Dados da Negociação",
        name: "dealData",
        type: "collection",
        placeholder: "Adicionar Campo",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            displayName: "Nome",
            name: "name",
            type: "string",
            default: "",
            description: "Nome da negociação (mínimo 2 caracteres)",
            displayOptions: {
              show: {
                "/operation": ["update"],
              },
            },
          },
          {
            displayName: "ID da Etapa",
            name: "deal_stage_id",
            type: "string",
            default: "",
            description: "ID da etapa do funil",
          },
          {
            displayName: "ID do Usuário",
            name: "user_id",
            type: "string",
            default: "",
            description:
              "ID do usuário responsável. Se não enviado, o dono do token será atribuído",
          },
          {
            displayName: "Avaliação",
            name: "rating",
            type: "number",
            default: 0,
            description: "Avaliação da negociação",
          },
          {
            displayName: "Data de Previsão",
            name: "prediction_date",
            type: "dateTime",
            default: "",
            description: "Data de previsão de fechamento (formato: yyyy-mm-dd)",
          },
          {
            displayName: "Status",
            name: "win",
            type: "options",
            options: [
              {
                name: "Ganha",
                value: true,
              },
              {
                name: "Perdida",
                value: false,
              },
              {
                name: "Em Aberto",
                value: "null",
              },
            ],
            default: "null",
            description: "Status da negociação",
          },
          {
            displayName: "Pausada",
            name: "hold",
            type: "options",
            options: [
              {
                name: "Pausada",
                value: true,
              },
              {
                name: "Em Aberto",
                value: "null",
              },
            ],
            default: "null",
            description: "Status de pausa da negociação",
          },
          {
            displayName: "ID do Motivo de Perda",
            name: "deal_lost_reason_id",
            type: "string",
            default: "",
            description: "ID do motivo da perda (quando negociação é perdida)",
          },
          {
            displayName: "Nota de Perda",
            name: "deal_lost_note",
            type: "string",
            default: "",
            description: "Nota explicativa sobre a perda da negociação",
          },
          {
            displayName: "ID da Organização",
            name: "organization_id",
            type: "string",
            default: "",
            description: "ID da empresa à qual a negociação pertence",
            displayOptions: {
              show: {
                "/operation": ["update"],
              },
            },
          },
        ],
      },

      // Campos customizados
      {
        displayName: "Campos Customizados",
        name: "deal_custom_fields",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Campo Customizado",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            name: "customFieldValues",
            displayName: "Campo Customizado",
            values: [
              {
                displayName: "ID do Campo",
                name: "custom_field_id",
                type: "string",
                default: "",
                description: "ID do campo customizado",
              },
              {
                displayName: "Valor",
                name: "value",
                type: "string",
                default: "",
                description: "Valor do campo customizado",
              },
            ],
          },
        ],
      },

      // Fonte da negociação
      {
        displayName: "Fonte",
        name: "deal_source",
        type: "collection",
        placeholder: "Adicionar Fonte",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            displayName: "ID da Fonte",
            name: "_id",
            type: "string",
            default: "",
            description: "ID da fonte da negociação",
          },
        ],
      },

      // Campanha
      {
        displayName: "Campanha",
        name: "campaign",
        type: "collection",
        placeholder: "Adicionar Campanha",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            displayName: "ID da Campanha",
            name: "_id",
            type: "string",
            default: "",
            description: "ID da campanha da negociação",
          },
        ],
      },

      // Organização
      {
        displayName: "Empresa",
        name: "organization",
        type: "collection",
        placeholder: "Adicionar Empresa",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create"],
          },
        },
        options: [
          {
            displayName: "ID da Empresa",
            name: "_id",
            type: "string",
            default: "",
            description: "ID da empresa à qual a negociação pertence",
          },
        ],
      },

      // Contatos (para criar)
      {
        displayName: "Novos Contatos",
        name: "contacts",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Novo Contato",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create"],
          },
        },
        description: "Criar novos contatos e associá-los à negociação",
        options: [
          {
            name: "contactValues",
            displayName: "Contato",
            values: [
              {
                displayName: "Nome",
                name: "name",
                type: "string",
                default: "",
                description: "Nome do contato",
                required: true,
              },
              {
                displayName: "Título/Cargo",
                name: "title",
                type: "string",
                default: "",
                description: "Cargo do contato",
              },
              {
                displayName: "Aniversário",
                name: "birthday",
                type: "dateTime",
                default: "",
                description: "Data de aniversário",
              },
              {
                displayName: "E-mails",
                name: "emails",
                type: "fixedCollection",
                typeOptions: {
                  multipleValues: true,
                },
                default: {},
                options: [
                  {
                    name: "emailValues",
                    displayName: "E-mail",
                    values: [
                      {
                        displayName: "E-mail",
                        name: "email",
                        type: "string",
                        default: "",
                        required: true,
                      },
                      {
                        displayName: "Tipo",
                        name: "type",
                        type: "options",
                        options: [
                          {
                            name: "Pessoal",
                            value: "personal",
                          },
                          {
                            name: "Comercial",
                            value: "work",
                          },
                          {
                            name: "Outro",
                            value: "other",
                          },
                        ],
                        default: "personal",
                        description: "Tipo de e-mail",
                      },
                      {
                        displayName: "Principal",
                        name: "primary",
                        type: "boolean",
                        default: false,
                        description: "Definir como e-mail principal",
                      },
                    ],
                  },
                ],
              },
              {
                displayName: "Telefones",
                name: "phones",
                type: "fixedCollection",
                typeOptions: {
                  multipleValues: true,
                },
                default: {},
                options: [
                  {
                    name: "phoneValues",
                    displayName: "Telefone",
                    values: [
                      {
                        displayName: "Número",
                        name: "phone",
                        type: "string",
                        default: "",
                      },
                      {
                        displayName: "Tipo",
                        name: "type",
                        type: "string",
                        default: "",
                      },
                    ],
                  },
                ],
              },
              {
                displayName: "Facebook",
                name: "facebook",
                type: "string",
                default: "",
              },
              {
                displayName: "LinkedIn",
                name: "linkedin",
                type: "string",
                default: "",
              },
              {
                displayName: "Skype",
                name: "skype",
                type: "string",
                default: "",
              },
            ],
          },
        ],
      },

      // Contatos existentes (para associar)
      {
        displayName: "Contatos Existentes",
        name: "set_contacts",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Contato Existente",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create"],
          },
        },
        description: "Associar contatos existentes à negociação",
        options: [
          {
            name: "contactIds",
            displayName: "ID do Contato",
            values: [
              {
                displayName: "ID",
                name: "id",
                type: "string",
                default: "",
                description: "ID do contato existente",
              },
            ],
          },
        ],
      },

      // Produtos da negociação
      {
        displayName: "Produtos",
        name: "deal_products",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Produto",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            name: "productValues",
            displayName: "Produto",
            values: [
              {
                displayName: "Nome",
                name: "name",
                type: "string",
                default: "",
                description: "Nome do produto",
                required: true,
              },
              {
                displayName: "Descrição",
                name: "description",
                type: "string",
                default: "",
                description: "Descrição do produto",
              },
              {
                displayName: "Quantidade",
                name: "amount",
                type: "number",
                default: 1,
                description: "Quantidade do produto",
              },
              {
                displayName: "Preço Base",
                name: "base_price",
                type: "number",
                default: 0,
                description: "Preço base do produto",
              },
              {
                displayName: "Preço",
                name: "price",
                type: "number",
                default: 0,
                description: "Preço final do produto",
              },
              {
                displayName: "Tipo de Desconto",
                name: "discount_type",
                type: "string",
                default: "",
                description: "Tipo de desconto aplicado",
              },
              {
                displayName: "Total",
                name: "total",
                type: "number",
                default: 0,
                description: "Valor total",
              },
              {
                displayName: "Recorrência",
                name: "recurrence",
                type: "string",
                default: "",
                description: "Tipo de recorrência",
              },
            ],
          },
        ],
      },

      // ===== PARÂMETROS PARA LISTAR CONTATOS DA NEGOCIAÇÃO =====
      {
        displayName: "Parâmetros de Listagem",
        name: "contactListParams",
        type: "collection",
        placeholder: "Adicionar Parâmetro",
        default: {},
        displayOptions: {
          show: {
            resource: ["deal"],
            operation: ["getContacts"],
          },
        },
        options: [
          {
            displayName: "Página",
            name: "page",
            type: "number",
            default: 1,
            description: "Página da listagem de contatos",
          },
          {
            displayName: "Limite",
            name: "limit",
            type: "number",
            default: 20,
            description: "Limite de contatos por página. Máximo: 200",
          },
        ],
      },
    ],
  };

  /**
   * Método principal que executa o nó com base na operação selecionada
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // URL base da API do RD Station CRM
    const baseUrl = "https://crm.rdstation.com/api/v1";
    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    // Para cada item de entrada, processa a operação solicitada
    for (let i = 0; i < items.length; i++) {
      try {
        // Configuração comum para todas as requisições
        const options: OptionsWithUri = {
          uri: "",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          json: true,
          resolveWithFullResponse: true,
        };

        if (resource === "deal") {
          if (operation === "getAll") {
            // LISTAR NEGOCIAÇÕES
            options.method = "GET";
            options.uri = `${baseUrl}/deals`;

            // Obter filtros
            const filters = this.getNodeParameter("filters", i) as any;
            const periodFilters = this.getNodeParameter(
              "periodFilters",
              i
            ) as any;

            const qs: Record<string, any> = {};

            // Adicionar filtros básicos
            if (filters.page) qs.page = filters.page;
            if (filters.limit) qs.limit = filters.limit;
            if (filters.order) qs.order = filters.order;
            if (filters.direction) qs.direction = filters.direction;
            if (filters.name) qs.name = filters.name;
            if (filters.exact_name) qs.exact_name = filters.exact_name;
            if (filters.win !== undefined && filters.win !== "null")
              qs.win = filters.win;
            if (filters.closed_at !== undefined)
              qs.closed_at = filters.closed_at;
            if (filters.hold) qs.hold = filters.hold;
            if (filters.user_id) qs.user_id = filters.user_id;
            if (filters.deal_stage_id) qs.deal_stage_id = filters.deal_stage_id;
            if (filters.deal_pipeline_id)
              qs.deal_pipeline_id = filters.deal_pipeline_id;
            if (filters.organization) qs.organization = filters.organization;
            if (filters.deal_lost_reason_id)
              qs.deal_lost_reason_id = filters.deal_lost_reason_id;
            if (filters.campaign_id) qs.campaign_id = filters.campaign_id;
            if (filters.closed_by_id) qs.closed_by_id = filters.closed_by_id;
            if (filters.product_presence)
              qs.product_presence = filters.product_presence;
            if (filters.next_page) qs.next_page = filters.next_page;

            // Adicionar filtros de período
            if (periodFilters.closed_at_period) {
              qs.closed_at_period = true;
              if (periodFilters.start_date)
                qs.start_date = periodFilters.start_date;
              if (periodFilters.end_date) qs.end_date = periodFilters.end_date;
            }
            if (periodFilters.created_at_period) {
              qs.created_at_period = true;
              if (periodFilters.start_date)
                qs.start_date = periodFilters.start_date;
              if (periodFilters.end_date) qs.end_date = periodFilters.end_date;
            }
            if (periodFilters.prediction_date_period) {
              qs.prediction_date_period = true;
              if (periodFilters.start_date)
                qs.start_date = periodFilters.start_date;
              if (periodFilters.end_date) qs.end_date = periodFilters.end_date;
            }

            options.qs = qs;
          } else if (operation === "get") {
            // OBTER NEGOCIAÇÃO
            const dealId = this.getNodeParameter("deal_id", i) as string;

            if (!dealId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID da negociação é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "GET";
            options.uri = `${baseUrl}/deals/${dealId}`;
          } else if (operation === "getContacts") {
            // LISTAR CONTATOS DA NEGOCIAÇÃO
            const dealId = this.getNodeParameter("deal_id", i) as string;

            if (!dealId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID da negociação é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "GET";
            options.uri = `${baseUrl}/deals/${dealId}/contacts`;

            // Parâmetros de listagem
            const contactListParams = this.getNodeParameter(
              "contactListParams",
              i
            ) as any;
            const qs: Record<string, any> = {};

            if (contactListParams.page) qs.page = contactListParams.page;
            if (contactListParams.limit) qs.limit = contactListParams.limit;

            options.qs = qs;
          } else if (operation === "create") {
            // CRIAR NEGOCIAÇÃO
            options.method = "POST";
            options.uri = `${baseUrl}/deals`;

            const name = this.getNodeParameter("name", i) as string;

            if (!name || name.length < 2) {
              throw new NodeOperationError(
                this.getNode(),
                "Nome da negociação é obrigatório e deve ter no mínimo 2 caracteres!",
                { itemIndex: i }
              );
            }

            // Construir o corpo da requisição
            const body: any = {
              deal: {
                name,
              },
            };

            // Dados da negociação
            const dealData = this.getNodeParameter("dealData", i) as any;
            if (dealData.deal_stage_id)
              body.deal.deal_stage_id = dealData.deal_stage_id;
            if (dealData.user_id) body.deal.user_id = dealData.user_id;
            if (dealData.rating !== undefined)
              body.deal.rating = dealData.rating;
            if (dealData.prediction_date)
              body.deal.prediction_date =
                dealData.prediction_date.split("T")[0];

            // Campos customizados
            const customFields = this.getNodeParameter(
              "deal_custom_fields",
              i
            ) as any;
            if (
              customFields.customFieldValues &&
              customFields.customFieldValues.length > 0
            ) {
              body.deal.deal_custom_fields = customFields.customFieldValues.map(
                (field: any) => ({
                  custom_field_id: field.custom_field_id,
                  value: field.value,
                })
              );
            }

            // Fonte
            const dealSource = this.getNodeParameter("deal_source", i) as any;
            if (dealSource._id) {
              body.deal_source = { _id: dealSource._id };
            }

            // Campanha
            const campaign = this.getNodeParameter("campaign", i) as any;
            if (campaign._id) {
              body.campaign = { _id: campaign._id };
            }

            // Organização
            const organization = this.getNodeParameter(
              "organization",
              i
            ) as any;
            if (organization._id) {
              body.organization = { _id: organization._id };
            }

            // Novos contatos
            const contacts = this.getNodeParameter("contacts", i) as any;
            if (contacts.contactValues && contacts.contactValues.length > 0) {
              body.contacts = contacts.contactValues.map((contact: any) => {
                const contactObj: any = {
                  name: contact.name,
                };

                if (contact.title) contactObj.title = contact.title;
                if (contact.birthday) contactObj.birthday = contact.birthday;
                if (contact.facebook) contactObj.facebook = contact.facebook;
                if (contact.linkedin) contactObj.linkedin = contact.linkedin;
                if (contact.skype) contactObj.skype = contact.skype;

                // E-mails
                if (contact.emails && contact.emails.emailValues) {
                  contactObj.emails = contact.emails.emailValues.map(
                    (e: any) => ({
                      email: e.email,
                      type: e.type || "personal",
                      primary: e.primary || false,
                    })
                  );
                }

                // Telefones
                if (contact.phones && contact.phones.phoneValues) {
                  contactObj.phones = contact.phones.phoneValues.map(
                    (p: any) => ({
                      phone: p.phone,
                      type: p.type,
                    })
                  );
                }

                return contactObj;
              });
            }

            // Contatos existentes
            const setContacts = this.getNodeParameter("set_contacts", i) as any;
            if (setContacts.contactIds && setContacts.contactIds.length > 0) {
              body.set_contacts = setContacts.contactIds.map((c: any) => c.id);
            }

            // Produtos
            const dealProducts = this.getNodeParameter(
              "deal_products",
              i
            ) as any;
            if (
              dealProducts.productValues &&
              dealProducts.productValues.length > 0
            ) {
              body.deal_products = dealProducts.productValues;
            }

            options.body = body;
          } else if (operation === "update") {
            // ATUALIZAR NEGOCIAÇÃO
            const dealId = this.getNodeParameter("deal_id", i) as string;

            if (!dealId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID da negociação é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "PUT";
            options.uri = `${baseUrl}/deals/${dealId}`;

            // Construir o corpo da requisição
            const body: any = {
              deal: {},
            };

            // Dados da negociação
            const dealData = this.getNodeParameter("dealData", i) as any;
            if (dealData.name && dealData.name.length >= 2)
              body.deal.name = dealData.name;
            if (dealData.deal_stage_id)
              body.deal_stage_id = dealData.deal_stage_id;
            if (dealData.user_id) body.deal.user_id = dealData.user_id;
            if (dealData.rating !== undefined)
              body.deal.rating = dealData.rating;
            if (dealData.prediction_date)
              body.deal.prediction_date =
                dealData.prediction_date.split("T")[0];
            if (dealData.win !== undefined) body.deal.win = dealData.win;
            if (dealData.hold !== undefined) body.deal.hold = dealData.hold;
            if (dealData.deal_lost_reason_id)
              body.deal.deal_lost_reason_id = dealData.deal_lost_reason_id;
            if (dealData.deal_lost_note)
              body.deal.deal_lost_note = dealData.deal_lost_note;
            if (dealData.organization_id)
              body.deal.organization_id = dealData.organization_id;

            // Campos customizados
            const customFields = this.getNodeParameter(
              "deal_custom_fields",
              i
            ) as any;
            if (
              customFields.customFieldValues &&
              customFields.customFieldValues.length > 0
            ) {
              body.deal.deal_custom_fields = customFields.customFieldValues.map(
                (field: any) => ({
                  custom_field_id: field.custom_field_id,
                  value: field.value,
                })
              );
            }

            // Fonte
            const dealSource = this.getNodeParameter("deal_source", i) as any;
            if (dealSource._id) {
              body.deal_source = { _id: dealSource._id };
            }

            // Campanha
            const campaign = this.getNodeParameter("campaign", i) as any;
            if (campaign._id) {
              body.campaign = { _id: campaign._id };
            }

            // Produtos (se fornecidos, substitui todos os produtos existentes)
            const dealProducts = this.getNodeParameter(
              "deal_products",
              i
            ) as any;
            if (
              dealProducts.productValues &&
              dealProducts.productValues.length > 0
            ) {
              body.deal_products = dealProducts.productValues;
            }

            options.body = body;
          }
        }

        // Executar a requisição
        const response = await this.helpers.requestWithAuthentication.call(
          this,
          "rdStationCrmApi",
          options
        );

        // Extrair os dados da resposta
        const responseData = response.body;
        returnData.push({
          json: responseData,
          pairedItem: { item: i },
        });
      } catch (error) {
        // Tratamento de erros
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
