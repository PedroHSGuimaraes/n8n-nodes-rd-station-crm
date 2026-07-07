import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// DEAL RESOURCE — mirrors the structure of the Contact template:
//   1. `dealDescription` = operations dropdown + fields (INodeProperties[])
//   2. `executeDeal(operation, i)` = programmatic dispatch using the transport helpers
// Keep displayNames Title Case, descriptions/actions Sentence case,
// options alphabetically sorted, loadOptions fields suffixed "Name or ID".
//
// Body-shape note (verified against developers.rdstation.com):
//   CREATE POST /deals  -> deal_stage_id goes INSIDE `deal`; deal_source/campaign/
//                          organization are TOP-LEVEL siblings ({ _id }).
//   UPDATE PUT /deals/id -> deal_stage_id goes as a TOP-LEVEL sibling (NOT inside deal).
// ---------------------------------------------------------------------------

const showOnlyForDeals = {
	resource: ['deal'],
};

const loadOptionsDescription =
	'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>';

export const dealDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForDeals },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a deal',
				description: 'Create a new deal',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a deal',
				description: 'Get a single deal by ID',
			},
			{
				name: 'Get Contacts',
				value: 'getContacts',
				action: 'Get contacts of a deal',
				description: 'Get the contacts associated with a deal',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many deals',
				description: 'Get many deals',
			},
			{
				name: 'Mark as Lost',
				value: 'markAsLost',
				action: 'Mark a deal as lost',
				description: 'Mark a deal as lost',
			},
			{
				name: 'Mark as Won',
				value: 'markAsWon',
				action: 'Mark a deal as won',
				description: 'Mark a deal as won',
			},
			{
				name: 'Move to Stage',
				value: 'moveToStage',
				action: 'Move a deal to a stage',
				description: 'Move a deal to a different stage',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a deal',
				description: 'Update an existing deal',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / getContacts / markAsLost / markAsWon / moveToStage / update) -----
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForDeals,
				operation: ['get', 'getContacts', 'markAsLost', 'markAsWon', 'moveToStage', 'update'],
			},
		},
		description: 'The ID of the deal',
	},

	// ----- name (create) -----
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForDeals, operation: ['create'] } },
		description: 'Name of the deal',
	},

	// ----- Deal Stage (moveToStage, required) -----
	{
		displayName: 'Deal Stage Name or ID',
		name: 'dealStageId',
		type: 'options',
		required: true,
		default: '',
		description: loadOptionsDescription,
		typeOptions: { loadOptionsMethod: 'getStages' },
		displayOptions: { show: { ...showOnlyForDeals, operation: ['moveToStage'] } },
	},

	// ----- Loss reason / note (markAsLost) -----
	{
		displayName: 'Deal Lost Reason Name or ID',
		name: 'dealLostReasonId',
		type: 'options',
		required: true,
		default: '',
		description: loadOptionsDescription,
		typeOptions: { loadOptionsMethod: 'getLossReasons' },
		displayOptions: { show: { ...showOnlyForDeals, operation: ['markAsLost'] } },
	},
	{
		displayName: 'Deal Lost Note',
		name: 'dealLostNote',
		type: 'string',
		default: '',
		description: 'Optional note describing why the deal was lost',
		displayOptions: { show: { ...showOnlyForDeals, operation: ['markAsLost'] } },
	},

	// ----- Custom Fields (create + update) -----
	{
		displayName: 'Custom Fields',
		name: 'customFieldsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Custom Field',
		default: {},
		displayOptions: { show: { ...showOnlyForDeals, operation: ['create', 'update'] } },
		options: [
			{
				name: 'field',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						description: loadOptionsDescription,
						typeOptions: { loadOptionsMethod: 'getDealCustomFields' },
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

	// ----- Products (create, optional) -----
	{
		displayName: 'Products',
		name: 'dealProductsUi',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Product',
		default: {},
		displayOptions: { show: { ...showOnlyForDeals, operation: ['create'] } },
		options: [
			{
				name: 'product',
				displayName: 'Product',
				values: [
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 1,
						description: 'Quantity of the product',
					},
					{
						displayName: 'Discount',
						name: 'discount',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Discount Type',
						name: 'discount_type',
						type: 'options',
						options: [
							{ name: 'Amount', value: 'amount' },
							{ name: 'Percentage', value: 'percent' },
						],
						default: 'percent',
					},
					{
						displayName: 'Price',
						name: 'price',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Product Name or ID',
						name: 'product_id',
						type: 'options',
						description: loadOptionsDescription,
						typeOptions: { loadOptionsMethod: 'getProducts' },
						default: '',
					},
					{
						displayName: 'Recurrence',
						name: 'recurrence',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Total',
						name: 'total',
						type: 'number',
						default: 0,
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
		displayOptions: { show: { ...showOnlyForDeals, operation: ['create'] } },
		options: [
			{
				displayName: 'Campaign Name or ID',
				name: 'campaignId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getCampaigns' },
				default: '',
			},
			{
				displayName: 'Deal Source Name or ID',
				name: 'dealSourceId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getSources' },
				default: '',
			},
			{
				displayName: 'Deal Stage Name or ID',
				name: 'dealStageId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getStages' },
				default: '',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organizationId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getOrganizations' },
				default: '',
			},
			{
				displayName: 'Prediction Date',
				name: 'predictionDate',
				type: 'dateTime',
				default: '',
				description: 'Estimated date the deal is expected to close',
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getUsers' },
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
		displayOptions: { show: { ...showOnlyForDeals, operation: ['update'] } },
		options: [
			{
				displayName: 'Deal Stage Name or ID',
				name: 'dealStageId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getStages' },
				default: '',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Organization Name or ID',
				name: 'organizationId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getOrganizations' },
				default: '',
			},
			{
				displayName: 'Prediction Date',
				name: 'predictionDate',
				type: 'dateTime',
				default: '',
				description: 'Estimated date the deal is expected to close',
			},
			{
				displayName: 'Rating',
				name: 'rating',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
		],
	},

	// ----- Get Many / Get Contacts controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForDeals, operation: ['getMany', 'getContacts'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForDeals, operation: ['getMany', 'getContacts'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForDeals, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Campaign Name or ID',
				name: 'campaign_id',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getCampaigns' },
				default: '',
			},
			{
				displayName: 'Closed At',
				name: 'closed_at',
				type: 'boolean',
				default: false,
				description: 'Whether to return only closed deals',
			},
			{
				displayName: 'Deal Lost Reason Name or ID',
				name: 'deal_lost_reason_id',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getLossReasons' },
				default: '',
			},
			{
				displayName: 'Deal Pipeline Name or ID',
				name: 'deal_pipeline_id',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getPipelines' },
				default: '',
			},
			{
				displayName: 'Deal Stage Name or ID',
				name: 'deal_stage_id',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getStages' },
				default: '',
			},
			{
				displayName: 'Exact Name',
				name: 'exact_name',
				type: 'boolean',
				default: false,
				description: 'Whether to match the name exactly instead of partially',
			},
			{
				displayName: 'Hold',
				name: 'hold',
				type: 'boolean',
				default: false,
				description: 'Whether to return only paused (on hold) deals',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Filter deals by name',
			},
			{
				displayName: 'Organization ID',
				name: 'organization',
				type: 'string',
				default: '',
				description: 'Filter deals by organization ID',
			},
			{
				displayName: 'Product Presence',
				name: 'product_presence',
				type: 'string',
				default: '',
				description:
					'Filter by product presence: "true" (any), "false" (none) or a comma-separated list of product IDs',
			},
			{
				displayName: 'User Name or ID',
				name: 'user_id',
				type: 'options',
				description: loadOptionsDescription,
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
			{
				displayName: 'Win',
				name: 'win',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Lost', value: 'false' },
					{ name: 'Open', value: 'null' },
					{ name: 'Won', value: 'true' },
				],
				default: 'all',
				description: 'Filter by deal status',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnlyForDeals, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Sort By',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Name', value: 'name' },
					{ name: 'Prediction Date', value: 'prediction_date' },
					{ name: 'Rating', value: 'rating' },
					{ name: 'Updated At', value: 'updated_at' },
				],
				default: 'created_at',
			},
			{
				displayName: 'Sort Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
			},
		],
	},
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readDealCustomFields(this: IExecuteFunctions, i: number): IDataObject[] | undefined {
	const customFieldsUi = this.getNodeParameter('customFieldsUi', i, {}) as IDataObject;
	if (Array.isArray(customFieldsUi.field)) {
		return (customFieldsUi.field as IDataObject[]).map((f) => ({
			custom_field_id: f.fieldId,
			value: f.value,
		}));
	}
	return undefined;
}

