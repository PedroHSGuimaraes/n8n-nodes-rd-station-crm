import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// PRODUCT resource — mirrors the Contact.ts structure:
//   1. `productDescription` = operations dropdown + fields (INodeProperties[])
//   2. `executeProduct(operation, i)` = programmatic dispatch using the transport helpers
// Products cannot be deleted through the API, so there is no delete operation.
// ---------------------------------------------------------------------------

const showOnlyForProducts = {
	resource: ['product'],
};

export const productDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForProducts },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a product',
				description: 'Create a new product in the RD Station CRM catalog and return the created product',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a product',
				description: 'Retrieve a single product from the RD Station CRM catalog by its ID, returning its name and base price',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many products',
				description: 'Retrieve a paginated list of products from the RD Station CRM catalog, with an optional name search filter',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Update an existing product in the RD Station CRM catalog by its ID, changing its name, description or base price',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForProducts, operation: ['get', 'update'] } },
		description: 'ID of the product to operate on in the RD Station CRM catalog, obtained from a create or get many products operation',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForProducts, operation: ['create'] } },
		description: 'Name of the product, between 2 and 255 characters, for example Annual subscription plan',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForProducts, operation: ['create'] } },
		options: [
			{
				displayName: 'Base Price',
				name: 'basePrice',
				type: 'number',
				default: 0,
				description: 'Base unit price of the product as a number, for example 199.90',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Free-text description of the product and what it includes',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForProducts, operation: ['update'] } },
		options: [
			{
				displayName: 'Base Price',
				name: 'basePrice',
				type: 'number',
				default: 0,
				description: 'Base unit price of the product as a number, for example 199.90',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Free-text description of the product and what it includes',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the product, between 2 and 255 characters, for example Annual subscription plan',
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
		displayOptions: { show: { ...showOnlyForProducts, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForProducts, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForProducts, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Return only products whose name matches this search text',
			},
		],
	},
];

function buildProductBody(fields: IDataObject): IDataObject {
	const product: IDataObject = {};

	if (fields.name) product.name = fields.name;
	if (fields.description) product.description = fields.description;
	if (fields.basePrice !== undefined && fields.basePrice !== '') {
		product.base_price = fields.basePrice;
	}

	return product;
}

export async function executeProduct(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const product = buildProductBody({ name, ...additionalFields });
		return rdCrmApiRequest.call(this, 'POST', '/products', product);
	}

	if (operation === 'get') {
		const productId = this.getNodeParameter('productId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/products/${productId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = { ...filters };

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'products', 'GET', '/products', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/products', {}, qs);
		return response.products ?? response;
	}

	if (operation === 'update') {
		const productId = this.getNodeParameter('productId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const product = buildProductBody(updateFields);
		return rdCrmApiRequest.call(this, 'PUT', `/products/${productId}`, product);
	}

	return {};
}
