import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

// ---------------------------------------------------------------------------
// v2 (OAuth2) DEAL resource — mirrors the ContactV2 template:
//   - resource value ends in "V2" (dealV2) so it never collides with v1
//   - fields gated by displayOptions.show.resource = ['dealV2']
//   - execute uses the v2 transport (Bearer, { data } envelope, links.next paging)
//   - v2 field names differ from v1 (stage_id, custom_fields as slug object, etc.)
// ---------------------------------------------------------------------------

const showOnly = { resource: ['dealV2'] };

export const dealV2Description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a deal', description: 'Create a new deal (sales opportunity) in RD Station CRM (API v2) and return the created record' },
			{ name: 'Get', value: 'get', action: 'Get a deal', description: 'Retrieve a single deal by its ID from RD Station CRM (API v2)' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many deals', description: 'Retrieve a paginated list of deals from RD Station CRM (API v2)' },
			{ name: 'Mark as Lost', value: 'markLost', action: 'Mark a deal as lost', description: 'Mark a deal as lost in RD Station CRM (API v2), setting its status to lost with a loss reason' },
			{ name: 'Mark as Won', value: 'markWon', action: 'Mark a deal as won', description: 'Mark a deal as won in RD Station CRM (API v2), setting its status to won' },
			{ name: 'Move to Stage', value: 'moveToStage', action: 'Move a deal to a stage', description: 'Move a deal to a different pipeline stage in RD Station CRM (API v2)' },
			{ name: 'Update', value: 'update', action: 'Update a deal', description: 'Update fields of an existing deal in RD Station CRM (API v2)' },
		],
		default: 'create',
	},

	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { ...showOnly, operation: ['get', 'update', 'markWon', 'markLost', 'moveToStage'] },
		},
		description: 'Unique identifier of the deal to operate on, taken from the ID returned by a create or get deals operation',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Title of the deal to create, for example Website redesign for Acme',
	},

	{
		displayName: 'Loss Reason Name or ID',
		name: 'lost_reason_id',
		type: 'options',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['markLost'] } },
		description:
			'Reason the deal was lost, required when marking a deal as lost. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getLossReasonsV2' },
	},
	{
		displayName: 'Stage Name or ID',
		name: 'stage_id',
		type: 'options',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['moveToStage'] } },
		description:
			'Pipeline stage to move the deal into. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getStagesV2' },
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
							'Custom field of the deal to set, identified by its slug. Choose from the list, or specify a slug using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						typeOptions: { loadOptionsMethod: 'getDealCustomFieldsV2' },
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
			{
				displayName: 'Campaign Name or ID',
				name: 'campaign_id',
				type: 'options',
				description:
					'Marketing campaign to associate with the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getCampaignsV2' },
				default: '',
			},
			{
				displayName: 'Contact IDs',
				name: 'contact_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of contact IDs to associate with the deal, each ID coming from a contact create or get operation',
			},
			{ displayName: 'Expected Close Date', name: 'expected_close_date', type: 'dateTime', default: '', description: 'Expected close date of the deal in ISO 8601 format, e.g. 2026-07-08 or 2026-07-08T14:30:00Z' },
			{ displayName: 'One Time Price', name: 'one_time_price', type: 'number', default: 0, description: 'One-time non-recurring deal value in the account currency as a decimal number, e.g. 1500.00' },
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				type: 'options',
				description:
					'Organization (company) that the deal belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getOrganizationsV2' },
				default: '',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				description:
					'User who owns and is responsible for the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsersV2' },
				default: '',
			},
			{ displayName: 'Rating', name: 'rating', type: 'number', default: 0, description: 'Deal rating as an integer score, e.g. 5' },
			{ displayName: 'Recurrence Price', name: 'recurrence_price', type: 'number', default: 0, description: 'Recurring deal value in the account currency as a decimal number, e.g. 199.90' },
			{
				displayName: 'Source Name or ID',
				name: 'source_id',
				type: 'options',
				description:
					'Origin or lead source of the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getSourcesV2' },
				default: '',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				description:
					'Pipeline stage of the deal in the sales funnel. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getStagesV2' },
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
		displayOptions: { show: { ...showOnly, operation: ['update'] } },
		options: [
			{ displayName: 'Expected Close Date', name: 'expected_close_date', type: 'dateTime', default: '', description: 'Expected close date of the deal in ISO 8601 format, e.g. 2026-07-08 or 2026-07-08T14:30:00Z' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New name for the deal, e.g. Website redesign for Acme' },
			{ displayName: 'One Time Price', name: 'one_time_price', type: 'number', default: 0, description: 'One-time non-recurring deal value in the account currency as a decimal number, e.g. 1500.00' },
			{
				displayName: 'Organization Name or ID',
				name: 'organization_id',
				type: 'options',
				description:
					'Organization (company) that the deal belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getOrganizationsV2' },
				default: '',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				description:
					'User who owns and is responsible for the deal. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsersV2' },
				default: '',
			},
			{ displayName: 'Rating', name: 'rating', type: 'number', default: 0, description: 'Deal rating as an integer score, e.g. 5' },
			{ displayName: 'Recurrence Price', name: 'recurrence_price', type: 'number', default: 0, description: 'Recurring deal value in the account currency as a decimal number, e.g. 199.90' },
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				description:
					'Pipeline stage of the deal in the sales funnel. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getStagesV2' },
				default: '',
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
				displayName: 'RDQL Filter',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'e.g. name:~Website',
				description:
					'RDQL filter expression to narrow the deals returned, for example <code>name:~Website</code>, see the RD Station CRM v2 docs',
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
				placeholder: 'e.g. -created_at',
				description:
					'Field to sort the deals by, prefix with a hyphen for descending order, for example <code>-created_at</code>',
			},
		],
	},
];

