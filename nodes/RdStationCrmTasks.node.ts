import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Tarefas do RD Station CRM
 * Este nó permite interações com a API de Tarefas do RD Station CRM.
 * As tarefas são atividades agendadas vinculadas a um contato e a uma negociação,
 * como follow-up, ligação, reunião, etc.
 */
export class RdStationCrmTasks implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Tarefas',
		name: 'rdStationCrmTasks',
		icon: 'file:rdstation.svg', // Ícone a ser exibido na interface
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Operações com tarefas no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Tarefas', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (neste caso, só temos tarefas)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Tarefa', // Nome amigável da opção
						value: 'task', // Valor interno da opção
					},
				],
				default: 'task', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre as tarefas
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'task'
						resource: [
							'task',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para tarefas
					{
						name: 'Criar', // Operação de criação
						value: 'create',
						description: 'Criar uma nova tarefa',
						action: 'Criar uma tarefa',
					},
					{
						name: 'Atualizar', // Operação de atualização
						value: 'update',
						description: 'Atualizar uma tarefa existente',
						action: 'Atualizar uma tarefa',
					},
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar tarefas',
						action: 'Listar tarefas',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter uma tarefa pelo ID',
						action: 'Obter uma tarefa',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campos para a operação LISTAR TAREFAS
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'task' e operação é 'getAll'
						resource: [
							'task',
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
						description: 'Número máximo de tarefas a retornar',
					},
					{
						displayName: 'Página', // Para navegação entre páginas
						name: 'page',
						type: 'number',
						default: 1,
						description: 'Número da página para retornar',
					},
					{
						displayName: 'ID do Negócio', // Filtrar por negociação específica
						name: 'deal_id',
						type: 'string',
						default: '',
						description: 'Filtrar tarefas por negócio específico',
					},
					{
						displayName: 'ID do Usuário', // Filtrar por responsável
						name: 'user_id',
						type: 'string',
						default: '',
						description: 'Filtrar tarefas por usuário responsável',
					},
					{
						displayName: 'Status', // Filtrar por status da tarefa
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Pendentes', // Tarefas não concluídas
								value: 'pending',
							},
							{
								name: 'Concluídas', // Tarefas já finalizadas
								value: 'done',
							},
							{
								name: 'Todas', // Ambos os status
								value: 'all',
							},
						],
						default: 'pending',
						description: 'Status das tarefas a serem filtradas',
					},
					{
						displayName: 'Data Inicial', // Filtro por período - início
						name: 'start_date',
						type: 'string',
						default: '',
						description: 'Data inicial para filtrar tarefas (formato YYYY-MM-DD)',
					},
					{
						displayName: 'Data Final', // Filtro por período - fim
						name: 'end_date',
						type: 'string',
						default: '',
						description: 'Data final para filtrar tarefas (formato YYYY-MM-DD)',
					},
					{
						displayName: 'Ordenação', // Campo para ordenar resultados
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'Data de Vencimento', // Ordena por prazo da tarefa
								value: 'due_date',
							},
							{
								name: 'Data de Criação', // Ordena por quando foi criada
								value: 'created_at',
							},
						],
						default: 'due_date',
						description: 'Campo pelo qual ordenar os resultados',
					},
					{
						displayName: 'Direção da Ordenação', // Crescente ou decrescente
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascendente', // Do mais antigo para o mais recente
								value: 'asc',
							},
							{
								name: 'Descendente', // Do mais recente para o mais antigo
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
				],
			},

			// Campos para a operação OBTER TAREFA
			{
				displayName: 'ID da Tarefa', // Campo para informar ID da tarefa
				name: 'taskId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando operação for 'get' ou 'update'
						resource: [
							'task',
						],
						operation: [
							'get',
							'update',
						],
					},
				},
				description: 'ID da tarefa a ser consultada/atualizada',
			},

			// Campos para a operação CRIAR TAREFA
			{
				displayName: 'ID do Negócio', // Negócio ao qual a tarefa será vinculada
				name: 'dealId',
				type: 'string',
				default: '',
				required: true, // Campo obrigatório para criação
				displayOptions: {
					show: {
						resource: [
							'task',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'ID do negócio ao qual a tarefa está ligada (obrigatório)',
			},

			// Campos comuns para CRIAR e ATUALIZAR tarefas
			{
				displayName: 'Dados da Tarefa', // Seção para dados da tarefa
				name: 'taskData',
				type: 'collection', // Agrupamento de campos
				placeholder: 'Adicionar Dados',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'task',
						],
						operation: [
							'create',
							'update',
						],
					},
				},
				options: [
					// Campos de dados da tarefa
					{
						displayName: 'Título', // Nome/assunto da tarefa
						name: 'title',
						type: 'string',
						default: '',
						description: 'Título ou assunto da tarefa (obrigatório para criação)',
					},
					{
						displayName: 'Tipo', // Categoria da atividade
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Ligação', // Tarefa do tipo telefonema
								value: 'call',
							},
							{
								name: 'E-mail', // Tarefa do tipo email
								value: 'email',
							},
							{
								name: 'Visita', // Tarefa do tipo visita presencial
								value: 'visit',
							},
							{
								name: 'Reunião', // Tarefa do tipo reunião
								value: 'meeting',
							},
							{
								name: 'Tarefa', // Tarefa genérica
								value: 'task',
							},
							{
								name: 'Almoço', // Tarefa do tipo almoço/encontro
								value: 'lunch',
							},
							{
								name: 'WhatsApp', // Tarefa do tipo mensagem
								value: 'whatsapp',
							},
						],
						default: 'task',
						description: 'Tipo da tarefa (obrigatório para criação)',
					},
					{
						displayName: 'Data de Vencimento', // Data para realização
						name: 'due_date',
						type: 'string',
						default: '',
						description: 'Data de vencimento/realização (formato YYYY-MM-DD)',
					},
					{
						displayName: 'Horário', // Hora específica para a tarefa
						name: 'due_time',
						type: 'string',
						default: '',
						description: 'Horário da tarefa (formato HH:MM)',
					},
					{
						displayName: 'ID do Usuário Responsável', // Quem executará a tarefa
						name: 'user_id',
						type: 'string',
						default: '',
						description: 'ID do usuário atribuído à tarefa',
					},
					{
						displayName: 'Descrição', // Detalhes adicionais
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 4, // Campo de texto multi-linha
						},
						default: '',
						description: 'Descrição/detalhes adicionais da tarefa',
					},
					{
						displayName: 'Concluída', // Status de conclusão
						name: 'done',
						type: 'boolean',
						default: false,
						description: 'Se verdadeiro, marca a tarefa como concluída (apenas para atualização)',
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
				if (resource === 'task') {
					if (operation === 'getAll') {
						// Operação: LISTAR TAREFAS
						
						// Preparando a requisição para listar tarefas
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/tasks`; // Endpoint de tarefas
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listParameters', i) as {
							limit?: number;
							page?: number;
							deal_id?: string;
							user_id?: string;
							status?: string;
							start_date?: string;
							end_date?: string;
							order?: string;
							direction?: string;
						};
						
						const qs: Record<string, any> = {}; // Objeto para parâmetros de query string
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.deal_id) qs.deal_id = listParameters.deal_id;
						if (listParameters.user_id) qs.user_id = listParameters.user_id;
						if (listParameters.status) qs.status = listParameters.status;
						if (listParameters.start_date) qs.start_date = listParameters.start_date;
						if (listParameters.end_date) qs.end_date = listParameters.end_date;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'get') {
						// Operação: OBTER TAREFA ESPECÍFICA
						
						// Obtém o ID da tarefa a ser consultada
						const taskId = this.getNodeParameter('taskId', i) as string;
						
						// Verifica se o ID da tarefa foi fornecido
						if (!taskId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de tarefa válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar uma tarefa específica
						options.method = 'GET';
						options.uri = `${baseUrl}/tasks/${taskId}`; // Endpoint com ID da tarefa
						
					} else if (operation === 'create') {
						// Operação: CRIAR TAREFA
						
						// Configurando requisição para criar tarefa
						options.method = 'POST'; // Método HTTP POST para criação
						options.uri = `${baseUrl}/tasks`; // Endpoint de tarefas
						
						// Obtém o ID do negócio ao qual a tarefa será vinculada
						const dealId = this.getNodeParameter('dealId', i) as string;
						
						// Verifica se o ID do negócio foi fornecido (obrigatório)
						if (!dealId) {
							throw new NodeOperationError(
								this.getNode(),
								'O ID do negócio é obrigatório para criar uma tarefa!',
								{ itemIndex: i },
							);
						}
						
						// Obtendo os dados da tarefa definidos pelo usuário
						const taskData = this.getNodeParameter('taskData', i) as {
							title?: string;
							type?: string;
							due_date?: string;
							due_time?: string;
							user_id?: string;
							description?: string;
						};
						
						// Verificando se o título foi fornecido (obrigatório para criação)
						if (!taskData.title) {
							throw new NodeOperationError(
								this.getNode(),
								'O título da tarefa é obrigatório para criação!',
								{ itemIndex: i },
							);
						}
						
						// Verificando se o tipo foi fornecido (obrigatório para criação)
						if (!taskData.type) {
							throw new NodeOperationError(
								this.getNode(),
								'O tipo da tarefa é obrigatório para criação!',
								{ itemIndex: i },
							);
						}
						
						// Preparando o corpo da requisição combinando os dados
						const body: any = { 
							deal_id: dealId, // Vincula a tarefa ao negócio
							...taskData // Inclui todos os outros dados da tarefa
						};
						
						options.body = body; // Anexa o corpo à requisição
						
					} else if (operation === 'update') {
						// Operação: ATUALIZAR TAREFA
						
						// Obtém o ID da tarefa a ser atualizada
						const taskId = this.getNodeParameter('taskId', i) as string;
						
						// Verifica se o ID da tarefa foi fornecido
						if (!taskId) {
							throw new NodeOperationError(
								this.getNode(),
								'É necessário fornecer um ID de tarefa válido para atualização!',
								{ itemIndex: i },
							);
						}
						
						// Configurando a requisição para atualizar a tarefa
						options.method = 'PUT'; // Método HTTP PUT para atualização
						options.uri = `${baseUrl}/tasks/${taskId}`; // Endpoint com ID da tarefa
						
						// Obtendo os dados a serem atualizados
						const taskData = this.getNodeParameter('taskData', i) as {
							title?: string;
							type?: string;
							due_date?: string;
							due_time?: string;
							user_id?: string;
							description?: string;
							done?: boolean;
						};
						
						// Preparando o corpo da requisição com os dados a serem atualizados
						const body: any = { ...taskData };
						
						// Verifica se há campos para atualizar
						if (Object.keys(body).length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'É necessário fornecer pelo menos um campo para atualizar a tarefa!',
								{ itemIndex: i },
							);
						}
						
						options.body = body; // Anexa o corpo à requisição
					}
				}
				
				// Executa a requisição HTTP com as opções configuradas e autenticação
				const response = await this.helpers.requestWithAuthentication.call(
					this,
					'rdStationCrmApi', // Usa as credenciais configuradas
					options, // Opções da requisição
				);
				
				// Extrai os dados da resposta e adiciona ao retorno
				const responseData = response.body;
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
