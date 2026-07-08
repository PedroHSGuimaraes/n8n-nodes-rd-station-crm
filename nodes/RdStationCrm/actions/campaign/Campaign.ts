import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForCampaigns = {
	resource: ['campaign'],
};

export const campaignDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForCampaigns },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a campaign',
				description: 'Create a new marketing campaign in RD Station CRM and return the created record including its ID',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a campaign',
				description: 'Retrieve a single campaign from RD Station CRM by its unique ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many campaigns',
				description: 'Retrieve a paginated list of campaigns from RD Station CRM, with an optional name filter',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a campaign',
				description: 'Update an existing RD Station CRM campaign identified by its ID and return the updated record',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForCampaigns, operation: ['get', 'update'] } },
		description: 'Unique ID of the campaign to retrieve or update, as returned by a Create or Get Many campaign operation',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForCampaigns, operation: ['create'] } },
		description: 'Name of the marketing campaign, for example Black Friday 2026',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForCampaigns, operation: ['create'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '', description: 'Description of the marketing campaign, e.g. Summer promotion for new leads' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForCampaigns, operation: ['update'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '', description: 'Description of the marketing campaign, e.g. Summer promotion for new leads' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'Name of the marketing campaign, e.g. Black Friday 2026' },
		],
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForCampaigns, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForCampaigns, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForCampaigns, operation: ['getMany'] } },
		options: [
			{ displayName: 'Search', name: 'q', type: 'string', default: '', description: 'Filter campaigns by name, returning those whose name matches the given text' },
		],
	},
];

export async function executeCampaign(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		// Body is sent top-level (no wrapper). Confirmed against the RD Station CRM
		// campaigns docs: { "name": ..., "description": ... }.
		const body: IDataObject = { name, ...additionalFields };
		return rdCrmApiRequest.call(this, 'POST', '/campaigns', body);
	}

	if (operation === 'get') {
		const campaignId = this.getNodeParameter('campaignId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/campaigns/${campaignId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = { ...filters };

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'campaigns', 'GET', '/campaigns', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/campaigns', {}, qs);
		return response.campaigns ?? response;
	}

	if (operation === 'update') {
		const campaignId = this.getNodeParameter('campaignId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		// Body is sent top-level (no wrapper), matching the create request shape.
		return rdCrmApiRequest.call(this, 'PUT', `/campaigns/${campaignId}`, updateFields);
	}

	return {};
}
