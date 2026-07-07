import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";
import { OptionsWithUri } from "request-promise-native";

/**
 * Classe para o nó de Contatos do RD Station CRM
 * Este nó permite interações com a API de Contatos do RD Station CRM.
 *
 * Documentação oficial: https://developers.rdstation.com/reference/api-rd-station-doc
 */
export class RdStationCrmContacts implements INodeType {
  description: INodeTypeDescription = {
    // Informações básicas do nó
    displayName: "RD Station CRM Contatos",
    name: "rdStationCrmContacts",
    icon: "file:rdstation.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Operações com contatos no RD Station CRM",
    defaults: {
      name: "RD Station CRM Contatos",
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
            name: "Contato",
            value: "contact",
          },
        ],
        default: "contact",
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
            resource: ["contact"],
          },
        },
        options: [
          {
            name: "Criar",
            value: "create",
            description: "Criar um novo contato",
            action: "Criar um contato",
          },
          {
            name: "Atualizar",
            value: "update",
            description: "Atualizar um contato existente",
            action: "Atualizar um contato",
          },
          {
            name: "Listar",
            value: "getAll",
            description: "Listar contatos",
            action: "Listar contatos",
          },
          {
            name: "Obter",
            value: "get",
            description: "Obter um contato pelo ID",
            action: "Obter um contato",
          },
        ],
        default: "getAll",
      },

      // ===== CAMPOS PARA LISTAR CONTATOS =====
      {
        displayName: "Filtros",
        name: "filters",
        type: "collection",
        placeholder: "Adicionar Filtro",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["getAll"],
          },
        },
        options: [
          {
            displayName: "Página",
            name: "page",
            type: "number",
            default: 1,
            description: "Número da página listada. Valor padrão é 1",
          },
          {
            displayName: "Limite",
            name: "limit",
            type: "number",
            default: 20,
            description:
              "Limite de contatos que virão por listagem. Valor padrão é 20. Valor máximo é 200",
          },
          {
            displayName: "Ordenar Por",
            name: "order",
            type: "options",
            options: [
              {
                name: "Nome",
                value: "name",
              },
              {
                name: "Data de Criação",
                value: "created_at",
              },
              {
                name: "Data de Atualização",
                value: "updated_at",
              },
            ],
            default: "name",
            description: "Campo para ordenação",
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
            default: "asc",
            description: 'Ordenação da lista. "asc" ou "desc", padrão é "asc"',
          },
          {
            displayName: "Busca",
            name: "q",
            type: "string",
            default: "",
            description: "Busca por nome do contato",
          },
          {
            displayName: "E-mail",
            name: "email",
            type: "string",
            default: "",
            description: "Filtrar por e-mail do contato",
          },
          {
            displayName: "Telefone",
            name: "phone",
            type: "string",
            default: "",
            description: "Filtrar por telefone do contato",
          },
          {
            displayName: "Cargo",
            name: "title",
            type: "string",
            default: "",
            description: "Filtrar por cargo do contato",
          },
          {
            displayName: "ID da Organização",
            name: "organization_id",
            type: "string",
            default: "",
            description: "ID da organização à qual o contato pertence",
          },
          {
            displayName: "ID do Usuário",
            name: "user_id",
            type: "string",
            default: "",
            description: "ID do usuário responsável pelo contato",
          },
        ],
      },

      // ===== CAMPOS PARA OBTER CONTATO =====
      {
        displayName: "ID do Contato",
        name: "contact_id",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["get", "update"],
          },
        },
        description: "ID do contato",
      },

      // ===== CAMPOS PARA CRIAR CONTATO =====
      {
        displayName: "Nome",
        name: "name",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["create"],
          },
        },
        description: "Nome do contato (obrigatório, mínimo 2 caracteres)",
      },

      // ===== CAMPOS PARA CRIAR/ATUALIZAR CONTATO =====
      {
        displayName: "Dados do Contato",
        name: "contactData",
        type: "collection",
        placeholder: "Adicionar Campo",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            displayName: "Nome",
            name: "name",
            type: "string",
            default: "",
            description: "Nome do contato (mínimo 2 caracteres)",
            displayOptions: {
              show: {
                "/operation": ["update"],
              },
            },
          },
          {
            displayName: "Cargo",
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
            description: "Data de aniversário (formato: yyyy-mm-dd)",
          },
          {
            displayName: "ID da Organização",
            name: "organization_id",
            type: "string",
            default: "",
            description: "ID da organização à qual o contato pertence",
          },
          {
            displayName: "IDs das Negociações",
            name: "deal_ids",
            type: "string",
            default: "",
            description:
              "IDs das negociações separados por vírgula (ex: id1,id2,id3)",
          },
          {
            displayName: "Facebook",
            name: "facebook",
            type: "string",
            default: "",
            description: "Perfil do Facebook",
          },
          {
            displayName: "LinkedIn",
            name: "linkedin",
            type: "string",
            default: "",
            description: "Perfil do LinkedIn",
          },
          {
            displayName: "Skype",
            name: "skype",
            type: "string",
            default: "",
            description: "Usuário do Skype",
          },
        ],
      },

      // E-mails do contato
      {
        displayName: "E-mails",
        name: "emails",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar E-mail",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["create", "update"],
          },
        },
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
                description: "Endereço de e-mail",
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

      // Telefones do contato
      {
        displayName: "Telefones",
        name: "phones",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Telefone",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["create", "update"],
          },
        },
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
                description: "Número de telefone",
                required: true,
              },
              {
                displayName: "Tipo",
                name: "type",
                type: "options",
                options: [
                  {
                    name: "Celular",
                    value: "mobile",
                  },
                  {
                    name: "Residencial",
                    value: "home",
                  },
                  {
                    name: "Comercial",
                    value: "work",
                  },
                  {
                    name: "Fax",
                    value: "fax",
                  },
                ],
                default: "mobile",
                description: "Tipo de telefone",
              },
            ],
          },
        ],
      },

      // Campos customizados
      {
        displayName: "Campos Customizados",
        name: "contact_custom_fields",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Campo Customizado",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
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

      // Base legal
      {
        displayName: "Base Legal",
        name: "legal_bases",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Base Legal",
        default: {},
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            name: "legalBaseValues",
            displayName: "Base Legal",
            values: [
              {
                displayName: "ID da Base Legal",
                name: "id",
                type: "string",
                default: "",
                description: "ID da base legal",
              },
              {
                displayName: "Categoria",
                name: "category",
                type: "string",
                default: "",
                description: "Categoria da base legal",
              },
            ],
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
          uri: "", // Uri será definido conforme a operação
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          json: true,
          resolveWithFullResponse: true,
        };

        if (resource === "contact") {
          if (operation === "getAll") {
            // LISTAR CONTATOS
            options.method = "GET";
            options.uri = `${baseUrl}/contacts`;

            // Obter filtros
            const filters = this.getNodeParameter("filters", i) as any;
            const qs: Record<string, any> = {};

            // Adicionar filtros
            if (filters.page) qs.page = filters.page;
            if (filters.limit) qs.limit = filters.limit;
            if (filters.order) qs.order = filters.order;
            if (filters.direction) qs.direction = filters.direction;
            if (filters.q) qs.q = filters.q;
            if (filters.email) qs.email = filters.email;
            if (filters.phone) qs.phone = filters.phone;
            if (filters.title) qs.title = filters.title;
            if (filters.organization_id)
              qs.organization_id = filters.organization_id;
            if (filters.user_id) qs.user_id = filters.user_id;

            options.qs = qs;
          } else if (operation === "get") {
            // OBTER CONTATO
            const contactId = this.getNodeParameter("contact_id", i) as string;

            if (!contactId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID do contato é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "GET";
            options.uri = `${baseUrl}/contacts/${contactId}`;
          } else if (operation === "create") {
            // CRIAR CONTATO
            options.method = "POST";
            options.uri = `${baseUrl}/contacts`;

            const name = this.getNodeParameter("name", i) as string;

            if (!name || name.length < 2) {
              throw new NodeOperationError(
                this.getNode(),
                "Nome do contato é obrigatório e deve ter no mínimo 2 caracteres!",
                { itemIndex: i }
              );
            }

            // Construir o corpo da requisição
            const body: any = {
              contact: {
                name,
              },
            };

            // Dados do contato
            const contactData = this.getNodeParameter("contactData", i) as any;
            if (contactData.title) body.contact.title = contactData.title;
            if (contactData.birthday) {
              const date = new Date(contactData.birthday);
              body.contact.birthday = date.toISOString().split("T")[0];
            }
            if (contactData.organization_id)
              body.contact.organization_id = contactData.organization_id;
            if (contactData.deal_ids) {
              const dealIds = contactData.deal_ids
                .split(",")
                .map((id: string) => id.trim());
              body.contact.deal_ids = dealIds;
            }
            if (contactData.facebook)
              body.contact.facebook = contactData.facebook;
            if (contactData.linkedin)
              body.contact.linkedin = contactData.linkedin;
            if (contactData.skype) body.contact.skype = contactData.skype;

            // E-mails
            const emails = this.getNodeParameter("emails", i) as any;
            if (emails.emailValues && emails.emailValues.length > 0) {
              body.contact.emails = emails.emailValues.map((e: any) => ({
                email: e.email,
                type: e.type || "personal",
                primary: e.primary || false,
              }));
            }

            // Telefones
            const phones = this.getNodeParameter("phones", i) as any;
            if (phones.phoneValues && phones.phoneValues.length > 0) {
              body.contact.phones = phones.phoneValues.map((p: any) => ({
                phone: p.phone,
                type: p.type || "",
              }));
            }

            // Campos customizados
            const customFields = this.getNodeParameter(
              "contact_custom_fields",
              i
            ) as any;
            if (
              customFields.customFieldValues &&
              customFields.customFieldValues.length > 0
            ) {
              body.contact.contact_custom_fields =
                customFields.customFieldValues.map((field: any) => ({
                  custom_field_id: field.custom_field_id,
                  value: field.value,
                }));
            }

            // Base legal
            const legalBases = this.getNodeParameter("legal_bases", i) as any;
            if (
              legalBases.legalBaseValues &&
              legalBases.legalBaseValues.length > 0
            ) {
              body.contact.legal_bases = legalBases.legalBaseValues;
            }

            options.body = body;
          } else if (operation === "update") {
            // ATUALIZAR CONTATO
            const contactId = this.getNodeParameter("contact_id", i) as string;

            if (!contactId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID do contato é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "PUT";
            options.uri = `${baseUrl}/contacts/${contactId}`;

            // Construir o corpo da requisição
            const body: any = {
              contact: {},
            };

            // Dados do contato
            const contactData = this.getNodeParameter("contactData", i) as any;
            if (contactData.name && contactData.name.length >= 2)
              body.contact.name = contactData.name;
            if (contactData.title) body.contact.title = contactData.title;
            if (contactData.birthday) {
              const date = new Date(contactData.birthday);
              body.contact.birthday = date.toISOString().split("T")[0];
            }
            if (contactData.organization_id)
              body.contact.organization_id = contactData.organization_id;
            if (contactData.deal_ids) {
              const dealIds = contactData.deal_ids
                .split(",")
                .map((id: string) => id.trim());
              body.contact.deal_ids = dealIds;
            }
            if (contactData.facebook)
              body.contact.facebook = contactData.facebook;
            if (contactData.linkedin)
              body.contact.linkedin = contactData.linkedin;
            if (contactData.skype) body.contact.skype = contactData.skype;

            // E-mails
            const emails = this.getNodeParameter("emails", i) as any;
            if (emails.emailValues && emails.emailValues.length > 0) {
              body.contact.emails = emails.emailValues.map((e: any) => ({
                email: e.email,
                type: e.type || "personal",
                primary: e.primary || false,
              }));
            }

            // Telefones
            const phones = this.getNodeParameter("phones", i) as any;
            if (phones.phoneValues && phones.phoneValues.length > 0) {
              body.contact.phones = phones.phoneValues.map((p: any) => ({
                phone: p.phone,
                type: p.type || "",
              }));
            }

            // Campos customizados
            const customFields = this.getNodeParameter(
              "contact_custom_fields",
              i
            ) as any;
            if (
              customFields.customFieldValues &&
              customFields.customFieldValues.length > 0
            ) {
              body.contact.contact_custom_fields =
                customFields.customFieldValues.map((field: any) => ({
                  custom_field_id: field.custom_field_id,
                  value: field.value,
                }));
            }

            // Base legal
            const legalBases = this.getNodeParameter("legal_bases", i) as any;
            if (
              legalBases.legalBaseValues &&
              legalBases.legalBaseValues.length > 0
            ) {
              body.contact.legal_bases = legalBases.legalBaseValues;
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
