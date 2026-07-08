import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

// ---------------------------------------------------------------------------
// v2 (OAuth2) resource — mirrors ContactV2 template.
// Custom fields describe extra attributes attached to a given entity
// (contact/deal/organization/product) and support full CRUD in the v2 API.
// ---------------------------------------------------------------------------

const showOnly = { resource: ['customFieldV2'] };

export const customFieldV2Description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a custom field', description: 'Create a new custom field definition in RD Station CRM (API v2) and return the created record' },
			{ name: 'Delete', value: 'delete', action: 'Delete a custom field', description: 'Delete a custom field definition by its ID from RD Station CRM (API v2)' },
			{ name: 'Get', value: 'get', action: 'Get a custom field', description: 'Retrieve a single custom field definition by its ID from RD Station CRM (API v2)' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many custom fields', description: 'Retrieve a paginated list of custom field definitions from RD Station CRM (API v2)' },
			{ name: 'Update', value: 'update', action: 'Update a custom field', description: 'Update an existing custom field definition in RD Station CRM (API v2)' },
		],
		default: 'create',
	},

	{
		displayName: 'Custom Field ID',
		name: 'customFieldId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['delete', 'get', 'update'] } },
		description: 'Unique identifier of the custom field definition to operate on, taken from the ID returned by a create or get custom fields operation',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Display name of the custom field to create, for example Industry sector',
	},
	{
		displayName: 'Entity',
		name: 'entity',
		type: 'options',
		required: true,
		default: 'contact',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		options: [
			{ name: 'Contact', value: 'contact' },
			{ name: 'Deal', value: 'deal' },
			{ name: 'Organization', value: 'organization' },
			{ name: 'Product', value: 'product' },
		],
		description: 'Type of record this custom field is attached to, one of contact, deal, organization or product',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: 'text',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		options: [
			{ name: 'Date', value: 'date' },
			{ name: 'Multiple Choice', value: 'multiple_choice' },
			{ name: 'Number', value: 'number' },
			{ name: 'Option', value: 'option' },
			{ name: 'Text', value: 'text' },
		],
		description: 'Data type of the custom field, such as text, number, date, option or multiple choice',
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		options: [
			{
				displayName: 'Allow New Option',
				name: 'allow_new_option',
				type: 'boolean',
				default: false,
				description: 'Whether users can add new options when filling an option or multiple choice field',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'string',
				default: '',
				placeholder: 'e.g. Red,Green,Blue',
				description: 'Comma-separated list of choices for option or multiple choice fields, for example Red,Green,Blue',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'Numeric position of the custom field in the display order, lower numbers appear first',
			},
			{
				displayName: 'Unique',
				name: 'unique',
				type: 'boolean',
				default: false,
				description: 'Whether each record must have a unique value for this field',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['update'] } },
		options: [
			{
				displayName: 'Allow New Option',
				name: 'allow_new_option',
				type: 'boolean',
				default: false,
				description: 'Whether users can add new options when filling an option or multiple choice field',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New display name for the custom field' },
			{
				displayName: 'Options',
				name: 'options',
				type: 'string',
				default: '',
				placeholder: 'e.g. Red,Green,Blue',
				description: 'Comma-separated list of choices for option or multiple choice fields, for example Red,Green,Blue',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'Numeric position of the custom field in the display order, lower numbers appear first',
			},
			{
				displayName: 'Unique',
				name: 'unique',
				type: 'boolean',
				default: false,
				description: 'Whether each record must have a unique value for this field',
			},
		],
	},

	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnly, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: { show: { ...showOnly, operation: ['getMany'], returnAll: [false] } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Entity',
				name: 'entity',
				type: 'options',
				default: '',
				options: [
					{ name: 'All', value: '' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Deal', value: 'deal' },
					{ name: 'Organization', value: 'organization' },
					{ name: 'Product', value: 'product' },
				],
				description: 'Return only custom fields belonging to this entity type, or all entities when left empty',
			},
		],
	},
];

function buildCustomFieldV2Body(fields: IDataObject): IDataObject {
	const body: IDataObject = {};

	for (const key of ['name', 'entity', 'type', 'unique', 'allow_new_option', 'order']) {
		if (fields[key] !== undefined && fields[key] !== '') body[key] = fields[key];
	}
	if (typeof fields.options === 'string' && fields.options) {
		body.options = (fields.options as string)
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean);
	}

	return body;
}

export async function executeCustomFieldV2(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const entity = this.getNodeParameter('entity', i) as string;
		const type = this.getNodeParameter('type', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = buildCustomFieldV2Body({ name, entity, type, ...additionalFields });
		const response = await rdCrmV2Request.call(this, 'POST', '/custom_fields', body);
		return response.data ?? response;
	}

	if (operation === 'delete') {
		const customFieldId = this.getNodeParameter('customFieldId', i) as string;
		await rdCrmV2Request.call(this, 'DELETE', `/custom_fields/${customFieldId}`);
		return { deleted: true };
	}

	if (operation === 'get') {
		const customFieldId = this.getNodeParameter('customFieldId', i) as string;
		const response = await rdCrmV2Request.call(this, 'GET', `/custom_fields/${customFieldId}`);
		return response.data ?? response;
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = {};
		if (filters.entity) qs.filter = `entity:${filters.entity}`;

		if (returnAll) {
			return rdCrmV2RequestAllItems.call(this, '/custom_fields', qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', '/custom_fields', {}, qs);
		return response.data ?? response;
	}

	if (operation === 'update') {
		const customFieldId = this.getNodeParameter('customFieldId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body = buildCustomFieldV2Body({ ...updateFields });
		const response = await rdCrmV2Request.call(this, 'PUT', `/custom_fields/${customFieldId}`, body);
		return response.data ?? response;
	}

	return {};
}
