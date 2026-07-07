import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Anotações (Notas) do RD Station CRM
 * Este nó permite interações com a API de Anotações do RD Station CRM.
 * As anotações são registros de texto inseridos no histórico de uma oportunidade
 * para guardar informações relevantes ou feedbacks de conversas com o cliente.
 * Importante: Anotações não podem ser editadas ou excluídas via API para garantir
 * integridade e evitar fraudes no histórico de negociação.
 */
export class RdStationCrmNotes implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Notas',
		name: 'rdStationCrmNotes',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Operações com anotações no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Notas', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (neste caso, só temos notas/anotações)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Nota', // Nome amigável da opção
						value: 'note', // Valor interno da opção
					},
				],
				default: 'note', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre as notas
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'note'
						resource: [
							'note',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para notas
					// No caso de notas, não é possível editar ou excluir via API
					{
						name: 'Criar', // Operação de criação
						value: 'create',
						description: 'Criar uma nova anotação para um negócio',
						action: 'Criar uma nota',
					},
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar anotações',
						action: 'Listar notas',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campos para a operação LISTAR NOTAS
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'note' e operação é 'getAll'
						resource: [
							'note',
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
						description: 'Número máximo de notas a retornar',
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
						description: 'Filtrar notas por negócio específico',
					},
					{
						displayName: 'ID do Usuário', // Filtrar por autor da nota
						name: 'user_id',
						type: 'string',
						default: '',
						description: 'Filtrar notas por usuário autor',
					},
					{
						displayName: 'Data Inicial', // Filtro por período - início
						name: 'start_date',
						type: 'string',
						default: '',
						description: 'Data inicial para filtrar notas (formato YYYY-MM-DD)',
					},
					{
						displayName: 'Data Final', // Filtro por período - fim
						name: 'end_date',
						type: 'string',
						default: '',
						description: 'Data final para filtrar notas (formato YYYY-MM-DD)',
					},
					{
						displayName: 'Ordenação', // Campo para ordenar resultados
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'Data de Criação', // Ordena por quando a nota foi criada
								value: 'created_at',
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
								name: 'Ascendente', // Do mais antigo para o mais recente
								value: 'asc',
							},
							{
								name: 'Descendente', // Do mais recente para o mais antigo
								value: 'desc',
							},
						],
						default: 'desc', // Por padrão, notas mais recentes primeiro
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
				],
			},

			// Campos para a operação CRIAR NOTA
			{
				displayName: 'ID do Negócio', // Negócio ao qual a nota será vinculada
				name: 'dealId',
				type: 'string',
				default: '',
				required: true, // Campo obrigatório para criação
				displayOptions: {
					show: {
						resource: [
							'note',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'ID do negócio ao qual a nota está ligada (obrigatório)',
			},
			{
				displayName: 'ID do Usuário', // Usuário autor da nota
				name: 'userId',
				type: 'string',
				default: '',
				required: true, // Campo obrigatório para criação
				displayOptions: {
					show: {
						resource: [
							'note',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'ID do usuário autor da nota (obrigatório)',
			},
			{
				displayName: 'Texto da Nota', // Conteúdo da anotação
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4, // Campo de texto multi-linha para facilitar digitação de notas longas
				},
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						resource: [
							'note',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'Conteúdo da anotação a ser registrada (obrigatório)',
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
				if (resource === 'note') {
					if (operation === 'getAll') {
						// Operação: LISTAR NOTAS
						
						// Na API do RD Station CRM, as notas são consideradas "activities"
						// Preparando a requisição para listar notas/atividades
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/activities`; // Endpoint de atividades que inclui notas
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listParameters', i) as {
							limit?: number;
							page?: number;
							deal_id?: string;
							user_id?: string;
							start_date?: string;
							end_date?: string;
							order?: string;
							direction?: string;
						};
						
						const qs: Record<string, any> = {
							type: 'note', // Filtra apenas por atividades do tipo "nota"
						}; 
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.deal_id) qs.deal_id = listParameters.deal_id;
						if (listParameters.user_id) qs.user_id = listParameters.user_id;
						if (listParameters.start_date) qs.start_date = listParameters.start_date;
						if (listParameters.end_date) qs.end_date = listParameters.end_date;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'create') {
						// Operação: CRIAR NOTA
						
						// Configurando requisição para criar nota
						options.method = 'POST'; // Método HTTP POST para criação
						options.uri = `${baseUrl}/activities`; // Endpoint de activities para criar nota
						
						// Obtém os dados necessários para criar a nota
						const dealId = this.getNodeParameter('dealId', i) as string; // ID do negócio
						const userId = this.getNodeParameter('userId', i) as string; // ID do usuário autor
						const text = this.getNodeParameter('text', i) as string; // Texto da nota
						
						// Verifica se todos os campos obrigatórios foram fornecidos
						if (!dealId) {
							throw new NodeOperationError(
								this.getNode(),
								'O ID do negócio é obrigatório para criar uma nota!',
								{ itemIndex: i },
							);
						}
						
						if (!userId) {
							throw new NodeOperationError(
								this.getNode(),
								'O ID do usuário é obrigatório para criar uma nota!',
								{ itemIndex: i },
							);
						}
						
						if (!text) {
							throw new NodeOperationError(
								this.getNode(),
								'O texto da nota é obrigatório!',
								{ itemIndex: i },
							);
						}
						
						// Preparando o corpo da requisição
						const body = {
							deal_id: dealId, // Negócio ao qual a nota será vinculada
							user_id: userId, // Usuário que está criando a nota
							text: text, // Conteúdo da nota
							type: 'note', // Tipo de atividade = nota
						};
						
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
