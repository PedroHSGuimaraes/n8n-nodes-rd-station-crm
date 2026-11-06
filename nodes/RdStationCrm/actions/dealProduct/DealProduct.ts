import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';
import { getIdParameter } from '../../helpers/resourceLocator';

// ---------------------------------------------------------------------------
// DEAL PRODUCT resource (line items on a deal) — mirrors the Contact.ts structure:
//   1. `dealProductDescription` = operations dropdown + fields (INodeProperties[])
//   2. `executeDealProduct(operation, i)` = programmatic dispatch using the transport helpers
// Every operation targets a specific deal, so `dealId` is required and shown for all.
// Add / Update / Remove use the deal_products/batch endpoints (max 100 per request): POST .../batch,
// PATCH .../batch/update and DELETE .../batch/destroy, as in the official v1 docs (AD-007).
// Add One / Update One / Remove One use the single-item routes under .../deal_products[/{id}].
// ---------------------------------------------------------------------------

const showOnlyForDealProducts = {
	resource: ['dealProduct'],
};

// Reusable line-item fields shared by the Add and Update collections.
const dealProductLineFields: INodeProperties[] = [
	{
		displayName: 'Product Name or ID',
		name: 'product_id',
		type: 'options',
		description: 'Product to attach to the deal, referenced by its product ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: { loadOptionsMethod: 'getProducts' },
		default: '',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		default: 1,
		description: 'Quantity of this product on the deal, as a number, for example 2',
	},
	{
		displayName: 'Price',
		name: 'price',
		type: 'number',
		default: 0,
		description: 'Unit price of the product, as a number in the account currency, for example 199.90',
	},
	{
		displayName: 'Discount',
		name: 'discount',
		type: 'number',
		default: 0,
		description: 'Discount applied to this product line, interpreted according to Discount Type',
	},
	{
		displayName: 'Discount Type',
		name: 'discount_type',
		description: 'How the discount is interpreted. One of: percentage, value.',
		type: 'options',
		options: [
			{ name: 'Percentage', value: 'percentage' },
			{ name: 'Value', value: 'value' },
		],
		default: 'percentage',
	},
	{
		displayName: 'Recurrence',
		name: 'recurrence',
		description: 'Billing recurrence of the product. One of: annual, monthly, spare.',
		type: 'options',
		options: [
			{ name: 'Annual', value: 'annual' },
			{ name: 'Monthly', value: 'monthly' },
			{ name: 'One-Time', value: 'spare' },
		],
		default: 'monthly',
	},
	{
		displayName: 'Total',
		name: 'total',
		type: 'number',
		default: 0,
		description: 'Total value of this product line item after applying quantity, price, and discount',
	},
];

// Update rows also carry the existing deal_product id.
const dealProductUpdateLineFields: INodeProperties[] = [
	{
		displayName: 'Deal Product ID',
		name: 'id',
		type: 'string',
		default: '',
		description: 'Unique ID of the existing deal product (line item) to update, as returned by a Get Many deal product operation',
	},
	...dealProductLineFields,
];

