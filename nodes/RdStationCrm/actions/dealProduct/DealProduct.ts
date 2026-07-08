import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// DEAL PRODUCT resource (line items on a deal) — mirrors the Contact.ts structure:
//   1. `dealProductDescription` = operations dropdown + fields (INodeProperties[])
//   2. `executeDealProduct(operation, i)` = programmatic dispatch using the transport helpers
// Every operation targets a specific deal, so `dealId` is required and shown for all.
// Add / Update / Remove use the deal_products/batch endpoints (max 100 per request).
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
		description:
			'Product to attach to the deal, referenced by its product ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				name: 'Update',
				value: 'update',
				action: 'Update products on a deal',
				description: 'Update one or more existing product line items on a deal in RD Station CRM',
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

function buildLineItem(row: IDataObject, includeId: boolean): IDataObject {
	const item: IDataObject = {
		product_id: row.product_id,
		amount: row.amount,
		price: row.price,
		discount: row.discount,
		discount_type: row.discount_type,
		recurrence: row.recurrence,
		total: row.total,
	};
	if (includeId && row.id) item.id = row.id;
	return item;
}

export async function executeDealProduct(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	const dealId = this.getNodeParameter('dealId', i) as string;

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
		const deal_products = rows.map((row) => buildLineItem(row, false));
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
		const deal_products = rows.map((row) => buildLineItem(row, true));
		return rdCrmApiRequest.call(
			this,
			'PUT',
			`/deals/${dealId}/deal_products/batch`,
			{ deal_products },
		);
	}

	if (operation === 'remove') {
		const idsUi = this.getNodeParameter('idsUi', i, {}) as IDataObject;
		const rows = (idsUi.id as IDataObject[]) ?? [];
		const product_ids = rows.map((row) => row.id).filter(Boolean);
		await rdCrmApiRequest.call(
			this,
			'DELETE',
			`/deals/${dealId}/deal_products/batch`,
			{ product_ids },
		);
		return { deleted: true };
	}

	return {};
}
