import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// CUSTOM FIELD RESOURCE — mirrors the structure of the Contact template:
//   1. `customFieldDescription` = operations dropdown + fields (INodeProperties[])
//   2. `executeCustomField(operation, i)` = programmatic dispatch using the transport helpers
// Keep displayNames Title Case, descriptions/actions Sentence case,
// options alphabetically sorted, every property with a default.
// ---------------------------------------------------------------------------

const showOnlyForCustomFields = {
	resource: ['customField'],
};

export const customFieldDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForCustomFields },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a custom field',
				description: 'Create a new custom field',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a custom field',
				description: 'Delete a custom field',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a custom field',
				description: 'Get a single custom field by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many custom fields',
				description: 'Get many custom fields',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a custom field',
				description: 'Update an existing custom field',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update / delete) -----
	{
		displayName: 'Custom Field ID',
		name: 'customFieldId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['get', 'update', 'delete'] } },
		description: 'The ID of the custom field',
	},

	// ----- Required create fields -----
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['create'] } },
		description: 'Display label of the custom field',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['create'] } },
		options: [
			{ name: 'Date', value: 'date' },
			{ name: 'Multiple Choice', value: 'multiple_choice' },
			{ name: 'Option', value: 'option' },
			{ name: 'Text', value: 'text' },
		],
		default: 'text',
		description: 'Data type of the custom field',
	},
	{
		displayName: 'Entity',
		name: 'entity',
		type: 'options',
		required: true,
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['create'] } },
		options: [
			{ name: 'Contact', value: 'contact' },
			{ name: 'Deal', value: 'deal' },
			{ name: 'Organization', value: 'organization' },
			{ name: 'Product', value: 'product' },
		],
		default: 'contact',
		description: 'Entity the custom field belongs to (maps to the API "for" param)',
	},

	// ----- Additional fields (create) -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['create'] } },
		options: [
			{
				displayName: 'Allow New',
				name: 'allowNew',
				type: 'boolean',
				default: false,
				description: 'Whether new values can be added (only meaningful for option and multiple choice types)',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'string',
				default: '',
				description: 'Comma-separated list of choices (only meaningful for option and multiple choice types)',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'Display order of the custom field (lower values appear first)',
			},
			{
				displayName: 'Required',
				name: 'required',
				type: 'boolean',
				default: false,
				description: 'Whether the custom field must be filled in',
			},
			{
				displayName: 'Unique',
				name: 'unique',
				type: 'boolean',
				default: false,
				description: 'Whether the custom field value must be unique across records',
			},
		],
	},

	// ----- Update fields -----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['update'] } },
		options: [
			{
				displayName: 'Allow New',
				name: 'allowNew',
				type: 'boolean',
				default: false,
				description: 'Whether new values can be added (only meaningful for option and multiple choice types)',
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Display label of the custom field',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'string',
				default: '',
				description: 'Comma-separated list of choices (only meaningful for option and multiple choice types)',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'Display order of the custom field (lower values appear first)',
			},
			{
				displayName: 'Required',
				name: 'required',
				type: 'boolean',
				default: false,
				description: 'Whether the custom field must be filled in',
			},
			{
				displayName: 'Unique',
				name: 'unique',
				type: 'boolean',
				default: false,
				description: 'Whether the custom field value must be unique across records',
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
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForCustomFields, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Entity',
		name: 'filterEntity',
		type: 'options',
		default: 'all',
		description: 'Filter by the entity the custom field belongs to (maps to the API "for" param)',
		displayOptions: { show: { ...showOnlyForCustomFields, operation: ['getMany'] } },
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Contact', value: 'contact' },
			{ name: 'Deal', value: 'deal' },
			{ name: 'Organization', value: 'organization' },
			{ name: 'Product', value: 'product' },
		],
	},
];

/**
 * Apply the optional custom-field attributes shared by create/update onto the body.
 * Maps the n8n `allowNew` param to the API's `allow_new` and splits the
 * comma-separated `options` string into an array.
 */
function applyCustomFieldOptions(body: IDataObject, fields: IDataObject): void {
	if (fields.label !== undefined) body.label = fields.label;
	if (fields.order !== undefined) body.order = fields.order;
	if (fields.required !== undefined) body.required = fields.required;
	if (fields.unique !== undefined) body.unique = fields.unique;
	if (fields.allowNew !== undefined) body.allow_new = fields.allowNew;
	if (fields.options) {
		body.options = (fields.options as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
}

export async function executeCustomField(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (operation === 'create') {
		const label = this.getNodeParameter('label', i) as string;
		const type = this.getNodeParameter('type', i) as string;
		const entity = this.getNodeParameter('entity', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		// NOTE: Body is sent TOP-LEVEL (not wrapped in a `custom_field` object). The RD Station
		// CRM v1 docs list `label`/`type`/`for`/... as top-level "Body params"; the API field is
		// literally named `for`. If the API actually requires wrapping, change to { custom_field: body }.
		const body: IDataObject = { label, type, for: entity };
		applyCustomFieldOptions(body, additionalFields);

		return rdCrmApiRequest.call(this, 'POST', '/custom_fields', body);
	}

	if (operation === 'get') {
		const customFieldId = this.getNodeParameter('customFieldId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/custom_fields/${customFieldId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filterEntity = this.getNodeParameter('filterEntity', i, 'all') as string;

		// The API field is literally named `for`; omit it for the "All" selection.
		const qs: IDataObject = {};
		if (filterEntity && filterEntity !== 'all') qs.for = filterEntity;

		// /custom_fields returns a bare JSON array — rdCrmApiRequestAllItems handles that shape.
		const items = await rdCrmApiRequestAllItems.call(
			this,
			'custom_fields',
			'GET',
			'/custom_fields',
			{},
			qs,
		);

		if (returnAll) return items;
		const limit = this.getNodeParameter('limit', i) as number;
		return items.slice(0, limit);
	}

	if (operation === 'update') {
		const customFieldId = this.getNodeParameter('customFieldId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

		// NOTE: Body is sent TOP-LEVEL (not wrapped in a `custom_field` object) — see create note.
		const body: IDataObject = {};
		applyCustomFieldOptions(body, updateFields);

		return rdCrmApiRequest.call(this, 'PUT', `/custom_fields/${customFieldId}`, body);
	}

	if (operation === 'delete') {
		const customFieldId = this.getNodeParameter('customFieldId', i) as string;
		await rdCrmApiRequest.call(this, 'DELETE', `/custom_fields/${customFieldId}`);
		return { deleted: true };
	}

	return {};
}