export const dealProductDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForDealProducts },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add products to a deal',
				description: 'Add one or more product line items (price, quantity, discount) to a deal in RD Station CRM',
			},
			{
				name: 'Add One',
				value: 'addOne',
				action: 'Add one product to a deal',
				description: 'Add a single product line item (price, quantity, discount) to a deal in RD Station CRM',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many deal products',
				description: 'Retrieve a paginated list of product line items attached to a specific deal in RD Station CRM',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove products from a deal',
				description: 'Remove one or more product line items from a deal in RD Station CRM, identified by their IDs',
			},
			{
				name: 'Remove One',
				value: 'removeOne',
				action: 'Remove one product from a deal',
				description: 'Remove a single product line item from a deal in RD Station CRM, identified by its ID',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update products on a deal',
				description: 'Update one or more existing product line items on a deal in RD Station CRM',
			},
			{
				name: 'Update One',
				value: 'updateOne',
				action: 'Update one product on a deal',
				description: 'Update a single existing product line item on a deal in RD Station CRM',
			},
		],
		default: 'add',
	},

	// ----- Deal ID (all operations) -----
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: showOnlyForDealProducts },
		description: 'Unique ID of the deal whose products to act on, as returned by a Create or Get Many deal operation',
	},

	// ----- Products (add) -----
	{
		displayName: 'Products',
		name: 'productsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Product',
		default: {},
		displayOptions: { show: { ...showOnlyForDealProducts, operation: ['add'] } },
		description: 'Product line items to add to the deal, up to 100 per request',
		options: [
			{
				name: 'product',
				displayName: 'Product',
				values: dealProductLineFields,
			},
		],
	},

	// ----- Products (update) -----
	{
		displayName: 'Products',
		name: 'updateProductsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Product',
		default: {},
		displayOptions: { show: { ...showOnlyForDealProducts, operation: ['update'] } },
		description: 'Deal product line items to update, up to 100 per request',
		options: [
			{
				name: 'product',
				displayName: 'Product',
				values: dealProductUpdateLineFields,
			},
		],
	},

	// ----- Add One: uma linha de produto, campos soltos (a rota recebe o objeto direto) -----
	...dealProductLineFields
		// O POST de um item não aceita `total` (a doc só lista seis campos); não mostrar evita campo sem efeito.
		.filter((field) => field.name !== 'total')
		.map((field) => ({
			...field,
			displayOptions: { show: { ...showOnlyForDealProducts, operation: ['addOne'] } },
		})),

	// ----- Deal Product ID (updateOne / removeOne) -----
	{
		displayName: 'Deal Product ID',
		name: 'dealProductId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForDealProducts, operation: ['updateOne', 'removeOne'] } },
		description: 'Unique ID of the deal product (line item) to act on, as returned by a Get Many deal product operation',
	},

	// ----- Update One: só os campos escolhidos seguem no PUT -----
	{
		displayName: 'Update Fields',
		name: 'updateOneFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForDealProducts, operation: ['updateOne'] } },
		options: dealProductLineFields
			// Total não existe no corpo do PUT de um item, segundo a doc.
			.filter((field) => field.name !== 'total')
			.map((field) => ({ ...field })),
	},

	// ----- IDs (remove) -----
	{
		displayName: 'Deal Products to Remove',
		name: 'idsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Deal Product',
		default: {},
		displayOptions: { show: { ...showOnlyForDealProducts, operation: ['remove'] } },
		description: 'Deal product line items to remove from the deal, up to 100 per request',
		options: [
			{
				name: 'id',
				displayName: 'Deal Product',
				values: [
					{
						displayName: 'Deal Product ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'Unique ID of the deal product (line item) to remove, as returned by a Get Many deal product operation',
					},
				],
			},
		],
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForDealProducts, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForDealProducts, operation: ['getMany'], returnAll: [false] },
		},
	},
];

/**
 * Lê o ID do produto da negociação (texto livre) e recusa vazio ou só espaços.
 * Sem o ID a rota apontaria para a coleção inteira, então a falha vem antes da requisição.
 */
function getDealProductId(this: IExecuteFunctions, i: number): string {
	const id = String(this.getNodeParameter('dealProductId', i, '') ?? '').trim();
	if (id) return id;
	throw new NodeOperationError(this.getNode(), `The 'Deal Product ID' parameter is empty [item ${i}]`, {
		itemIndex: i,
		description: 'Paste the ID of a deal product, as returned by Get Many',
	});
}

/** Mantém só os campos preenchidos: a RD trata campo ausente como "não mudar". */
function keepFilled(source: IDataObject, keys: string[]): IDataObject {
	const body: IDataObject = {};
	for (const key of keys) {
		if (source[key] !== undefined && source[key] !== '') body[key] = source[key];
	}
	return body;
}

function buildLineItem(row: IDataObject): IDataObject {
	// Só o `add` em lote usa esta linha; o `update` em lote envia id, amount e price (AD-007).
	return {
		product_id: row.product_id,
		amount: row.amount,
		price: row.price,
		discount: row.discount,
		discount_type: row.discount_type,
		recurrence: row.recurrence,
		total: row.total,
	};
}

