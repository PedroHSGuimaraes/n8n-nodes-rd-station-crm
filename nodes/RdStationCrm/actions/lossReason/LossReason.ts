import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForLossReasons = {
	resource: ['lossReason'],
};

export const lossReasonDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForLossReasons },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a loss reason',
				description: 'Create a new deal loss reason',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a loss reason',
				description: 'Get a single deal loss reason by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many loss reasons',
				description: 'Get many deal loss reasons',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a loss reason',
				description: 'Update an existing deal loss reason',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Loss Reason ID',
		name: 'lossReasonId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForLossReasons, operation: ['get', 'update'] } },
		description: 'The ID of the deal loss reason',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForLossReasons, operation: ['create'] } },
		description: 'Name of the deal loss reason (2 to 40 characters)',
	},

	// ----- Update fields -----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForLossReasons, operation: ['update'] } },
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the deal loss reason (2 to 40 characters)',
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
		displayOptions: { show: { ...showOnlyForLossReasons, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForLossReasons, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForLossReasons, operation: ['getMany'] } },
		options: [
			{ displayName: 'Search', name: 'q', type: 'string', default: '', description: 'Search by deal loss reason name' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnlyForLossReasons, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Sort By',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Name', value: 'name' },
				],
				default: 'name',
			},
		],
	},
];

export async function executeLossReason(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		// Body is sent top-level (no wrapper). The deal lost reasons docs list `name`
		// (2-40 chars) as the only top-level body param (mirrors the campaigns shape).
		const body: IDataObject = { name };
		return rdCrmApiRequest.call(this, 'POST', '/deal_lost_reasons', body);
	}

	if (operation === 'get') {
		const lossReasonId = this.getNodeParameter('lossReasonId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/deal_lost_reasons/${lossReasonId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const qs: IDataObject = { ...filters, ...options };

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(
				this,
				'deal_lost_reasons',
				'GET',
				'/deal_lost_reasons',
				{},
				qs,
			);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/deal_lost_reasons', {}, qs);
		return response.deal_lost_reasons ?? response;
	}

	if (operation === 'update') {
		const lossReasonId = this.getNodeParameter('lossReasonId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		// Body is sent top-level (no wrapper), matching the create request shape.
		return rdCrmApiRequest.call(this, 'PUT', `/deal_lost_reasons/${lossReasonId}`, updateFields);
	}

	return {};
}
