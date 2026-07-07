import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForOrganizations = {
	resource: ['organization'],
};

export const organizationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForOrganizations },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an organization',
				description: 'Create a new organization',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an organization',
				description: 'Get a single organization by ID',
			},
			{
				name: 'Get Contacts',
				value: 'getContacts',
				action: 'Get contacts of an organization',
				description: 'Get many contacts linked to an organization',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many organizations',
				description: 'Get many organizations',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an organization',
				description: 'Update an existing organization',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update / getContacts) -----
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { ...showOnlyForOrganizations, operation: ['get', 'update', 'getContacts'] },
		},
		description: 'The ID of the organization',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['create'] } },
		description: 'Name of the organization',
	},

	// ----- Custom Fields (create + update) -----
	{
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: {},
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['create', 'update'] } },
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getOrganizationCustomFields' },
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['create'] } },
		options: [
			{ displayName: 'Resume', name: 'resume', type: 'string', default: '', description: 'Short description of the organization' },
			{
				displayName: 'Segments',
				name: 'organizationSegments',
				type: 'string',
				default: '',
				description: 'Comma-separated list of segment names to link',
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['update'] } },
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Resume', name: 'resume', type: 'string', default: '', description: 'Short description of the organization' },
			{
				displayName: 'Segments',
				name: 'organizationSegments',
				type: 'string',
				default: '',
				description: 'Comma-separated list of segment names to link',
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
		],
	},

	// ----- Get Many / Get Contacts controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['getMany', 'getContacts'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...showOnlyForOrganizations,
				operation: ['getMany', 'getContacts'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['getMany'] } },
		options: [
			{ displayName: 'Search', name: 'q', type: 'string', default: '', description: 'Search by organization name' },
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnlyForOrganizations, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Sort By',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Name', value: 'name' },
					{ name: 'Updated At', value: 'updated_at' },
				],
				default: 'name',
			},
			{
				displayName: 'Sort Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
			},
		],
	},
];

function buildOrganizationBody(this: IExecuteFunctions, i: number, fields: IDataObject): IDataObject {
	const organization: IDataObject = {};

	if (fields.name) organization.name = fields.name;
	if (fields.resume) organization.resume = fields.resume;
	if (fields.url) organization.url = fields.url;
	if (fields.userId) organization.user_id = fields.userId;
	if (fields.organizationSegments) {
		organization.organization_segments = (fields.organizationSegments as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
	if (Array.isArray(customFieldsUi.field)) {
		organization.organization_custom_fields = (customFieldsUi.field as IDataObject[]).map((f) => ({
			custom_field_id: f.fieldId,
			value: f.value,
		}));
	}

	return organization;
}

export async function executeOrganization(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const organization = buildOrganizationBody.call(this, i, { name, ...additionalFields });
		return rdCrmApiRequest.call(this, 'POST', '/organizations', { organization });
	}

	if (operation === 'get') {
		const organizationId = this.getNodeParameter('organizationId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/organizations/${organizationId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const qs: IDataObject = { ...options };
		if (filters.q) qs.q = filters.q;
		if (filters.userId) qs.user_id = filters.userId;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'organizations', 'GET', '/organizations', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/organizations', {}, qs);
		return response.organizations ?? response;
	}

	if (operation === 'update') {
		const organizationId = this.getNodeParameter('organizationId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const organization = buildOrganizationBody.call(this, i, updateFields);
		return rdCrmApiRequest.call(this, 'PUT', `/organizations/${organizationId}`, { organization });
	}

	if (operation === 'getContacts') {
		const organizationId = this.getNodeParameter('organizationId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const endpoint = `/organizations/${organizationId}/contacts`;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'contacts', 'GET', endpoint);
		}
		const qs: IDataObject = { limit: this.getNodeParameter('limit', i) as number };
		const response = await rdCrmApiRequest.call(this, 'GET', endpoint, {}, qs);
		return response.contacts ?? response;
	}

	return {};
}