function buildDealV2Body(fields: IDataObject, customFieldsUi: IDataObject): IDataObject {
	const deal: IDataObject = {};

	for (const key of ['name', 'stage_id', 'owner_id', 'organization_id', 'source_id', 'campaign_id']) {
		if (fields[key]) deal[key] = fields[key];
	}
	for (const key of ['one_time_price', 'recurrence_price', 'rating']) {
		if (fields[key] !== undefined && fields[key] !== '') deal[key] = fields[key];
	}
	if (fields.expected_close_date) {
		deal.expected_close_date = new Date(fields.expected_close_date as string)
			.toISOString()
			.split('T')[0];
	}
	if (fields.contact_ids) {
		const ids = (fields.contact_ids as string)
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean);
		if (ids.length) deal.contact_ids = ids;
	}
	if (Array.isArray(customFieldsUi.field)) {
		const customFields: IDataObject = {};
		for (const f of customFieldsUi.field as IDataObject[]) {
			if (f.slug) customFields[f.slug as string] = f.value;
		}
		if (Object.keys(customFields).length) deal.custom_fields = customFields;
	}

	return deal;
}

export async function executeDealV2(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
		// Do NOT send status on create — v2 only allows status=ongoing at creation.
		const body = buildDealV2Body({ name, ...additionalFields }, customFieldsUi);
		const response = await rdCrmV2Request.call(this, 'POST', '/deals', body);
		return response.data ?? response;
	}

	if (operation === 'get') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const response = await rdCrmV2Request.call(this, 'GET', `/deals/${dealId}`);
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
			return rdCrmV2RequestAllItems.call(this, '/deals', qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', '/deals', {}, qs);
		return response.data ?? response;
	}

	if (operation === 'update') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
		const body = buildDealV2Body({ ...updateFields }, customFieldsUi);
		const response = await rdCrmV2Request.call(this, 'PUT', `/deals/${dealId}`, body);
		return response.data ?? response;
	}

	if (operation === 'markWon') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const response = await rdCrmV2Request.call(this, 'PUT', `/deals/${dealId}`, { status: 'won' });
		return response.data ?? response;
	}

	if (operation === 'markLost') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const lostReasonId = this.getNodeParameter('lost_reason_id', i) as string;
		const response = await rdCrmV2Request.call(this, 'PUT', `/deals/${dealId}`, {
			status: 'lost',
			lost_reason_id: lostReasonId,
		});
		return response.data ?? response;
	}

	if (operation === 'moveToStage') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const stageId = this.getNodeParameter('stage_id', i) as string;
		const response = await rdCrmV2Request.call(this, 'PUT', `/deals/${dealId}`, { stage_id: stageId });
		return response.data ?? response;
	}

	return {};
}
