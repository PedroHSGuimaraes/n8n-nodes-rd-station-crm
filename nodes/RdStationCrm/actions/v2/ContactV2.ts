import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';
import { getIdParameter } from '../../helpers/resourceLocator';

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
			{ name: 'Create', value: 'create', action: 'Create a contact', description: 'Create a new contact (person or lead) in RD Station CRM (API v2) and return the created record' },
			{ name: 'Get', value: 'get', action: 'Get a contact', description: 'Retrieve a single contact by its ID from RD Station CRM (API v2)' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many contacts', description: 'Retrieve a paginated list of contacts from RD Station CRM (API v2)' },
			{ name: 'Update', value: 'update', action: 'Update a contact', description: 'Update fields of an existing contact in RD Station CRM (API v2)' },
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
		description: 'Unique identifier of the contact to operate on, taken from the ID returned by a create or get contacts operation',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Full name of the contact, for example Maria Silva',
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
					{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'e.g. name@example.com', default: '', description: 'Email address of the contact, e.g. maria@empresa.com' },
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
					{ displayName: 'Phone', name: 'phone', type: 'string', default: '', description: 'Phone number including country and area code, e.g. +55 11 99999-9999' },
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
						description: 'Category of the phone number. One of: fax, home, mobile, work.',
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
						description: 'Custom field of the contact to set, identified by its slug. Choose from the list, or specify a slug using an <a href="https://docs.n8n.io/code/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						typeOptions: { loadOptionsMethod: 'getContactCustomFieldsV2' },
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
			{ displayName: 'Birthday', name: 'birthday', type: 'dateTime', default: '', description: 'Birthday of the contact in ISO 8601 format, e.g. 2026-07-08 or 2026-07-08T14:30:00Z' },
			{ displayName: 'Job Title', name: 'job_title', type: 'string', default: '', description: 'Job title of the contact, e.g. Marketing Manager' },
			{
				displayName: 'Legal Bases',
				name: 'legalBasesUi',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Legal Basis',
				default: {},
				description: 'Legal bases (LGPD) that authorize processing the personal data of this contact',
				options: [
					{
						name: 'legalBase',
						displayName: 'Legal Basis',
						values: [
							{
								displayName: 'Category',
								name: 'category',
								type: 'options',
								options: [{ name: 'Communications', value: 'communications' }],
								default: 'communications',
								description: 'Category of the legal basis. One of: communications.',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Consent', value: 'consent' },
									{ name: 'Judicial Process', value: 'judicial_process' },
									{ name: 'Legitimate Interest', value: 'legitimate_interest' },
									{ name: 'Pre-Existent Contract', value: 'pre_existent_contract' },
									{ name: 'Public Interest', value: 'public_interest' },
									{ name: 'Vital Interest', value: 'vital_interest' },
								],
								default: 'consent',
								description: 'Which legal basis authorizes the processing of the personal data',
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [
									{ name: 'Declined', value: 'declined' },
									{ name: 'Granted', value: 'granted' },
								],
								default: 'granted',
								description: 'Status of the legal basis. One of: granted, declined.',
							},
						],
					},
				],
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				type: 'options',
				description: 'Organization (company) the contact works for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: { loadOptionsMethod: 'getOrganizationsV2' },
				default: '',
			},
			{
				displayName: 'Social Profiles',
				name: 'socialProfilesUi',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Social Profile',
				default: {},
				description: 'Social network profiles of the contact',
				options: [
					{
						name: 'profile',
						displayName: 'Profile',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Facebook', value: 'facebook' },
									{ name: 'LinkedIn', value: 'linkedin' },
									{ name: 'Skype', value: 'skype' },
								],
								default: 'linkedin',
								description: 'Social network of the profile. One of: facebook, linkedin, skype.',
							},
							{
								displayName: 'Username',
								name: 'username',
								type: 'string',
								default: '',
								description: 'Username of the contact on that social network',
							},
						],
					},
				],
			},
			{ displayName: 'WhatsApp Username', name: 'whatsapp_username', type: 'string', default: '', description: 'WhatsApp number or username of the contact, e.g. +55 11 99999-9999' },
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
			{ displayName: 'Birthday', name: 'birthday', type: 'dateTime', default: '', description: 'Birthday of the contact in ISO 8601 format, e.g. 2026-07-08 or 2026-07-08T14:30:00Z' },
			{ displayName: 'Job Title', name: 'job_title', type: 'string', default: '', description: 'Job title of the contact, e.g. Marketing Manager' },
			{
				displayName: 'Legal Bases',
				name: 'legalBasesUi',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Legal Basis',
				default: {},
				description: 'Legal bases (LGPD) that authorize processing the personal data of this contact',
				options: [
					{
						name: 'legalBase',
						displayName: 'Legal Basis',
						values: [
							{
								displayName: 'Category',
								name: 'category',
								type: 'options',
								options: [{ name: 'Communications', value: 'communications' }],
								default: 'communications',
								description: 'Category of the legal basis. One of: communications.',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Consent', value: 'consent' },
									{ name: 'Judicial Process', value: 'judicial_process' },
									{ name: 'Legitimate Interest', value: 'legitimate_interest' },
									{ name: 'Pre-Existent Contract', value: 'pre_existent_contract' },
									{ name: 'Public Interest', value: 'public_interest' },
									{ name: 'Vital Interest', value: 'vital_interest' },
								],
								default: 'consent',
								description: 'Which legal basis authorizes the processing of the personal data',
							},
							{
								displayName: 'Status',
								name: 'status',
								type: 'options',
								options: [
									{ name: 'Declined', value: 'declined' },
									{ name: 'Granted', value: 'granted' },
								],
								default: 'granted',
								description: 'Status of the legal basis. One of: granted, declined.',
							},
						],
					},
				],
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New full name for the contact, e.g. Maria Silva' },
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				type: 'options',
				description: 'Organization (company) the contact works for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: { loadOptionsMethod: 'getOrganizationsV2' },
				default: '',
			},
			{
				displayName: 'Social Profiles',
				name: 'socialProfilesUi',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Social Profile',
				default: {},
				description: 'Social network profiles of the contact',
				options: [
					{
						name: 'profile',
						displayName: 'Profile',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{ name: 'Facebook', value: 'facebook' },
									{ name: 'LinkedIn', value: 'linkedin' },
									{ name: 'Skype', value: 'skype' },
								],
								default: 'linkedin',
								description: 'Social network of the profile. One of: facebook, linkedin, skype.',
							},
							{
								displayName: 'Username',
								name: 'username',
								type: 'string',
								default: '',
								description: 'Username of the contact on that social network',
							},
						],
					},
				],
			},
			{ displayName: 'WhatsApp Username', name: 'whatsapp_username', type: 'string', default: '', description: 'WhatsApp number or username of the contact, e.g. +55 11 99999-9999' },
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
					'RDQL filter expression to narrow the contacts returned, for example <code>job_title:~Director</code>, see the RD Station CRM v2 docs',
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
	// Perfis sociais e bases legais chegam como coleções do editor e vão como listas de objetos.
	if (Array.isArray((fields.socialProfilesUi as IDataObject)?.profile)) {
		contact.social_profiles = ((fields.socialProfilesUi as IDataObject).profile as IDataObject[]).map((s) => ({
			type: s.type,
			username: s.username,
		}));
	}
	if (Array.isArray((fields.legalBasesUi as IDataObject)?.legalBase)) {
		contact.legal_bases = ((fields.legalBasesUi as IDataObject).legalBase as IDataObject[]).map((b) => ({
			category: b.category,
			type: b.type,
			status: b.status,
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
): Promise<unknown> {
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
		const contactId = getIdParameter.call(this, 'contactId', i);
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
		const contactId = getIdParameter.call(this, 'contactId', i);
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
