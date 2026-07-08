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
				description: 'Create a new deal pipeline (sales funnel) in RD Station CRM and return the created pipeline',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a pipeline',
				description: 'Retrieve a single deal pipeline by its ID from RD Station CRM',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many pipelines',
				description: 'Retrieve a paginated list of deal pipelines (sales funnels) from RD Station CRM',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a pipeline',
				description: 'Update the name or order of an existing deal pipeline in RD Station CRM',
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
		description: 'ID of the deal pipeline to operate on, obtained from a create or get many pipeline operation',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['create'] } },
		description: 'Name of the new deal pipeline, for example Inbound Sales',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['create'] } },
		description: 'Optional extra fields to set on the new deal pipeline',
		options: [
			{ displayName: 'Order', name: 'order', type: 'number', default: 0, description: 'Numeric position of the pipeline in the list, lower numbers appear first' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForPipelines, operation: ['update'] } },
		description: 'Fields of the deal pipeline to change, only included fields are updated',
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'New name for the deal pipeline' },
			{ displayName: 'Order', name: 'order', type: 'number', default: 0, description: 'Numeric position of the pipeline in the list, lower numbers appear first' },
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