export async function executeDealProduct(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<unknown> {
	const dealId = getIdParameter.call(this, 'dealId', i);

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const endpoint = `/deals/${dealId}/deal_products`;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'deal_products', 'GET', endpoint);
		}
		const qs: IDataObject = { limit: this.getNodeParameter('limit', i) as number };
		const response = await rdCrmApiRequest.call(this, 'GET', endpoint, {}, qs);
		return response.deal_products ?? response;
	}

	if (operation === 'add') {
		const productsUi = this.getNodeParameter('productsUi', i, {}) as IDataObject;
		const rows = (productsUi.product as IDataObject[]) ?? [];
		const deal_products = rows.map((row) => buildLineItem(row));
		return rdCrmApiRequest.call(
			this,
			'POST',
			`/deals/${dealId}/deal_products/batch`,
			{ deal_products },
		);
	}

	if (operation === 'update') {
		const productsUi = this.getNodeParameter('updateProductsUi', i, {}) as IDataObject;
		const rows = (productsUi.product as IDataObject[]) ?? [];
		// A doc v1 só descreve id, amount e price por linha no PATCH em lote (AD-007).
		const deal_products = rows.map((row) => keepFilled(row, ['id', 'amount', 'price']));
		return rdCrmApiRequest.call(
			this,
			'PATCH',
			`/deals/${dealId}/deal_products/batch/update`,
			{ deal_products },
		);
	}

	if (operation === 'remove') {
		const idsUi = this.getNodeParameter('idsUi', i, {}) as IDataObject;
		const rows = (idsUi.id as IDataObject[]) ?? [];
		// A doc v1 espera uma lista de objetos { id } em batch/destroy (AD-007).
		// O id sai sem espaços nas pontas, como no removeOne.
		const deal_products = rows
			.map((row) => String(row.id ?? '').trim())
			.filter(Boolean)
			.map((id) => ({ id }));
		// Lista sem id válido apagaria nada e ainda devolveria { deleted: true }; falhar antes é mais honesto.
		if (!deal_products.length) {
			throw new NodeOperationError(this.getNode(), 'Add at least one Deal Product ID to remove [item ' + i + ']', {
				itemIndex: i,
				description: 'Paste the ID of each deal product, as returned by Get Many',
			});
		}
		await rdCrmApiRequest.call(
			this,
			'DELETE',
			`/deals/${dealId}/deal_products/batch/destroy`,
			{ deal_products },
		);
		return { deleted: true };
	}

	if (operation === 'addOne') {
		// POST na coleção cria um item; o corpo é o próprio objeto, sem lista.
		const keys = ['product_id', 'amount', 'price', 'discount', 'discount_type', 'recurrence'];
		const typed: IDataObject = {};
		for (const key of keys) typed[key] = this.getNodeParameter(key, i, undefined) as never;
		const body = keepFilled(typed, keys);
		// Sem produto a RD recusaria o POST; a falha local diz o que falta.
		if (!body.product_id) {
			throw new NodeOperationError(this.getNode(), `The 'Product Name or ID' parameter is empty [item ${i}]`, {
				itemIndex: i,
				description: 'Choose a product from the list, or set its ID with an expression',
			});
		}
		return rdCrmApiRequest.call(this, 'POST', `/deals/${dealId}/deal_products`, body);
	}

	if (operation === 'updateOne') {
		const dealProductId = getDealProductId.call(this, i);
		const fields = this.getNodeParameter('updateOneFields', i, {}) as IDataObject;
		const body = keepFilled(fields, ['product_id', 'amount', 'price', 'discount', 'discount_type', 'recurrence']);
		// PUT sem campo não muda nada; avisar antes evita uma chamada inútil.
		if (!Object.keys(body).length) {
			throw new NodeOperationError(this.getNode(), `Choose at least one field to update [item ${i}]`, {
				itemIndex: i,
				description: 'Add a field under Update Fields, for example Price',
			});
		}
		// O ID vem de texto livre; codificar impede que `../` ou `?` mudem a rota.
		return rdCrmApiRequest.call(
			this,
			'PUT',
			`/deals/${dealId}/deal_products/${encodeURIComponent(dealProductId)}`,
			body,
		);
	}

	if (operation === 'removeOne') {
		const dealProductId = getDealProductId.call(this, i);
		// A RD responde 204 sem corpo; devolvemos um aviso claro no lugar do vazio.
		await rdCrmApiRequest.call(this, 'DELETE', `/deals/${dealId}/deal_products/${encodeURIComponent(dealProductId)}`);
		return { deleted: true };
	}

	return {};
}
