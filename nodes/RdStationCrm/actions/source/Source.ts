import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForSources = {
	resource: ['source'],
};

export const sourceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForSources },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a source',
				description: 'Create a new deal source',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a source',
				description: 'Get a single deal source by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many sources',
				description: 'Get many deal sources',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a source',
				description: 'Update an existing deal source',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForSources, operation: ['get', 'update'] } },
		description: 'The ID of the deal source',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForSources, operation: ['create'] } },
		description: 'Name of the deal source',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForSources, operation: ['create'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForSources, operation: ['update'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
		],
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForSources, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForSources, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForSources, operation: ['getMany'] } },
		options: [
			{ displayName: 'Search', name: 'q', type: 'string', default: '', description: 'Search by deal source name' },
		],
	},
];

export async function executeSource(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		// Body is sent top-level (no wrapper). The RD Station CRM deal sources docs list
		// `name`/`description` as top-level body params (mirrors the confirmed campaigns shape).
		const body: IDataObject = { name, ...additionalFields };
		return rdCrmApiRequest.call(this, 'POST', '/deal_sources', body);
	}

	if (operation === 'get') {
		const sourceId = this.getNodeParameter('sourceId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/deal_sources/${sourceId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = { ...filters };

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'deal_sources', 'GET', '/deal_sources', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/deal_sources', {}, qs);
		return response.deal_sources ?? response;
	}

	if (operation === 'update') {
		const sourceId = this.getNodeParameter('sourceId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		// Body is sent top-level (no wrapper), matching the create request shape.
		return rdCrmApiRequest.call(this, 'PUT', `/deal_sources/${sourceId}`, updateFields);
	}

	return {};
}
