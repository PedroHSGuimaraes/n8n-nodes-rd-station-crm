import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

// ---------------------------------------------------------------------------
// NOTE resource — notes are RD Station "activities" of type "note".
// Only Create and Get Many are supported: the RD Station CRM v1 API does not
// allow editing or deleting notes.
// ---------------------------------------------------------------------------

const showOnlyForNotes = {
	resource: ['note'],
};

export const noteDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForNotes },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a note',
				description: 'Create a text note attached to a deal in RD Station CRM and return the created note',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many notes',
				description: 'Retrieve a paginated list of notes from RD Station CRM, optionally filtered by deal, user, or date range',
			},
		],
		default: 'create',
	},

	// ----- Create fields -----
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForNotes, operation: ['create'] } },
		description: 'ID of the deal that this note will be attached to, obtained from a deal create or get operation',
	},
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		required: true,
		description:
			'CRM user recorded as the author of the note. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getUsers' },
		default: '',
		displayOptions: { show: { ...showOnlyForNotes, operation: ['create'] } },
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 4 },
		displayOptions: { show: { ...showOnlyForNotes, operation: ['create'] } },
		description: 'Text content of the note to record on the deal',
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForNotes, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForNotes, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForNotes, operation: ['getMany'] } },
		description: 'Optional filters to narrow the returned notes',
		options: [
			{ displayName: 'Deal ID', name: 'dealId', type: 'string', default: '', description: 'Only return notes attached to this deal ID' },
			{ displayName: 'End Date', name: 'endDate', type: 'dateTime', default: '', description: 'Only return notes created on or before this date and time, in ISO 8601 format, e.g. 2026-07-08T14:30:00Z' },
			{ displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '', description: 'Only return notes created on or after this date and time, in ISO 8601 format, e.g. 2026-07-08T14:30:00Z' },
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description:
					'Only return notes authored by this CRM user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnlyForNotes, operation: ['getMany'] } },
		description: 'Additional options for how the notes are returned',
		options: [
			{
				displayName: 'Sort Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
				description: 'Sort order for the returned notes by creation date. One of: asc, desc',
			},
		],
	},
];

export async function executeNote(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const userId = this.getNodeParameter('userId', i) as string;
		const text = this.getNodeParameter('text', i) as string;

		// Notes are activities of type "note"; the docs wrap the payload in an
		// `activity` object: { activity: { deal_id, user_id, text, type } }.
		const activity: IDataObject = {
			deal_id: dealId,
			user_id: userId,
			text,
			type: 'note',
		};
		return rdCrmApiRequest.call(this, 'POST', '/activities', { activity });
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;

		// Always scope the listing to notes.
		const qs: IDataObject = { type: 'note' };
		if (filters.dealId) qs.deal_id = filters.dealId;
		if (filters.userId) qs.user_id = filters.userId;
		if (filters.startDate) qs.start_date = filters.startDate;
		if (filters.endDate) qs.end_date = filters.endDate;
		if (options.direction) qs.direction = options.direction;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'activities', 'GET', '/activities', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/activities', {}, qs);
		return response.activities ?? response;
	}

	return {};
}
