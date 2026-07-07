import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// PIPELINE resource — RD Station "deal pipelines" (funis de vendas).
// ---------------------------------------------------------------------------

const showOnlyForPipelines = {
	resource: ['pipeline'],
};

export const pipelineDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForPipelines },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a pipeline',
				description: 'Create a new pipeline',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a pipeline',
				description: 'Get a single pipeline by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many pipelines',
				description: 'Get many pipelines',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a pipeline',
				description: 'Update an existing pipeline',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Pipeline ID',
		name: 'pipelineId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['get', 'update'] } },
		description: 'The ID of the pipeline',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['create'] } },
		description: 'Name of the pipeline',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['create'] } },
		options: [
			{ displayName: 'Order', name: 'order', type: 'number', default: 0, description: 'Position of the pipeline in the list' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['update'] } },
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Order', name: 'order', type: 'number', default: 0, description: 'Position of the pipeline in the list' },
		],
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForPipelines, operation: ['getMany'], returnAll: [false] },
		},
	},
];

export async function executePipeline(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		// Top-level body per docs (no `deal_pipeline` wrapper).
		const body: IDataObject = { name };
		if (additionalFields.order !== undefined && additionalFields.order !== '') {
			body.order = additionalFields.order;
		}
		return rdCrmApiRequest.call(this, 'POST', '/deal_pipelines', body);
	}

	if (operation === 'get') {
		const pipelineId = this.getNodeParameter('pipelineId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/deal_pipelines/${pipelineId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'deal_pipelines', 'GET', '/deal_pipelines');
		}
		const qs: IDataObject = { limit: this.getNodeParameter('limit', i) as number };
		const response = await rdCrmApiRequest.call(this, 'GET', '/deal_pipelines', {}, qs);
		return response.deal_pipelines ?? response;
	}

	if (operation === 'update') {
		const pipelineId = this.getNodeParameter('pipelineId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

		// Top-level body per docs (no `deal_pipeline` wrapper).
		const body: IDataObject = {};
		if (updateFields.name !== undefined) body.name = updateFields.name;
		if (updateFields.order !== undefined) body.order = updateFields.order;
		return rdCrmApiRequest.call(this, 'PUT', `/deal_pipelines/${pipelineId}`, body);
	}

	return {};
}
