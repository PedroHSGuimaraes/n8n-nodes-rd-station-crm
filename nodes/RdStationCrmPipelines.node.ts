import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Funis e Etapas do RD Station CRM
 * Este nó permite consultar os funis de vendas (pipelines) e suas etapas (stages)
 * cadastrados no RD Station CRM.
 * 
 * Os funis representam o processo de vendas da empresa, enquanto as etapas são
 * os passos específicos dentro de cada funil (ex: qualificação, proposta, negociação).
 * 
 * A API geralmente oferece apenas endpoints de leitura para funis e etapas, pois
 * a criação/gerenciamento é feita na interface administrativa do CRM.
 */
export class RdStationCrmPipelines implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Funis',
		name: 'rdStationCrmPipelines',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Consultar funis e etapas no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Funis', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (funil ou etapa)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Funil', // Nome amigável da opção
						value: 'pipeline', // Valor interno da opção
					},
					{
						name: 'Etapa', // Nome amigável da opção 
						value: 'stage', // Valor interno da opção
					},
				],
				default: 'pipeline', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			
			// OPERAÇÕES PARA FUNIS (PIPELINES)
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'pipeline'
						resource: [
							'pipeline',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para funis
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar todos os funis',
						action: 'Listar funis',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter um funil pelo ID',
						action: 'Obter um funil',
					},
				],
				default: 'getAll', // Operação padrão
			},
			
			// Campos para a operação OBTER FUNIL
			{
				displayName: 'ID do Funil', // Campo para informar ID do funil
				name: 'pipelineId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando recurso for 'pipeline' e operação for 'get'
						resource: [
							'pipeline',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID do funil a ser consultado',
			},
			
			// Campos para a operação LISTAR FUNIS
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listPipelineParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'pipeline' e operação é 'getAll'
						resource: [
							'pipeline',
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
						description: 'Número máximo de funis a retornar',
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
								name: 'Nome', // Ordem alfabética por nome
								value: 'name',
							},
							{
								name: 'Data de Criação', // Cronológica
								value: 'created_at',
							},
						],
						default: 'name',
						description: 'Campo pelo qual ordenar os resultados',
					},
					{
						displayName: 'Direção da Ordenação', // Crescente ou decrescente
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascendente', // A-Z ou mais antigo primeiro
								value: 'asc',
							},
							{
								name: 'Descendente', // Z-A ou mais recente primeiro
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
					{
						displayName: 'Status', // Filtrar por status
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Ativo', // Funis ativos
								value: 'active',
							},
							{
								name: 'Inativo', // Funis desativados
								value: 'inactive',
							},
							{
								name: 'Todos', // Ambos os status
								value: 'all',
							},
						],
						default: 'active',
						description: 'Filtrar funis por status',
					},
				],
			},
			
			// OPERAÇÕES PARA ETAPAS (STAGES)
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'stage'
						resource: [
							'stage',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para etapas
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar todas as etapas de um funil',
						action: 'Listar etapas',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter uma etapa pelo ID',
						action: 'Obter uma etapa',
					},
				],
				default: 'getAll', // Operação padrão
			},
			
			// Campos para LISTAR ETAPAS
			{
				displayName: 'ID do Funil', // Necessário para listar etapas
				name: 'pipelineId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'stage',
						],
						operation: [
							'getAll',
						],
					},
				},
				description: 'ID do funil para listar suas etapas',
			},
			
			// Campos para a operação LISTAR ETAPAS
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listStageParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'stage' e operação é 'getAll'
						resource: [
							'stage',
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
						description: 'Número máximo de etapas a retornar',
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
								name: 'Nome', // Ordem alfabética por nome
								value: 'name',
							},
							{
								name: 'Posição', // Ordem na sequência do funil
								value: 'position',
							},
						],
						default: 'position',
						description: 'Campo pelo qual ordenar os resultados',
					},
					{
						displayName: 'Direção da Ordenação', // Crescente ou decrescente
						name: 'direction',
						type: 'options',
						options: [
							{
								name: 'Ascendente', // Posições menores primeiro ou A-Z
								value: 'asc',
							},
							{
								name: 'Descendente', // Posições maiores primeiro ou Z-A
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
				],
			},
			
			// Campos para a operação OBTER ETAPA
			{
				displayName: 'ID da Etapa', // Campo para informar ID da etapa
				name: 'stageId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando recurso for 'stage' e operação for 'get'
						resource: [
							'stage',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID da etapa a ser consultada',
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
				if (resource === 'pipeline') {
					// OPERAÇÕES PARA FUNIS
					if (operation === 'getAll') {
						// Operação: LISTAR FUNIS
						
						// Preparando a requisição para listar funis
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/deal_pipelines`; // Endpoint de funis
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listPipelineParameters', i) as {
							limit?: number;
							page?: number;
							order?: string;
							direction?: string;
							status?: string;
						};
						
						const qs: Record<string, any> = {}; // Objeto para parâmetros de query string
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						if (listParameters.status) qs.status = listParameters.status;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'get') {
						// Operação: OBTER FUNIL ESPECÍFICO
						
						// Obtém o ID do funil a ser consultado
						const pipelineId = this.getNodeParameter('pipelineId', i) as string;
						
						// Verifica se o ID do funil foi fornecido
						if (!pipelineId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de funil válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar um funil específico
						options.method = 'GET';
						options.uri = `${baseUrl}/deal_pipelines/${pipelineId}`; // Endpoint com ID do funil
					}
				} else if (resource === 'stage') {
					// OPERAÇÕES PARA ETAPAS
					if (operation === 'getAll') {
						// Operação: LISTAR ETAPAS DE UM FUNIL
						
						// Obtém o ID do funil para listar suas etapas
						const pipelineId = this.getNodeParameter('pipelineId', i) as string;
						
						// Verifica se o ID do funil foi fornecido
						if (!pipelineId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de funil válido para listar as etapas!', { itemIndex: i });
						}
						
						// Preparando a requisição para listar etapas
						options.method = 'GET';
						options.uri = `${baseUrl}/deal_pipelines/${pipelineId}/deal_stages`; // Endpoint para etapas de um funil
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listStageParameters', i) as {
							limit?: number;
							page?: number;
							order?: string;
							direction?: string;
						};
						
						const qs: Record<string, any> = {}; // Objeto para parâmetros de query string
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'get') {
						// Operação: OBTER ETAPA ESPECÍFICA
						
						// Obtém o ID da etapa a ser consultada
						const stageId = this.getNodeParameter('stageId', i) as string;
						
						// Verifica se o ID da etapa foi fornecido
						if (!stageId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de etapa válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar uma etapa específica
						options.method = 'GET';
						options.uri = `${baseUrl}/deal_stages/${stageId}`; // Endpoint com ID da etapa
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
