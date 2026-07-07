import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Motivos de Perda do RD Station CRM
 * Este nó permite consultar os motivos de perda cadastrados no RD Station CRM.
 * 
 * Os motivos de perda são utilizados para justificar por que um negócio foi perdido
 * (ex: preço alto, solução não adequada, cliente escolheu concorrente, etc.).
 * Isso ajuda a empresa a entender os principais fatores que levam à perda de negócios.
 * 
 * Normalmente, a API só permite operações de leitura para motivos de perda, já que
 * a criação e gerenciamento são feitos na interface administrativa do CRM.
 */
export class RdStationCrmLossReasons implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Motivos de Perda',
		name: 'rdStationCrmLossReasons',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Consultar motivos de perda no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Motivos de Perda', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (neste caso, só temos motivos de perda)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Motivo de Perda', // Nome amigável da opção
						value: 'lossReason', // Valor interno da opção
					},
				],
				default: 'lossReason', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre os motivos de perda
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'lossReason'
						resource: [
							'lossReason',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para motivos de perda
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar todos os motivos de perda',
						action: 'Listar motivos de perda',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter um motivo de perda pelo ID',
						action: 'Obter um motivo de perda',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campos para a operação OBTER MOTIVO DE PERDA
			{
				displayName: 'ID do Motivo de Perda', // Campo para informar ID do motivo
				name: 'lossReasonId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando operação for 'get'
						resource: [
							'lossReason',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID do motivo de perda a ser consultado',
			},

			// Campos para a operação LISTAR MOTIVOS DE PERDA
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'lossReason' e operação é 'getAll'
						resource: [
							'lossReason',
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
						description: 'Número máximo de motivos de perda a retornar',
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
						displayName: 'Status', // Filtrar por status do motivo de perda
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Ativo', // Motivos ativos
								value: 'active',
							},
							{
								name: 'Inativo', // Motivos desativados
								value: 'inactive',
							},
							{
								name: 'Todos', // Ambos os status
								value: 'all',
							},
						],
						default: 'active',
						description: 'Filtrar motivos de perda por status',
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
				if (resource === 'lossReason') {
					if (operation === 'getAll') {
						// Operação: LISTAR MOTIVOS DE PERDA
						
						// Preparando a requisição para listar motivos de perda
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/deal_lost_reasons`; // Endpoint de motivos de perda
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listParameters', i) as {
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
						// Operação: OBTER MOTIVO DE PERDA ESPECÍFICO
						
						// Obtém o ID do motivo de perda a ser consultado
						const lossReasonId = this.getNodeParameter('lossReasonId', i) as string;
						
						// Verifica se o ID do motivo de perda foi fornecido
						if (!lossReasonId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de motivo de perda válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar um motivo de perda específico
						options.method = 'GET';
						options.uri = `${baseUrl}/deal_lost_reasons/${lossReasonId}`; // Endpoint com ID do motivo
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
