import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Fontes do RD Station CRM
 * Este nó permite consultar as fontes de leads cadastradas no RD Station CRM.
 * 
 * As fontes (Lead Sources) são utilizadas para identificar a origem de contatos 
 * e negócios no CRM, como por exemplo: site, redes sociais, indicação, etc.
 * Elas ajudam a empresa a entender quais canais estão gerando mais oportunidades.
 * 
 * Normalmente, a API só permite operações de leitura para fontes, já que
 * a criação e gerenciamento são feitos na interface administrativa do CRM.
 */
export class RdStationCrmSources implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Fontes',
		name: 'rdStationCrmSources',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Consultar fontes de leads no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Fontes', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (neste caso, só temos fontes)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Fonte', // Nome amigável da opção
						value: 'source', // Valor interno da opção
					},
				],
				default: 'source', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre as fontes
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'source'
						resource: [
							'source',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para fontes
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar todas as fontes',
						action: 'Listar fontes',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter uma fonte pelo ID',
						action: 'Obter uma fonte',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campos para a operação OBTER FONTE
			{
				displayName: 'ID da Fonte', // Campo para informar ID da fonte
				name: 'sourceId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando operação for 'get'
						resource: [
							'source',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID da fonte a ser consultada',
			},

			// Campos para a operação LISTAR FONTES
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'source' e operação é 'getAll'
						resource: [
							'source',
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
						description: 'Número máximo de fontes a retornar',
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
								name: 'Data de Criação', // Do mais antigo ao mais recente
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
								name: 'Ascendente', // A-Z ou mais antigo para mais recente
								value: 'asc',
							},
							{
								name: 'Descendente', // Z-A ou mais recente para mais antigo
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
					{
						displayName: 'Status', // Filtrar por status da fonte
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Ativa', // Fontes ativas
								value: 'active',
							},
							{
								name: 'Inativa', // Fontes desativadas
								value: 'inactive',
							},
							{
								name: 'Todas', // Ambos os status
								value: 'all',
							},
						],
						default: 'active',
						description: 'Filtrar fontes por status',
					},
					{
						displayName: 'Termo de Busca', // Pesquisar por texto no nome da fonte
						name: 'query',
						type: 'string',
						default: '',
						description: 'Termo para buscar no nome da fonte',
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
				if (resource === 'source') {
					if (operation === 'getAll') {
						// Operação: LISTAR FONTES
						
						// Preparando a requisição para listar fontes
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/deal_sources`; // Endpoint de fontes
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listParameters', i) as {
							limit?: number;
							page?: number;
							order?: string;
							direction?: string;
							status?: string;
							query?: string;
						};
						
						const qs: Record<string, any> = {}; // Objeto para parâmetros de query string
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						if (listParameters.status) qs.status = listParameters.status;
						if (listParameters.query) qs.query = listParameters.query;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'get') {
						// Operação: OBTER FONTE ESPECÍFICA
						
						// Obtém o ID da fonte a ser consultada
						const sourceId = this.getNodeParameter('sourceId', i) as string;
						
						// Verifica se o ID da fonte foi fornecido
						if (!sourceId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de fonte válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar uma fonte específica
						options.method = 'GET';
						options.uri = `${baseUrl}/deal_sources/${sourceId}`; // Endpoint com ID da fonte
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
