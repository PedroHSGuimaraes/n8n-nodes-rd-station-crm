import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForTeams = {
	resource: ['team'],
};

export const teamDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForTeams },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a team',
				description: 'Retrieve a single team by its ID from RD Station CRM',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many teams',
				description: 'Retrieve a paginated list of teams (groups of users) from RD Station CRM',
			},
		],
		default: 'get',
	},

	// ----- ID field (get) -----
	{
		displayName: 'Team ID',
		name: 'teamId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForTeams, operation: ['get'] } },
		description: 'ID of the team to retrieve, obtained from a get many teams operation',
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForTeams, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForTeams, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { ...showOnlyForTeams, operation: ['getMany'] } },
		description: 'Additional options for how the teams are returned',
		options: [
			{
				displayName: 'Sort By',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Name', value: 'name' },
				],
				default: 'name',
				description: 'Field to sort the returned teams by. One of: created_at, name',
			},
			{
				displayName: 'Sort Direction',
				name: 'direction',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'asc',
				description: 'Sort order for the returned teams. One of: asc, desc',
			},
		],
	},
];

export async function executeTeam(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'get') {
		const teamId = this.getNodeParameter('teamId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/teams/${teamId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const options = this.getNodeParameter('options', i, {}) as IDataObject;
		const qs: IDataObject = { ...options };

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'teams', 'GET', '/teams', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/teams', {}, qs);
		return response.teams ?? response;
	}

	return {};
}