export async function executeDeal(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const deal: IDataObject = { name };
		if (additionalFields.dealStageId) deal.deal_stage_id = additionalFields.dealStageId;
		if (additionalFields.userId) deal.user_id = additionalFields.userId;
		if (additionalFields.rating !== undefined && additionalFields.rating !== '') {
			deal.rating = additionalFields.rating;
		}
		if (additionalFields.predictionDate) deal.prediction_date = additionalFields.predictionDate;

		const dealCustomFields = readDealCustomFields.call(this, i);
		if (dealCustomFields) deal.deal_custom_fields = dealCustomFields;

		const body: IDataObject = { deal };
		if (additionalFields.dealSourceId) body.deal_source = { _id: additionalFields.dealSourceId };
		if (additionalFields.campaignId) body.campaign = { _id: additionalFields.campaignId };
		if (additionalFields.organizationId) body.organization = { _id: additionalFields.organizationId };

		const dealProductsUi = this.getNodeParameter('dealProductsUi', i, {}) as IDataObject;
		if (Array.isArray(dealProductsUi.product)) {
			body.deal_products = (dealProductsUi.product as IDataObject[]).map((p) => ({
				product_id: p.product_id,
				amount: p.amount,
				price: p.price,
				discount: p.discount,
				discount_type: p.discount_type,
				recurrence: p.recurrence,
				total: p.total,
			}));
		}

		return rdCrmApiRequest.call(this, 'POST', '/deals', body);
	}

	if (operation === 'get') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/deals/${dealId}`);
	}

	if (operation === 'getContacts') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(
				this,
				'contacts',
				'GET',
				`/deals/${dealId}/contacts`,
			);
		}
		const limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(
			this,
			'GET',
			`/deals/${dealId}/contacts`,
			{},
			{ limit },
		);
		return response.contacts ?? response;
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		const qs: IDataObject = { ...filters, ...options };

		// win: 'all' omits the filter; 'null' sends a real JSON null (open deals),
		// 'true'/'false' send real booleans (won/lost).
		if (qs.win === undefined || qs.win === 'all') {
			delete qs.win;
		} else if (qs.win === 'null') {
			qs.win = null;
		} else {
			qs.win = qs.win === 'true';
		}

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'deals', 'GET', '/deals', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/deals', {}, qs);
		return response.deals ?? response;
	}

	if (operation === 'update') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

		const deal: IDataObject = {};
		if (updateFields.name) deal.name = updateFields.name;
		if (updateFields.userId) deal.user_id = updateFields.userId;
		if (updateFields.rating !== undefined && updateFields.rating !== '') {
			deal.rating = updateFields.rating;
		}
		if (updateFields.predictionDate) deal.prediction_date = updateFields.predictionDate;
		if (updateFields.organizationId) deal.organization_id = updateFields.organizationId;

		const dealCustomFields = readDealCustomFields.call(this, i);
		if (dealCustomFields) deal.deal_custom_fields = dealCustomFields;

		const body: IDataObject = { deal };
		// On UPDATE, deal_stage_id is a TOP-LEVEL sibling (not inside `deal`).
		if (updateFields.dealStageId) body.deal_stage_id = updateFields.dealStageId;

		return rdCrmApiRequest.call(this, 'PUT', `/deals/${dealId}`, body);
	}

	if (operation === 'markAsWon') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		return rdCrmApiRequest.call(this, 'PUT', `/deals/${dealId}`, { deal: { win: true } });
	}

	if (operation === 'markAsLost') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const dealLostReasonId = this.getNodeParameter('dealLostReasonId', i) as string;
		const dealLostNote = this.getNodeParameter('dealLostNote', i, '') as string;

		const deal: IDataObject = { win: false, deal_lost_reason_id: dealLostReasonId };
		if (dealLostNote) deal.deal_lost_note = dealLostNote;

		return rdCrmApiRequest.call(this, 'PUT', `/deals/${dealId}`, { deal });
	}

	if (operation === 'moveToStage') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const dealStageId = this.getNodeParameter('dealStageId', i) as string;
		// deal_stage_id is a TOP-LEVEL sibling (no `deal` wrapper).
		return rdCrmApiRequest.call(this, 'PUT', `/deals/${dealId}`, { deal_stage_id: dealStageId });
	}

	return {};
}
