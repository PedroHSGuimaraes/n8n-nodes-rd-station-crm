import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

// ---------------------------------------------------------------------------
// v2 (OAuth2) Task resource — mirrors the ContactV2 template:
//   - resource value ends in "V2" (taskV2) so it never collides with v1
//   - fields gated by displayOptions.show.resource = ['taskV2']
//   - execute uses the v2 transport (Bearer, { data } envelope, links.next paging)
// ---------------------------------------------------------------------------

const showOnly = { resource: ['taskV2'] };

const taskTypeOptions = [
	{ name: 'Call', value: 'call' },
	{ name: 'Email', value: 'email' },
	{ name: 'Lunch', value: 'lunch' },
	{ name: 'Meeting', value: 'meeting' },
	{ name: 'Task', value: 'task' },
	{ name: 'Visit', value: 'visit' },
	{ name: 'WhatsApp', value: 'whatsapp' },
];

export const taskV2Description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnly },
		options: [
			{ name: 'Create', value: 'create', action: 'Create a task', description: 'Create a new task' },
			{ name: 'Get', value: 'get', action: 'Get a task', description: 'Get a single task by ID' },
			{ name: 'Get Many', value: 'getMany', action: 'Get many tasks', description: 'Get many tasks' },
			{ name: 'Update', value: 'update', action: 'Update a task', description: 'Update an existing task' },
		],
		default: 'create',
	},

	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['get', 'update'] } },
		description: 'The ID of the task',
	},

	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Name of the task',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: 'task',
		options: taskTypeOptions,
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		description: 'Type of the task',
	},

	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['create'] } },
		options: [
			{ displayName: 'Deal ID', name: 'deal_id', type: 'string', default: '' },
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'Due Date', name: 'due_date', type: 'dateTime', default: '' },
			{
				displayName: 'Owner IDs',
				name: 'owner_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of owner (user) IDs',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['update'] } },
		options: [
			{ displayName: 'Deal ID', name: 'deal_id', type: 'string', default: '' },
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'Due Date', name: 'due_date', type: 'dateTime', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Owner IDs',
				name: 'owner_ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of owner (user) IDs',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'open',
				options: [
					{ name: 'Canceled', value: 'canceled' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Open', value: 'open' },
				],
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 'task',
				options: taskTypeOptions,
			},
		],
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
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnly, operation: ['getMany'] } },
		options: [
			{
				displayName: 'RDQL Filter',
				name: 'filter',
				type: 'string',
				default: '',
				placeholder: 'e.g. name:~Follow up',
				description:
					'RDQL filter expression, e.g. <code>name:~Follow up</code>. See the RD Station CRM v2 docs.',
			},
		],
	},
];

function buildTaskV2Body(fields: IDataObject): IDataObject {
	const task: IDataObject = {};

	for (const key of ['name', 'description', 'type', 'deal_id', 'status']) {
		if (fields[key]) task[key] = fields[key];
	}
	if (fields.due_date) {
		task.due_date = new Date(fields.due_date as string).toISOString();
	}
	if (fields.owner_ids) {
		task.owner_ids = (fields.owner_ids as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	return task;
}

export async function executeTaskV2(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const name = this.getNodeParameter('name', i) as string;
		const type = this.getNodeParameter('type', i) as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const body = buildTaskV2Body({ name, type, ...additionalFields });
		const response = await rdCrmV2Request.call(this, 'POST', '/tasks', body);
		return response.data ?? response;
	}

	if (operation === 'get') {
		const taskId = this.getNodeParameter('taskId', i) as string;
		const response = await rdCrmV2Request.call(this, 'GET', `/tasks/${taskId}`);
		return response.data ?? response;
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = {};
		if (filters.filter) qs.filter = filters.filter;

		if (returnAll) {
			return rdCrmV2RequestAllItems.call(this, '/tasks', qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', '/tasks', {}, qs);
		return response.data ?? response;
	}

	if (operation === 'update') {
		const taskId = this.getNodeParameter('taskId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body = buildTaskV2Body({ ...updateFields });
		const response = await rdCrmV2Request.call(this, 'PUT', `/tasks/${taskId}`, body);
		return response.data ?? response;
	}

	return {};
}
