import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

// ---------------------------------------------------------------------------
// v2 (OAuth2) Organization resource — mirrors the ContactV2 template:
//   - resource value ends in "V2" (organizationV2) so it never collides with v1
//   - fields gated by displayOptions.show.resource = ['organizationV2']
//   - execute uses the v2 transport (Bearer, { data } envelope, links.next paging)
// ---------------------------------------------------------------------------

const showOnly = { resource: ['organizationV2'] };

export const organizationV2Description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{ name: 'Create', value: 'create', action: 'Create an organization', description: 'Create a new organization (company) in RD Station CRM (API v2) and return the created record' },
			{ name: 'Get', value: 'get', action: 'Get an organization', description: 'Retrieve a single organization by its ID from RD Station CRM (API v2)' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many organizations', description: 'Retrieve a paginated list of organizations from RD Station CRM (API v2)' },
			{ name: 'Update', value: 'update', action: 'Update an organization', description: 'Update fields of an existing organization in RD Station CRM (API v2)' },
		],
		default: 'create',
	},

	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['get', 'update'] } },
		description: 'Unique identifier of the organization to operate on, taken from the ID returned by a create or get organizations operation',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Name of the company to create, for example Acme Corporation',
	},

	{
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['create', 'update'] } },
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'slug',
						type: 'options',
						description:
							'Custom field of the organization to set, identified by its slug. Choose from the list, or specify a slug using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getOrganizationCustomFieldsV2' },
						default: '',
					},
					{ displayName: 'Value', name: 'value', type: 'string', default: '', description: 'Value to store in the selected custom field, formatted to match that field type' },
				],
			},
		],
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '', description: 'Free-text description of the organization' },
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				description:
					'User who owns and is responsible for the organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsersV2' },
				default: '',
			},
			{
				displayName: 'Segment IDs',
				name: 'segment_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of segment IDs to assign to the organization',
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '', description: 'Website of the organization as a full URL including the https:// scheme, e.g. https://www.empresa.com' },
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
			{ displayName: 'Description', name: 'description', type: 'string', default: '', description: 'Free-text description of the organization' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New name for the company, e.g. Acme Corporation' },
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				description:
					'User who owns and is responsible for the organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsersV2' },
				default: '',
			},
			{
				displayName: 'Segment IDs',
				name: 'segment_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of segment IDs to assign to the organization',
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '', description: 'Website of the organization as a full URL including the https:// scheme, e.g. https://www.empresa.com' },
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
				displayName: 'RDQL Filter',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'e.g. name:~Acme',
				description:
					'RDQL filter expression to narrow the organizations returned, for example <code>name:~Acme</code>, see the RD Station CRM v2 docs',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				default: '',
				placeholder: 'e.g. name',
				description: 'Field to sort organizations by, prefix with a hyphen for descending order, for example <code>name</code> or <code>-created_at</code>',
			},
		],
	},
];

function buildOrganizationV2Body(fields: IDataObject, customFieldsUi: IDataObject): IDataObject {
	const organization: IDataObject = {};

	for (const key of ['name', 'description', 'url', 'owner_id']) {
		if (fields[key]) organization[key] = fields[key];
	}
	if (fields.segment_ids) {
		organization.segment_ids = (fields.segment_ids as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	if (Array.isArray(customFieldsUi.field)) {
		const customFields: IDataObject = {};
		for (const f of customFieldsUi.field as IDataObject[]) {
			if (f.slug) customFields[f.slug as string] = f.value;
		}
		if (Object.keys(customFields).length) organization.custom_fields = customFields;
	}

	return organization;
}

export async function executeOrganizationV2(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
		const body = buildOrganizationV2Body({ name, ...additionalFields }, customFieldsUi);
		const response = await rdCrmV2Request.call(this, 'POST', '/organizations', body);
		return response.data ?? response;
	}

	if (operation === 'get') {
		const organizationId = this.getNodeParameter('organizationId', i) as string;
		const response = await rdCrmV2Request.call(this, 'GET', `/organizations/${organizationId}`);
		return response.data ?? response;
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const qs: IDataObject = {};
		if (filters.filter) qs.filter = filters.filter;
		if (options.sort) qs.sort = options.sort;

		if (returnAll) {
			return rdCrmV2RequestAllItems.call(this, '/organizations', qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', '/organizations', {}, qs);
		return response.data ?? response;
	}

	if (operation === 'update') {
		const organizationId = this.getNodeParameter('organizationId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
		const body = buildOrganizationV2Body({ ...updateFields }, customFieldsUi);
		const response = await rdCrmV2Request.call(this, 'PUT', `/organizations/${organizationId}`, body);
		return response.data ?? response;
	}

	return {};
}
