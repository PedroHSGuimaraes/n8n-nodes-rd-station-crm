import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// STAGE resource — RD Station "deal stages" (etapas do funil de vendas).
// The stages list endpoint is capped at a limit of 12.
// ---------------------------------------------------------------------------

const showOnlyForStages = {
	resource: ['stage'],
};

export const stageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForStages },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a stage',
				description: 'Create a new deal stage inside a pipeline in RD Station CRM and return the created stage',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a stage',
				description: 'Retrieve a single deal stage by its ID from RD Station CRM',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many stages',
				description: 'Retrieve a paginated list of deal stages from RD Station CRM, optionally filtered by pipeline',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a stage',
				description: 'Update the name, nickname, or order of an existing deal stage in RD Station CRM',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Stage ID',
		name: 'stageId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForStages, operation: ['get', 'update'] } },
		description: 'ID of the deal stage to operate on, obtained from a create or get many stage operation',
	},

	// ----- create fields -----
	{
		displayName: 'Pipeline Name or ID',
		name: 'dealPipelineId',
		type: 'options',
		required: true,
		description:
			'Pipeline (sales funnel) that this deal stage belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getPipelines' },
		default: '',
		displayOptions: { show: { ...showOnlyForStages, operation: ['create'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForStages, operation: ['create'] } },
		description: 'Name of the new deal stage, for example Qualification or Proposal Sent',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForStages, operation: ['create'] } },
		options: [
			{ displayName: 'Nickname', name: 'nickname', type: 'string', default: '', description: 'Short alternative label shown for the deal stage' },
			{ displayName: 'Order', name: 'order', type: 'number', default: 0, description: 'Numeric position of the stage within the pipeline, lower numbers appear first' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForStages, operation: ['update'] } },
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Nickname', name: 'nickname', type: 'string', default: '', description: 'Short alternative label shown for the deal stage' },
			{ displayName: 'Order', name: 'order', type: 'number', default: 0, description: 'Numeric position of the stage within the pipeline, lower numbers appear first' },
		],
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForStages, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 12,
		typeOptions: { minValue: 1, maxValue: 12 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForStages, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForStages, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Pipeline Name or ID',
				name: 'dealPipelineId',
				type: 'options',
				description:
					'Only return deal stages that belong to this pipeline. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
			},
		],
	},
];

export async function executeStage(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const dealPipelineId = this.getNodeParameter('dealPipelineId', i) as string;
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		// Top-level body per docs (no `deal_stage` wrapper).
		const body: IDataObject = { deal_pipeline_id: dealPipelineId, name };
		if (additionalFields.order !== undefined && additionalFields.order !== '') {
			body.order = additionalFields.order;
		}
		if (additionalFields.nickname) body.nickname = additionalFields.nickname;
		return rdCrmApiRequest.call(this, 'POST', '/deal_stages', body);
	}

	if (operation === 'get') {
		const stageId = this.getNodeParameter('stageId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/deal_stages/${stageId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

		const qs: IDataObject = {};
		if (filters.dealPipelineId) qs.deal_pipeline_id = filters.dealPipelineId;

		if (returnAll) {
			// The stages list is capped at 12 per page.
			qs.limit = 12;
			return rdCrmApiRequestAllItems.call(this, 'deal_stages', 'GET', '/deal_stages', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/deal_stages', {}, qs);
		return response.deal_stages ?? response;
	}

	if (operation === 'update') {
		const stageId = this.getNodeParameter('stageId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

		// Top-level body per docs (no `deal_stage` wrapper).
		const body: IDataObject = {};
		if (updateFields.name !== undefined) body.name = updateFields.name;
		if (updateFields.order !== undefined) body.order = updateFields.order;
		if (updateFields.nickname !== undefined) body.nickname = updateFields.nickname;
		return rdCrmApiRequest.call(this, 'PUT', `/deal_stages/${stageId}`, body);
	}

	return {};
}
