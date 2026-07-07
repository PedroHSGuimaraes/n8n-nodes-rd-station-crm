import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";
import { OptionsWithUri } from "request-promise-native";

/**
 * Classe para o nó de Organizações do RD Station CRM
 * Este nó permite interações com a API de Organizações (Organizations) do RD Station CRM.
 *
 * Documentação oficial: https://developers.rdstation.com/reference/api-rd-station-doc
 */
export class RdStationCrmCompanies implements INodeType {
  description: INodeTypeDescription = {
    // Informações básicas do nó
    displayName: "RD Station CRM Organizações",
    name: "rdStationCrmCompanies",
    icon: "file:rdstation.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Operações com organizações no RD Station CRM",
    defaults: {
      name: "RD Station CRM Organizações",
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
            name: "Organização",
            value: "organization",
          },
        ],
        default: "organization",
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
            resource: ["organization"],
          },
        },
        options: [
          {
            name: "Criar",
            value: "create",
            description: "Criar uma nova organização",
            action: "Criar uma organização",
          },
          {
            name: "Atualizar",
            value: "update",
            description: "Atualizar uma organização existente",
            action: "Atualizar uma organização",
          },
          {
            name: "Listar",
            value: "getAll",
            description: "Listar organizações",
            action: "Listar organizações",
          },
          {
            name: "Obter",
            value: "get",
            description: "Obter uma organização pelo ID",
            action: "Obter uma organização",
          },
          {
            name: "Listar Contatos",
            value: "getContacts",
            description: "Listar contatos associados a uma organização",
            action: "Listar contatos de uma organização",
          },
        ],
        default: "getAll",
      },

      // ===== CAMPOS PARA LISTAR ORGANIZAÇÕES =====
      {
        displayName: "Filtros",
        name: "filters",
        type: "collection",
        placeholder: "Adicionar Filtro",
        default: {},
        displayOptions: {
          show: {
            resource: ["organization"],
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
              "Limite de organizações que virão por listagem. Valor padrão é 20. Valor máximo é 200",
          },
          {
            displayName: "Ordenar Por",
            name: "order",
            type: "string",
            default: "name",
            description: 'Campo para ordenação. Valor padrão é "name"',
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
            description: "Busca por nome da organização",
          },
          {
            displayName: "ID do Segmento",
            name: "organization_segment_id",
            type: "string",
            default: "",
            description: "ID do segmento da organização",
          },
          {
            displayName: "ID do Usuário",
            name: "user_id",
            type: "string",
            default: "",
            description: "ID do usuário responsável pela organização",
          },
        ],
      },

      // ===== CAMPOS PARA OBTER/ATUALIZAR ORGANIZAÇÃO =====
      {
        displayName: "ID da Organização",
        name: "organization_id",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["organization"],
            operation: ["get", "update", "getContacts"],
          },
        },
        description: "ID da organização",
      },

      // ===== CAMPOS PARA CRIAR ORGANIZAÇÃO =====
      {
        displayName: "Nome",
        name: "name",
        type: "string",
        default: "",
        required: true,
        displayOptions: {
          show: {
            resource: ["organization"],
            operation: ["create"],
          },
        },
        description:
          "Nome da organização (obrigatório, mínimo 2 caracteres, deve ser único)",
      },

      // ===== CAMPOS PARA CRIAR/ATUALIZAR ORGANIZAÇÃO =====
      {
        displayName: "Dados da Organização",
        name: "organizationData",
        type: "collection",
        placeholder: "Adicionar Campo",
        default: {},
        displayOptions: {
          show: {
            resource: ["organization"],
            operation: ["create", "update"],
          },
        },
        options: [
          {
            displayName: "Nome",
            name: "name",
            type: "string",
            default: "",
            description:
              "Nome da organização (mínimo 2 caracteres, deve ser único)",
            displayOptions: {
              show: {
                "/operation": ["update"],
              },
            },
          },
          {
            displayName: "ID do Segmento",
            name: "organization_segment_id",
            type: "string",
            default: "",
            description: "ID do segmento da organização",
          },
          {
            displayName: "Site",
            name: "website",
            type: "string",
            default: "",
            description: "URL do site da organização",
          },
          {
            displayName: "E-mail",
            name: "email",
            type: "string",
            default: "",
            description: "E-mail de contato geral da organização",
          },
          {
            displayName: "Endereço",
            name: "address",
            type: "string",
            default: "",
            description: "Endereço da organização",
          },
        ],
      },

      // Telefones da organização
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
            resource: ["organization"],
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
                type: "string",
                default: "",
                description: "Tipo de telefone (ex: work, fax, other)",
              },
            ],
          },
        ],
      },

      // Campos customizados
      {
        displayName: "Campos Customizados",
        name: "organization_custom_fields",
        type: "fixedCollection",
        typeOptions: {
          multipleValues: true,
        },
        placeholder: "Adicionar Campo Customizado",
        default: {},
        displayOptions: {
          show: {
            resource: ["organization"],
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

      // ===== PARÂMETROS PARA LISTAR CONTATOS DA ORGANIZAÇÃO =====
      {
        displayName: "Parâmetros de Listagem",
        name: "contactListParams",
        type: "collection",
        placeholder: "Adicionar Parâmetro",
        default: {},
        displayOptions: {
          show: {
            resource: ["organization"],
            operation: ["getContacts"],
          },
        },
        options: [
          {
            displayName: "Página",
            name: "page",
            type: "number",
            default: 1,
            description: "Página da listagem de contatos. Valor padrão é 1",
          },
          {
            displayName: "Limite",
            name: "limit",
            type: "number",
            default: 20,
            description:
              "Limite de contatos que virão por listagem. Valor padrão é 20. Valor máximo é 200",
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

        if (resource === "organization") {
          if (operation === "getAll") {
            // LISTAR ORGANIZAÇÕES
            options.method = "GET";
            options.uri = `${baseUrl}/organizations`;

            // Obter filtros
            const filters = this.getNodeParameter("filters", i) as any;
            const qs: Record<string, any> = {};

            // Adicionar filtros
            if (filters.page) qs.page = filters.page;
            if (filters.limit) qs.limit = filters.limit;
            if (filters.order) qs.order = filters.order;
            if (filters.direction) qs.direction = filters.direction;
            if (filters.q) qs.q = filters.q;
            if (filters.organization_segment_id)
              qs.organization_segment_id = filters.organization_segment_id;
            if (filters.user_id) qs.user_id = filters.user_id;

            options.qs = qs;
          } else if (operation === "get") {
            // OBTER ORGANIZAÇÃO
            const organizationId = this.getNodeParameter(
              "organization_id",
              i
            ) as string;

            if (!organizationId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID da organização é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "GET";
            options.uri = `${baseUrl}/organizations/${organizationId}`;
          } else if (operation === "getContacts") {
            // LISTAR CONTATOS DA ORGANIZAÇÃO
            const organizationId = this.getNodeParameter(
              "organization_id",
              i
            ) as string;

            if (!organizationId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID da organização é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "GET";
            options.uri = `${baseUrl}/organizations/${organizationId}/contacts`;

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
            // CRIAR ORGANIZAÇÃO
            options.method = "POST";
            options.uri = `${baseUrl}/organizations`;

            const name = this.getNodeParameter("name", i) as string;

            if (!name || name.length < 2) {
              throw new NodeOperationError(
                this.getNode(),
                "Nome da organização é obrigatório e deve ter no mínimo 2 caracteres!",
                { itemIndex: i }
              );
            }

            // Construir o corpo da requisição
            const body: any = {
              organization: {
                name,
              },
            };

            // Dados da organização
            const organizationData = this.getNodeParameter(
              "organizationData",
              i
            ) as any;
            if (organizationData.organization_segment_id)
              body.organization.organization_segment_id =
                organizationData.organization_segment_id;
            if (organizationData.website)
              body.organization.website = organizationData.website;
            if (organizationData.email)
              body.organization.email = organizationData.email;
            if (organizationData.address)
              body.organization.address = organizationData.address;

            // Telefones
            const phones = this.getNodeParameter("phones", i) as any;
            if (phones.phoneValues && phones.phoneValues.length > 0) {
              body.organization.phones = phones.phoneValues.map((p: any) => ({
                phone: p.phone,
                type: p.type || "",
              }));
            }

            // Campos customizados
            const customFields = this.getNodeParameter(
              "organization_custom_fields",
              i
            ) as any;
            if (
              customFields.customFieldValues &&
              customFields.customFieldValues.length > 0
            ) {
              body.organization.organization_custom_fields =
                customFields.customFieldValues.map((field: any) => ({
                  custom_field_id: field.custom_field_id,
                  value: field.value,
                }));
            }

            options.body = body;
          } else if (operation === "update") {
            // ATUALIZAR ORGANIZAÇÃO
            const organizationId = this.getNodeParameter(
              "organization_id",
              i
            ) as string;

            if (!organizationId) {
              throw new NodeOperationError(
                this.getNode(),
                "ID da organização é obrigatório!",
                { itemIndex: i }
              );
            }

            options.method = "PUT";
            options.uri = `${baseUrl}/organizations/${organizationId}`;

            // Construir o corpo da requisição
            const body: any = {
              organization: {},
            };

            // Dados da organização
            const organizationData = this.getNodeParameter(
              "organizationData",
              i
            ) as any;
            if (organizationData.name && organizationData.name.length >= 2)
              body.organization.name = organizationData.name;
            if (organizationData.organization_segment_id)
              body.organization.organization_segment_id =
                organizationData.organization_segment_id;
            if (organizationData.website)
              body.organization.website = organizationData.website;
            if (organizationData.email)
              body.organization.email = organizationData.email;
            if (organizationData.address)
              body.organization.address = organizationData.address;

            // Telefones
            const phones = this.getNodeParameter("phones", i) as any;
            if (phones.phoneValues && phones.phoneValues.length > 0) {
              body.organization.phones = phones.phoneValues.map((p: any) => ({
                phone: p.phone,
                type: p.type || "",
              }));
            }

            // Campos customizados
            const customFields = this.getNodeParameter(
              "organization_custom_fields",
              i
            ) as any;
            if (
              customFields.customFieldValues &&
              customFields.customFieldValues.length > 0
            ) {
              body.organization.organization_custom_fields =
                customFields.customFieldValues.map((field: any) => ({
                  custom_field_id: field.custom_field_id,
                  value: field.value,
                }));
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
