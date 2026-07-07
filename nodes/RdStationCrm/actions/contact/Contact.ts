import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// TEMPLATE RESOURCE — every other resource mirrors this file's structure:
//   1. `<resource>Description` = operations dropdown + fields (INodeProperties[])
//   2. `execute<Resource>(operation, i)` = programmatic dispatch using the transport helpers
// Keep displayNames Title Case, descriptions/actions Sentence case,
// options alphabetically sorted, loadOptions fields suffixed "Name or ID".
// ---------------------------------------------------------------------------

const showOnlyForContacts = {
	resource: ['contact'],
};

export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForContacts },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a contact',
				description: 'Create a new contact',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a contact',
				description: 'Get a single contact by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many contacts',
				description: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a contact',
				description: 'Update an existing contact',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForContacts, operation: ['get', 'update'] } },
		description: 'The ID of the contact',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForContacts, operation: ['create'] } },
		description: 'Name of the contact',
	},

	// ----- Emails / Phones / Custom Fields (create + update) -----
	{
		displayName: 'Emails',
		name: 'emailsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Email',
		default: {},
		displayOptions: { show: { ...showOnlyForContacts, operation: ['create', 'update'] } },
		options: [
			{
				name: 'email',
				displayName: 'Email',
				values: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'e.g. name@example.com',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Phones',
		name: 'phonesUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Phone',
		default: {},
		displayOptions: { show: { ...showOnlyForContacts, operation: ['create', 'update'] } },
		options: [
			{
				name: 'phone',
				displayName: 'Phone',
				values: [
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Cellphone', value: 'cellphone' },
							{ name: 'Fax', value: 'fax' },
							{ name: 'Home', value: 'home' },
							{ name: 'Work', value: 'work' },
						],
						default: 'work',
					},
				],
			},
		],
	},
	{
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: {},
		displayOptions: { show: { ...showOnlyForContacts, operation: ['create', 'update'] } },
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
						typeOptions: { loadOptionsMethod: 'getContactCustomFields' },
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
		displayOptions: { show: { ...showOnlyForContacts, operation: ['create'] } },
		options: [
			{ displayName: 'Birthday', name: 'birthday', type: 'dateTime', default: '' },
			{ displayName: 'Deal IDs', name: 'dealIds', type: 'string', default: '', description: 'Comma-separated list of deal IDs to link' },
			{ displayName: 'Facebook', name: 'facebook', type: 'string', default: '' },
			{ displayName: 'LinkedIn', name: 'linkedin', type: 'string', default: '' },
			{
				displayName: 'Organization Name or ID',
				name: 'organizationId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getOrganizations' },
				default: '',
			},
			{ displayName: 'Skype', name: 'skype', type: 'string', default: '' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForContacts, operation: ['update'] } },
		options: [
			{ displayName: 'Birthday', name: 'birthday', type: 'dateTime', default: '' },
			{ displayName: 'Facebook', name: 'facebook', type: 'string', default: '' },
			{ displayName: 'LinkedIn', name: 'linkedin', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Organization Name or ID',
				name: 'organizationId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getOrganizations' },
				default: '',
			},
			{ displayName: 'Skype', name: 'skype', type: 'string', default: '' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
		],
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForContacts, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForContacts, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForContacts, operation: ['getMany'] } },
		options: [
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'e.g. name@example.com', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Search', name: 'q', type: 'string', default: '', description: 'Search by contact name' },
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnlyForContacts, operation: ['getMany'] } },
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

function buildContactBody(this: IExecuteFunctions, i: number, fields: IDataObject): IDataObject {
	const contact: IDataObject = {};

	if (fields.name) contact.name = fields.name;
	if (fields.title) contact.title = fields.title;
	if (fields.organizationId) contact.organization_id = fields.organizationId;
	for (const key of ['facebook', 'linkedin', 'skype']) {
		if (fields[key]) contact[key] = fields[key];
	}
	if (fields.dealIds) {
		contact.deal_ids = (fields.dealIds as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	if (fields.birthday) {
		const d = new Date(fields.birthday as string);
		contact.birthday = {
			day: d.getUTCDate(),
			month: d.getUTCMonth() + 1,
			year: d.getUTCFullYear(),
		};
	}

	const emailsUi = this.getNodeParameter('emailsUi', i, {}) as IDataObject;
	if (Array.isArray(emailsUi.email)) {
		contact.emails = (emailsUi.email as IDataObject[]).map((e) => ({ email: e.email }));
	}

	const phonesUi = this.getNodeParameter('phonesUi', i, {}) as IDataObject;
	if (Array.isArray(phonesUi.phone)) {
		contact.phones = (phonesUi.phone as IDataObject[]).map((p) => ({ phone: p.phone, type: p.type }));
	}

	const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
	if (Array.isArray(customFieldsUi.field)) {
		contact.contact_custom_fields = (customFieldsUi.field as IDataObject[]).map((f) => ({
			custom_field_id: f.fieldId,
			value: f.value,
		}));
	}

	return contact;
}

export async function executeContact(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const contact = buildContactBody.call(this, i, { name, ...additionalFields });
		return rdCrmApiRequest.call(this, 'POST', '/contacts', { contact });
	}

	if (operation === 'get') {
		const contactId = this.getNodeParameter('contactId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/contacts/${contactId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const qs: IDataObject = { ...filters, ...options };

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'contacts', 'GET', '/contacts', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/contacts', {}, qs);
		return response.contacts ?? response;
	}

	if (operation === 'update') {
		const contactId = this.getNodeParameter('contactId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const contact = buildContactBody.call(this, i, updateFields);
		return rdCrmApiRequest.call(this, 'PUT', `/contacts/${contactId}`, { contact });
	}

	return {};
}
