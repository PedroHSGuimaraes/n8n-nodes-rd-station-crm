import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForUsers = {
	resource: ['user'],
};

export const userDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForUsers },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Retrieve a single CRM user by its ID from RD Station CRM',
			},
			{
				name: 'Get Current',
				value: 'getCurrent',
				action: 'Get the current user',
				description: 'Retrieve the CRM user that owns the API token used for authentication',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many users',
				description: 'Retrieve a paginated list of CRM users, optionally filtered by role, status, or team',
			},
		],
		default: 'get',
	},

	// ----- ID field (get) -----
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForUsers, operation: ['get'] } },
		description: 'ID of the CRM user to retrieve, obtained from a get many users operation',
	},

	// ----- Get Many controls -----
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { ...showOnlyForUsers, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForUsers, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForUsers, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Role',
				name: 'role',
				type: 'options',
				options: [
					{ name: 'Admin', value: 'admin' },
					{ name: 'Manager', value: 'manager' },
					{ name: 'User', value: 'user' },
				],
				default: 'user',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'All', value: 'all' },
					{ name: 'Inactive', value: 'inactive' },
				],
				default: 'active',
			},
			{
				displayName: 'Team Name or ID',
				name: 'teamId',
				type: 'options',
				description:
					'Only return users belonging to this team. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getTeams' },
				default: '',
			},
		],
	},
];

export async function executeUser(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'get') {
		const userId = this.getNodeParameter('userId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/users/${userId}`);
	}

	if (operation === 'getCurrent') {
		return rdCrmApiRequest.call(this, 'GET', '/users/me');
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = {};

		if (filters.role) qs.role = filters.role;
		if (filters.teamId) qs.team_id = filters.teamId;
		if (filters.status && filters.status !== 'all') qs.status = filters.status;

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'users', 'GET', '/users', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/users', {}, qs);
		return response.users ?? response;
	}

	return {};
}
