import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

// ---------------------------------------------------------------------------
// TEMPLATE for v2 (OAuth2) resources — every other v2 resource mirrors this:
//   - resource value ends in "V2" (e.g. contactV2) so it never collides with v1
//   - fields gated by displayOptions.show.resource = ['<res>V2']
//   - execute uses the v2 transport (Bearer, { data } envelope, links.next paging)
//   - v2 field names differ from v1 (job_title, custom_fields as slug object, etc.)
// ---------------------------------------------------------------------------

const showOnly = { resource: ['contactV2'] };

export const contactV2Description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a contact', description: 'Create a new contact' },
			{ name: 'Get', value: 'get', action: 'Get a contact', description: 'Get a single contact by ID' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many contacts', description: 'Get many contacts' },
			{ name: 'Update', value: 'update', action: 'Update a contact', description: 'Update an existing contact' },
		],
		default: 'create',
	},

	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['get', 'update'] } },
		description: 'The ID of the contact',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Name of the contact',
	},

	{
		displayName: 'Emails',
		name: 'emailsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Email',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['create', 'update'] } },
		options: [
			{
				name: 'email',
				displayName: 'Email',
				values: [
					{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'e.g. name@example.com', default: '' },
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
		displayOptions: { show: { ...showOnly, operation: ['create', 'update'] } },
		options: [
			{
				name: 'phone',
				displayName: 'Phone',
				values: [
					{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{ name: 'Fax', value: 'fax' },
							{ name: 'Home', value: 'home' },
							{ name: 'Mobile', value: 'mobile' },
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
							'Choose from the list, or specify a slug using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getContactCustomFieldsV2' },
						default: '',
					},
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
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
			{ displayName: 'Birthday', name: 'birthday', type: 'dateTime', default: '' },
			{ displayName: 'Job Title', name: 'job_title', type: 'string', default: '' },
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getOrganizationsV2' },
				default: '',
			},
			{ displayName: 'WhatsApp Username', name: 'whatsapp_username', type: 'string', default: '' },
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
			{ displayName: 'Birthday', name: 'birthday', type: 'dateTime', default: '' },
			{ displayName: 'Job Title', name: 'job_title', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getOrganizationsV2' },
				default: '',
			},
			{ displayName: 'WhatsApp Username', name: 'whatsapp_username', type: 'string', default: '' },
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
				placeholder: 'e.g. name:~John',
				description:
					'RDQL filter expression, e.g. <code>job_title:~Director</code>. See the RD Station CRM v2 docs.',
			},
		],
	},
];

function buildContactV2Body(fields: IDataObject, customFieldsUi: IDataObject): IDataObject {
	const contact: IDataObject = {};

	for (const key of ['name', 'job_title', 'organization_id', 'whatsapp_username']) {
		if (fields[key]) contact[key] = fields[key];
	}
	if (fields.birthday) {
		contact.birthday = new Date(fields.birthday as string).toISOString().split('T')[0];
	}
	if (Array.isArray((fields.emailsUi as IDataObject)?.email)) {
		contact.emails = ((fields.emailsUi as IDataObject).email as IDataObject[]).map((e) => ({
			email: e.email,
		}));
	}
	if (Array.isArray((fields.phonesUi as IDataObject)?.phone)) {
		contact.phones = ((fields.phonesUi as IDataObject).phone as IDataObject[]).map((p) => ({
			phone: p.phone,
			type: p.type,
		}));
	}
	if (Array.isArray(customFieldsUi.field)) {
		const customFields: IDataObject = {};
		for (const f of customFieldsUi.field as IDataObject[]) {
			if (f.slug) customFields[f.slug as string] = f.value;
		}
		if (Object.keys(customFields).length) contact.custom_fields = customFields;
	}

	return contact;
}

export async function executeContactV2(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const emailsUi = this.getNodeParameter('emailsUi', i, {}) as IDataObject;
		const phonesUi = this.getNodeParameter('phonesUi', i, {}) as IDataObject;
		const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
		const body = buildContactV2Body({ name, ...additionalFields, emailsUi, phonesUi }, customFieldsUi);
		const response = await rdCrmV2Request.call(this, 'POST', '/contacts', body);
		return response.data ?? response;
	}

	if (operation === 'get') {
		const contactId = this.getNodeParameter('contactId', i) as string;
		const response = await rdCrmV2Request.call(this, 'GET', `/contacts/${contactId}`);
		return response.data ?? response;
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = {};
		if (filters.filter) qs.filter = filters.filter;

		if (returnAll) {
			return rdCrmV2RequestAllItems.call(this, '/contacts', qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', '/contacts', {}, qs);
		return response.data ?? response;
	}

	if (operation === 'update') {
		const contactId = this.getNodeParameter('contactId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const emailsUi = this.getNodeParameter('emailsUi', i, {}) as IDataObject;
		const phonesUi = this.getNodeParameter('phonesUi', i, {}) as IDataObject;
		const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
		const body = buildContactV2Body({ ...updateFields, emailsUi, phonesUi }, customFieldsUi);
		const response = await rdCrmV2Request.call(this, 'PUT', `/contacts/${contactId}`, body);
		return response.data ?? response;
	}

	return {};
}
