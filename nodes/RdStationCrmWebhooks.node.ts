import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Webhooks do RD Station CRM
 * Este nó permite gerenciar webhooks (notificações HTTP) do RD Station CRM.
 * 
 * Os webhooks permitem que o RD Station CRM notifique sistemas externos quando
 * determinados eventos ocorrem (como criação de negócios, atualização de contatos, etc.).
 * Isso possibilita integrações em tempo real com outras ferramentas e sistemas.
 * 
 * Este nó implementa operações completas de CRUD (Criar, Ler, Atualizar, Deletar)
 * para gerenciar os webhooks configurados na conta do CRM.
 */
export class RdStationCrmWebhooks implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Webhooks',
		name: 'rdStationCrmWebhooks',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Gerenciar webhooks no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Webhooks', // Nome padrão quando o nó é adicionado
		},
		inputs: ['main'], // Define que o nó aceita uma entrada principal
		outputs: ['main'], // Define que o nó tem uma saída principal
		credentials: [
			{
				// Define que o nó requer credenciais do tipo rdStationCrmApi
				name: 'rdStationCrmApi',
				required: true, // As credenciais são obrigatórias
			},
		],
		properties: [
			// Seleção do recurso (neste caso, só temos webhooks)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Webhook', // Nome amigável da opção
						value: 'webhook', // Valor interno da opção
					},
				],
				default: 'webhook', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre os webhooks
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'webhook'
						resource: [
							'webhook',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para webhooks
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar todos os webhooks',
						action: 'Listar webhooks',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter um webhook pelo ID',
						action: 'Obter um webhook',
					},
					{
						name: 'Criar', // Operação para criar novo webhook
						value: 'create',
						description: 'Criar um novo webhook',
						action: 'Criar um webhook',
					},
					{
						name: 'Atualizar', // Operação para atualizar webhook existente
						value: 'update',
						description: 'Atualizar um webhook existente',
						action: 'Atualizar um webhook',
					},
					{
						name: 'Deletar', // Operação para remover webhook
						value: 'delete',
						description: 'Deletar um webhook',
						action: 'Deletar um webhook',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campos para a operação OBTER WEBHOOK, ATUALIZAR WEBHOOK e DELETAR WEBHOOK
			{
				displayName: 'ID do Webhook', // Campo para informar ID do webhook
				name: 'webhookId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando operação for 'get', 'update' ou 'delete'
						resource: [
							'webhook',
						],
						operation: [
							'get',
							'update',
							'delete',
						],
					},
				},
				description: 'ID do webhook a ser consultado, atualizado ou deletado',
			},

			// Campos para a operação LISTAR WEBHOOKS
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'webhook' e operação é 'getAll'
						resource: [
							'webhook',
						],
						operation: [
							'getAll',
						],
					},
				},
				options: [
					// Opções de filtragem e paginação para listagem
					{
						displayName: 'Limite', // Controle de quantos itens retornar
						name: 'limit',
						type: 'number',
						default: 50,
						description: 'Número máximo de webhooks a retornar',
					},
					{
						displayName: 'Página', // Para navegação entre páginas
						name: 'page',
						type: 'number',
						default: 1,
						description: 'Número da página para retornar',
					},
					{
						displayName: 'Ordenação', // Campo para ordenar resultados
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'Data de Criação', // Do mais antigo ao mais recente
								value: 'created_at',
							},
							{
								name: 'URL', // Ordem alfabética por URL
								value: 'url',
							},
						],
						default: 'created_at',
						description: 'Campo pelo qual ordenar os resultados',
					},
					{
						displayName: 'Direção da Ordenação', // Crescente ou decrescente
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascendente', // Mais antigo primeiro ou A-Z
								value: 'asc',
							},
							{
								name: 'Descendente', // Mais recente primeiro ou Z-A
								value: 'desc',
							},
						],
						default: 'desc',
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
					{
						displayName: 'Status', // Filtrar por status do webhook
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Ativo', // Webhooks ativos
								value: 'active',
							},
							{
								name: 'Inativo', // Webhooks desativados
								value: 'inactive',
							},
							{
								name: 'Todos', // Ambos os status
								value: 'all',
							},
						],
						default: 'active',
						description: 'Filtrar webhooks por status',
					},
					{
						displayName: 'Evento', // Filtrar por tipo de evento
						name: 'event',
						type: 'options',
						options: [
							{
								name: 'Negócio Criado', // Quando um negócio é criado
								value: 'deal.created',
							},
							{
								name: 'Negócio Atualizado', // Quando um negócio é atualizado
								value: 'deal.updated',
							},
							{
								name: 'Contato Criado', // Quando um contato é criado
								value: 'contact.created',
							},
							{
								name: 'Contato Atualizado', // Quando um contato é atualizado
								value: 'contact.updated',
							},
							{
								name: 'Tarefa Criada', // Quando uma tarefa é criada
								value: 'task.created',
							},
							{
								name: 'Tarefa Atualizada', // Quando uma tarefa é atualizada
								value: 'task.updated',
							},
						],
						default: '',
						description: 'Filtrar webhooks por tipo de evento que dispara a notificação',
					},
				],
			},

			// Campos para as operações CRIAR e ATUALIZAR WEBHOOK
			{
				displayName: 'Dados do Webhook', // Título da seção de dados do webhook
				name: 'webhookData',
				type: 'collection', // Tipo coleção para agrupar campos relacionados
				placeholder: 'Adicionar Campos', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostrar apenas quando operação for 'create' ou 'update'
						resource: [
							'webhook',
						],
						operation: [
							'create',
							'update',
						],
					},
				},
				options: [
					{
						displayName: 'URL de Callback', // URL para onde o webhook enviará as notificações
						name: 'url',
						type: 'string',
						default: '',
						description: 'URL para onde as notificações serão enviadas quando o evento ocorrer',
						required: true, // Campo obrigatório para criar webhook
					},
					{
						displayName: 'Eventos', // Tipos de eventos que acionarão o webhook
						name: 'events',
						type: 'multiOptions', // Permite selecionar múltiplos eventos
						options: [
							{
								name: 'Negócio Criado', // Quando um negócio é criado
								value: 'deal.created',
							},
							{
								name: 'Negócio Atualizado', // Quando um negócio é atualizado
								value: 'deal.updated',
							},
							{
								name: 'Contato Criado', // Quando um contato é criado
								value: 'contact.created',
							},
							{
								name: 'Contato Atualizado', // Quando um contato é atualizado
								value: 'contact.updated',
							},
							{
								name: 'Tarefa Criada', // Quando uma tarefa é criada
								value: 'task.created',
							},
							{
								name: 'Tarefa Atualizada', // Quando uma tarefa é atualizada
								value: 'task.updated',
							},
						],
						default: [], // Valor padrão (nenhum evento selecionado)
						description: 'Eventos que dispararão o webhook',
						required: true, // Campo obrigatório para criar webhook
					},
					{
						displayName: 'Status', // Define se o webhook está ativo ou inativo
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Ativo', // Webhook ativo (enviará notificações)
								value: 'active',
							},
							{
								name: 'Inativo', // Webhook inativo (não enviará notificações)
								value: 'inactive',
							},
						],
						default: 'active',
						description: 'Status do webhook (ativo enviará notificações, inativo não)',
					},
					{
						displayName: 'Formato de Entrega', // Formato dos dados enviados pelo webhook
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'JSON', // Dados em formato JSON
								value: 'json',
							},
							{
								name: 'XML', // Dados em formato XML
								value: 'xml',
							},
						],
						default: 'json',
						description: 'Formato dos dados que serão enviados para a URL de callback',
					},
					{
						displayName: 'Cabeçalhos HTTP', // Cabeçalhos personalizados para enviar junto com a notificação
						name: 'headers',
						type: 'fixedCollection', // Coleção de pares chave-valor
						typeOptions: {
							multipleValues: true, // Permite múltiplos pares de cabeçalhos
						},
						default: {}, // Valor padrão (nenhum cabeçalho)
						placeholder: 'Adicionar Cabeçalho',
						options: [
							{
								name: 'headers', // Nome da coleção
								displayName: 'Cabeçalhos', // Label para a coleção
								values: [
									{
										displayName: 'Nome', // Nome do cabeçalho
										name: 'name',
										type: 'string',
										default: '',
										description: 'Nome do cabeçalho HTTP',
									},
									{
										displayName: 'Valor', // Valor do cabeçalho
										name: 'value',
										type: 'string',
										default: '',
										description: 'Valor do cabeçalho HTTP',
									},
								],
							},
						],
						description: 'Cabeçalhos HTTP personalizados para enviar junto com a requisição de webhook',
					},
				],
			},
		],
	};

	/**
	 * Método principal que executa o nó com base na operação selecionada
	 * Este método é chamado pelo n8n quando o fluxo é executado
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(); // Obtém os dados de entrada
		const returnData: INodeExecutionData[] = []; // Array para armazenar resultados
		
		// URL base da API do RD Station CRM
		const baseUrl = 'https://crm.rdstation.com/api/v1';
		const resource = this.getNodeParameter('resource', 0) as string; // Obtém o recurso selecionado
		const operation = this.getNodeParameter('operation', 0) as string; // Obtém a operação selecionada
		
		// Para cada item de entrada, processa a operação solicitada
		for (let i = 0; i < items.length; i++) {
			try {
				// Configuração comum para todas as requisições HTTP
				const options: OptionsWithUri = {
					uri: '', // Uri inicial vazio, será definido conforme a operação
					headers: {
						'Accept': 'application/json', // Aceita respostas em JSON
						'Content-Type': 'application/json', // Envia dados em formato JSON
					},
					json: true, // Processa automaticamente respostas JSON
					resolveWithFullResponse: true, // Retorna o objeto de resposta completo
				};
				
				// Vamos determinar qual operação executar com base no recurso e operação selecionados
				if (resource === 'webhook') {
					if (operation === 'getAll') {
						// Operação: LISTAR WEBHOOKS
						
						// Preparando a requisição para listar webhooks
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/webhooks`; // Endpoint de webhooks
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listParameters', i) as {
							limit?: number;
							page?: number;
							order?: string;
							direction?: string;
							status?: string;
							event?: string;
						};
						
						const qs: Record<string, any> = {}; // Objeto para parâmetros de query string
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						if (listParameters.status) qs.status = listParameters.status;
						if (listParameters.event) qs.event = listParameters.event;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'get') {
						// Operação: OBTER WEBHOOK ESPECÍFICO
						
						// Obtém o ID do webhook a ser consultado
						const webhookId = this.getNodeParameter('webhookId', i) as string;
						
						// Verifica se o ID do webhook foi fornecido
						if (!webhookId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de webhook válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar um webhook específico
						options.method = 'GET';
						options.uri = `${baseUrl}/webhooks/${webhookId}`; // Endpoint com ID do webhook
						
					} else if (operation === 'create') {
						// Operação: CRIAR NOVO WEBHOOK
						
						// Preparando a requisição para criar webhook
						options.method = 'POST';
						options.uri = `${baseUrl}/webhooks`;
						
						// Obtendo os dados do webhook a ser criado
						const webhookData = this.getNodeParameter('webhookData', i) as {
							url: string;
							events: string[];
							status?: string;
							format?: string;
							headers?: { headers: Array<{ name: string; value: string }> };
						};
						
						// Verifica se os campos obrigatórios foram fornecidos
						if (!webhookData.url) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer uma URL de callback para o webhook!', { itemIndex: i });
						}
						
						if (!webhookData.events || webhookData.events.length === 0) {
							throw new NodeOperationError(this.getNode(), 'É necessário selecionar pelo menos um evento para acionar o webhook!', { itemIndex: i });
						}
						
						// Preparando o corpo da requisição
						const body: Record<string, any> = {
							url: webhookData.url,
							events: webhookData.events,
						};
						
						// Adicionando campos opcionais se fornecidos
						if (webhookData.status) body.status = webhookData.status;
						if (webhookData.format) body.format = webhookData.format;
						
						// Processando cabeçalhos HTTP personalizados se fornecidos
						if (webhookData.headers && webhookData.headers.headers && webhookData.headers.headers.length > 0) {
							const headers: Record<string, string> = {};
							
							// Convertendo o array de pares nome/valor para um objeto de cabeçalhos
							for (const header of webhookData.headers.headers) {
								if (header.name && header.value) {
									headers[header.name] = header.value;
								}
							}
							
							// Adicionando cabeçalhos ao corpo da requisição
							if (Object.keys(headers).length > 0) {
								body.headers = headers;
							}
						}
						
						options.body = body; // Anexa o corpo à requisição
						
					} else if (operation === 'update') {
						// Operação: ATUALIZAR WEBHOOK EXISTENTE
						
						// Obtém o ID do webhook a ser atualizado
						const webhookId = this.getNodeParameter('webhookId', i) as string;
						
						// Verifica se o ID do webhook foi fornecido
						if (!webhookId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de webhook válido para atualização!', { itemIndex: i });
						}
						
						// Preparando a requisição para atualizar webhook
						options.method = 'PUT';
						options.uri = `${baseUrl}/webhooks/${webhookId}`;
						
						// Obtendo os dados atualizados do webhook
						const webhookData = this.getNodeParameter('webhookData', i) as {
							url?: string;
							events?: string[];
							status?: string;
							format?: string;
							headers?: { headers: Array<{ name: string; value: string }> };
						};
						
						// Preparando o corpo da requisição com os campos a atualizar
						const body: Record<string, any> = {};
						
						// Adicionando apenas os campos que foram fornecidos
						if (webhookData.url) body.url = webhookData.url;
						if (webhookData.events && webhookData.events.length > 0) body.events = webhookData.events;
						if (webhookData.status) body.status = webhookData.status;
						if (webhookData.format) body.format = webhookData.format;
						
						// Processando cabeçalhos HTTP personalizados se fornecidos
						if (webhookData.headers && webhookData.headers.headers && webhookData.headers.headers.length > 0) {
							const headers: Record<string, string> = {};
							
							// Convertendo o array de pares nome/valor para um objeto de cabeçalhos
							for (const header of webhookData.headers.headers) {
								if (header.name && header.value) {
									headers[header.name] = header.value;
								}
							}
							
							// Adicionando cabeçalhos ao corpo da requisição
							if (Object.keys(headers).length > 0) {
								body.headers = headers;
							}
						}
						
						// Verifica se pelo menos um campo para atualização foi fornecido
						if (Object.keys(body).length === 0) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer pelo menos um campo para atualizar o webhook!', { itemIndex: i });
						}
						
						options.body = body; // Anexa o corpo à requisição
						
					} else if (operation === 'delete') {
						// Operação: DELETAR WEBHOOK
						
						// Obtém o ID do webhook a ser deletado
						const webhookId = this.getNodeParameter('webhookId', i) as string;
						
						// Verifica se o ID do webhook foi fornecido
						if (!webhookId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de webhook válido para exclusão!', { itemIndex: i });
						}
						
						// Configurando a requisição para deletar um webhook
						options.method = 'DELETE';
						options.uri = `${baseUrl}/webhooks/${webhookId}`; // Endpoint com ID do webhook
					}
				}
				
				// Executa a requisição HTTP com as opções configuradas e autenticação
				const response = await this.helpers.requestWithAuthentication.call(
					this,
					'rdStationCrmApi', // Usa as credenciais configuradas
					options, // Opções da requisição
				);
				
				// Extrai os dados da resposta e adiciona ao retorno
				let responseData = {};
				
				// Para operações que retornam dados no corpo da resposta
				if (operation !== 'delete') {
					responseData = response.body;
				} else {
					// Para a operação de exclusão, que geralmente não retorna dados
					responseData = { success: true, message: 'Webhook deletado com sucesso' };
				}
				
				returnData.push({
					json: responseData, // Dados da resposta em formato JSON
					pairedItem: { item: i }, // Mantém o pareamento com o item de entrada
				});
				
			} catch (error) {
				// Trata e reporta erros ocorridos durante a execução
				if (this.continueOnFail()) {
					// Se configurado para continuar mesmo com falhas
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error), // Inclui a mensagem de erro
						},
						pairedItem: { item: i },
					});
					continue; // Continua para o próximo item
				}
				throw error; // Senão, propaga o erro para interromper a execução
			}
		}
		
		return [returnData]; // Retorna os dados processados
	}
}
