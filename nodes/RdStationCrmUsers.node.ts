import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Usuários do RD Station CRM
 * Este nó permite acessar informações dos usuários (membros da equipe) 
 * cadastrados no RD Station CRM da empresa.
 * 
 * Tipicamente, a API de CRM fornece apenas endpoints de leitura para usuários,
 * já que a criação/gerenciamento de usuários é feita via interface administrativa
 * (através de convites por email, etc.).
 */
export class RdStationCrmUsers implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Usuários',
		name: 'rdStationCrmUsers',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Consultar usuários no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Usuários', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (neste caso, só temos usuários)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Usuário', // Nome amigável da opção
						value: 'user', // Valor interno da opção
					},
				],
				default: 'user', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre os usuários
			// Note que para usuários, geralmente só há operações de consulta
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'user'
						resource: [
							'user',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para usuários
					{
						name: 'Listar', // Operação de listagem
						value: 'getAll',
						description: 'Listar todos os usuários',
						action: 'Listar usuários',
					},
					{
						name: 'Obter', // Operação para obter detalhes
						value: 'get',
						description: 'Obter um usuário pelo ID',
						action: 'Obter um usuário',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campos para a operação OBTER USUÁRIO
			{
				displayName: 'ID do Usuário', // Campo para informar ID do usuário
				name: 'userId',
				type: 'string', // Tipo texto para o ID
				default: '',
				required: true, // Campo obrigatório
				displayOptions: {
					show: {
						// Mostrar apenas quando operação for 'get'
						resource: [
							'user',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'ID do usuário a ser consultado',
			},

			// Campos para a operação LISTAR USUÁRIOS
			{
				displayName: 'Parâmetros de Listagem', // Título da seção
				name: 'listParameters', // Nome para referência interna
				type: 'collection', // Tipo coleção permite múltiplos parâmetros agrupados
				placeholder: 'Adicionar Parâmetros', // Texto de placeholder
				default: {}, // Valor padrão (vazio)
				displayOptions: {
					show: {
						// Mostra apenas quando recurso é 'user' e operação é 'getAll'
						resource: [
							'user',
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
						description: 'Número máximo de usuários a retornar',
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
								name: 'E-mail', // Ordem alfabética por email
								value: 'email',
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
								name: 'Ascendente', // A-Z
								value: 'asc',
							},
							{
								name: 'Descendente', // Z-A
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'Direção da ordenação (crescente ou decrescente)',
					},
					{
						displayName: 'ID da Equipe', // Filtrar por equipe específica
						name: 'team_id',
						type: 'string',
						default: '',
						description: 'Filtrar usuários por equipe específica',
					},
					{
						displayName: 'Papel/Função', // Filtrar por tipo de usuário
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'Administrador', // Usuários administradores
								value: 'admin',
							},
							{
								name: 'Usuário', // Usuários normais
								value: 'user',
							},
							{
								name: 'Gerente', // Usuários com função de gerência
								value: 'manager',
							},
						],
						default: '',
						description: 'Filtrar usuários por papel/função no sistema',
					},
					{
						displayName: 'Status', // Filtrar por status da conta
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Ativo', // Usuários ativos
								value: 'active',
							},
							{
								name: 'Inativo', // Usuários inativos/desativados
								value: 'inactive',
							},
							{
								name: 'Pendente', // Convites pendentes
								value: 'pending',
							},
						],
						default: 'active',
						description: 'Filtrar usuários por status da conta',
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
				if (resource === 'user') {
					if (operation === 'getAll') {
						// Operação: LISTAR USUÁRIOS
						
						// Preparando a requisição para listar usuários
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/users`; // Endpoint de usuários
						
						// Obtendo e aplicando parâmetros de filtro/paginação definidos pelo usuário
						const listParameters = this.getNodeParameter('listParameters', i) as {
							limit?: number;
							page?: number;
							order?: string;
							direction?: string;
							team_id?: string;
							role?: string;
							status?: string;
						};
						
						const qs: Record<string, any> = {}; // Objeto para parâmetros de query string
						
						// Adicionando os parâmetros à query string se estiverem definidos
						if (listParameters.limit) qs.limit = listParameters.limit;
						if (listParameters.page) qs.page = listParameters.page;
						if (listParameters.order) qs.order = listParameters.order;
						if (listParameters.direction) qs.direction = listParameters.direction;
						if (listParameters.team_id) qs.team_id = listParameters.team_id;
						if (listParameters.role) qs.role = listParameters.role;
						if (listParameters.status) qs.status = listParameters.status;
						
						options.qs = qs; // Anexa os parâmetros à requisição
						
					} else if (operation === 'get') {
						// Operação: OBTER USUÁRIO ESPECÍFICO
						
						// Obtém o ID do usuário a ser consultado
						const userId = this.getNodeParameter('userId', i) as string;
						
						// Verifica se o ID do usuário foi fornecido
						if (!userId) {
							throw new NodeOperationError(this.getNode(), 'É necessário fornecer um ID de usuário válido!', { itemIndex: i });
						}
						
						// Configurando a requisição para buscar um usuário específico
						options.method = 'GET';
						options.uri = `${baseUrl}/users/${userId}`; // Endpoint com ID do usuário
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
