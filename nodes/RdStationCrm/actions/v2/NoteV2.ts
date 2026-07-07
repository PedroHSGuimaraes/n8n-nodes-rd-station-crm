import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

// ---------------------------------------------------------------------------
// v2 (OAuth2) resource — mirrors ContactV2 template.
// Notes are deal-scoped: they live under /deals/{dealId}/notes and support
// only create + list in the v2 API.
// ---------------------------------------------------------------------------

const showOnly = { resource: ['noteV2'] };

export const noteV2Description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a note', description: 'Create a new note on a deal' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many notes', description: 'Get many notes from a deal' },
		],
		default: 'create',
	},

	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create', 'getMany'] } },
		description: 'The ID of the deal the note belongs to',
	},

	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		typeOptions: { rows: 4 },
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'The content of the note',
	},
	{
		displayName: 'User Name or ID',
		name: 'user_id',
		type: 'options',
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getUsersV2' },
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
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
];

export async function executeNoteV2(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const description = this.getNodeParameter('description', i) as string;
		const userId = this.getNodeParameter('user_id', i) as string;
		const body: IDataObject = { description, user_id: userId };
		const response = await rdCrmV2Request.call(this, 'POST', `/deals/${dealId}/notes`, body);
		return response.data ?? response;
	}

	if (operation === 'getMany') {
		const dealId = this.getNodeParameter('dealId', i) as string;
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const qs: IDataObject = {};

		if (returnAll) {
			return rdCrmV2RequestAllItems.call(this, `/deals/${dealId}/notes`, qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', `/deals/${dealId}/notes`, {}, qs);
		return response.data ?? response;
	}

	return {};
}
