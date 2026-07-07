import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

/**
 * Classe para o nó de Produtos em Negociações do RD Station CRM
 * Este nó permite gerenciar produtos vinculados às negociações (oportunidades),
 * possibilitando adicionar, atualizar ou remover itens de produto dos negócios.
 * No RD Station CRM, é possível cadastrar um catálogo de produtos/serviços e
 * vincular itens desse catálogo às negociações como itens de proposta comercial.
 */
export class RdStationCrmDealProducts implements INodeType {
	description: INodeTypeDescription = {
		// Informações básicas do nó que serão exibidas na interface do n8n
		displayName: 'RD Station CRM Produtos em Negócios',
		name: 'rdStationCrmDealProducts',
		icon: 'file:rdstation.svg', // Ícone a ser exibido no n8n
		group: ['transform'], // Grupo onde o nó aparecerá na interface
		version: 1, // Versão do nó
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}', // Subtítulo dinâmico baseado nos parâmetros
		description: 'Gerenciar produtos em negociações no RD Station CRM', // Descrição do nó
		defaults: {
			name: 'RD Station CRM Produtos em Negócios', // Nome padrão quando o nó é adicionado
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
			// Seleção do recurso (neste caso, só temos produtos em negócios)
			{
				displayName: 'Recurso', // Label exibido na interface
				name: 'resource', // Nome do parâmetro para referência interna
				type: 'options', // Tipo do campo (seleção entre opções)
				noDataExpression: true, // Não permite expressões dinâmicas
				options: [
					{
						name: 'Produto em Negócio', // Nome amigável da opção
						value: 'dealProduct', // Valor interno da opção
					},
				],
				default: 'dealProduct', // Valor padrão selecionado
				required: true, // Campo obrigatório
			},
			// Seleção da operação a ser realizada sobre os produtos em negócios
			{
				displayName: 'Operação', // Label do campo na interface
				name: 'operation', // Nome do parâmetro internamente
				type: 'options', // Campo de seleção entre opções
				noDataExpression: true, // Não permite expressões dinâmicas
				displayOptions: {
					show: {
						// Mostra este campo apenas quando o recurso for 'dealProduct'
						resource: [
							'dealProduct',
						],
					},
				},
				options: [
					// Lista de operações disponíveis para produtos em negócios
					{
						name: 'Adicionar', // Operação para adicionar produtos
						value: 'add',
						description: 'Adicionar produtos a uma negociação',
						action: 'Adicionar produtos a uma negociação',
					},
					{
						name: 'Atualizar', // Operação para atualizar produtos existentes
						value: 'update',
						description: 'Atualizar produtos em uma negociação',
						action: 'Atualizar produtos em uma negociação',
					},
					{
						name: 'Remover', // Operação para remover produtos
						value: 'remove',
						description: 'Remover produtos de uma negociação',
						action: 'Remover produtos de uma negociação',
					},
					{
						name: 'Listar', // Operação para listar produtos vinculados
						value: 'getAll',
						description: 'Listar todos os produtos de uma negociação',
						action: 'Listar produtos de uma negociação',
					},
				],
				default: 'getAll', // Operação padrão
			},

			// Campo comum para todas as operações: ID do Negócio
			{
				displayName: 'ID do Negócio', // Negócio ao qual os produtos serão vinculados/listados
				name: 'dealId',
				type: 'string',
				default: '',
				required: true, // Campo obrigatório para todas as operações
				displayOptions: {
					show: {
						resource: [
							'dealProduct',
						],
					},
				},
				description: 'ID do negócio ao qual os produtos estão ou serão vinculados',
			},

			// Para a operação REMOVER PRODUTOS, precisamos dos IDs dos produtos a remover
			{
				displayName: 'IDs dos Produtos', // IDs dos produtos a serem removidos
				name: 'productIds',
				placeholder: 'Adicionar ID de Produto',
				type: 'fixedCollection', // Coleção fixa para múltiplos IDs
				typeOptions: {
					multipleValues: true, // Permite múltiplos IDs
				},
				displayOptions: {
					show: {
						resource: [
							'dealProduct',
						],
						operation: [
							'remove',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'productIdValues', // Nome interno da coleção
						displayName: 'ID do Produto', // Título exibido na interface
						values: [
							{
								displayName: 'ID do Produto', // Campo para ID do produto
								name: 'id',
								type: 'string',
								default: '',
								description: 'ID do produto a ser removido da negociação',
								required: true, // ID é obrigatório
							},
						],
					},
				],
				description: 'IDs dos produtos a serem removidos da negociação',
			},

			// Para as operações ADICIONAR e ATUALIZAR, precisamos dos detalhes dos produtos
			{
				displayName: 'Produtos', // Produtos a serem adicionados/atualizados
				name: 'products',
				placeholder: 'Adicionar Produto',
				type: 'fixedCollection', // Coleção fixa para múltiplos produtos
				typeOptions: {
					multipleValues: true, // Permite múltiplos produtos
				},
				displayOptions: {
					show: {
						resource: [
							'dealProduct',
						],
						operation: [
							'add',
							'update',
						],
					},
				},
				default: {},
				options: [
					{
						name: 'productValues', // Nome interno da coleção
						displayName: 'Produto', // Título exibido na interface
						values: [
							{
								displayName: 'ID do Produto', // ID do produto do catálogo
								name: 'product_id',
								type: 'string',
								default: '',
								description: 'ID do produto do catálogo a vincular',
								required: true, // ID do produto é obrigatório
							},
							{
								displayName: 'Quantidade', // Quantidade do produto
								name: 'quantity',
								type: 'number',
								default: 1,
								description: 'Quantidade do produto na negociação',
								required: true, // Quantidade é obrigatória
							},
							{
								displayName: 'Valor Unitário', // Preço por unidade
								name: 'unit_value',
								type: 'number',
								default: 0,
								description: 'Valor unitário do produto no contexto da negociação',
								required: true, // Valor unitário é obrigatório
							},
							{
								displayName: 'Desconto (%)', // Desconto opcional
								name: 'discount',
								type: 'number',
								default: 0,
								description: 'Desconto percentual aplicado ao produto (0-100)',
							},
							{
								displayName: 'Total', // Valor total calculado
								name: 'total',
								type: 'number',
								default: 0,
								description: 'Valor total do item (calculado automaticamente se não fornecido)',
							},
						],
					},
				],
				description: 'Produtos a serem adicionados ou atualizados na negociação',
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
				if (resource === 'dealProduct') {
					// Obtém o ID do negócio a ser trabalhado (comum a todas as operações)
					const dealId = this.getNodeParameter('dealId', i) as string;
					
					// Verifica se o ID do negócio foi fornecido
					if (!dealId) {
						throw new NodeOperationError(
							this.getNode(), 
							'É necessário fornecer um ID de negócio válido!', 
							{ itemIndex: i }
						);
					}
					
					if (operation === 'getAll') {
						// Operação: LISTAR PRODUTOS DO NEGÓCIO
						
						// Preparando a requisição para listar produtos do negócio
						options.method = 'GET'; // Método HTTP GET para listar
						options.uri = `${baseUrl}/deals/${dealId}/deal_products`; // Endpoint de produtos do negócio
						
					} else if (operation === 'add') {
						// Operação: ADICIONAR PRODUTOS AO NEGÓCIO
						
						// Configurando requisição para adicionar produtos em lote
						options.method = 'POST'; // Método HTTP POST para criação
						options.uri = `${baseUrl}/deals/${dealId}/deal_products/batch`; // Endpoint batch para criação em lote
						
						// Obtendo os produtos a serem adicionados
						const productsCollection = this.getNodeParameter('products', i) as {
							productValues?: Array<{
								product_id: string;
								quantity: number;
								unit_value: number;
								discount?: number;
								total?: number;
							}>;
						};
						
						// Verificando se foram fornecidos produtos para adicionar
						if (!productsCollection.productValues || productsCollection.productValues.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'É necessário fornecer pelo menos um produto para adicionar à negociação!',
								{ itemIndex: i },
							);
						}
						
						// Preparando o corpo da requisição
						const body = {
							products: productsCollection.productValues, // Lista de produtos a adicionar
						};
						
						options.body = body; // Anexa o corpo à requisição
						
					} else if (operation === 'update') {
						// Operação: ATUALIZAR PRODUTOS DO NEGÓCIO
						
						// Configurando requisição para atualizar produtos em lote
						options.method = 'PATCH'; // Método HTTP PATCH para atualização parcial
						options.uri = `${baseUrl}/deals/${dealId}/deal_products/batch/update`; // Endpoint batch/update
						
						// Obtendo os produtos a serem atualizados
						const productsCollection = this.getNodeParameter('products', i) as {
							productValues?: Array<{
								product_id: string;
								quantity: number;
								unit_value: number;
								discount?: number;
								total?: number;
							}>;
						};
						
						// Verificando se foram fornecidos produtos para atualizar
						if (!productsCollection.productValues || productsCollection.productValues.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'É necessário fornecer pelo menos um produto para atualizar na negociação!',
								{ itemIndex: i },
							);
						}
						
						// Preparando o corpo da requisição
						const body = {
							products: productsCollection.productValues, // Lista de produtos com dados atualizados
						};
						
						options.body = body; // Anexa o corpo à requisição
						
					} else if (operation === 'remove') {
						// Operação: REMOVER PRODUTOS DO NEGÓCIO
						
						// Configurando requisição para remover produtos em lote
						options.method = 'DELETE'; // Método HTTP DELETE para remoção
						options.uri = `${baseUrl}/deals/${dealId}/deal_products/batch`; // Endpoint batch para operação em lote
						
						// Obtendo os IDs dos produtos a serem removidos
						const productIdsCollection = this.getNodeParameter('productIds', i) as {
							productIdValues?: Array<{ id: string }>;
						};
						
						// Verificando se foram fornecidos IDs de produtos para remover
						if (!productIdsCollection.productIdValues || productIdsCollection.productIdValues.length === 0) {
							throw new NodeOperationError(
								this.getNode(),
								'É necessário fornecer pelo menos um ID de produto para remover da negociação!',
								{ itemIndex: i },
							);
						}
						
						// Preparando o corpo da requisição com os IDs a remover
						const body = {
							product_ids: productIdsCollection.productIdValues.map(item => item.id), // Extrai apenas os IDs
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
