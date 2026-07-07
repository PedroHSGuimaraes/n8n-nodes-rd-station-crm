import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';

const showOnlyForTasks = {
	resource: ['task'],
};

// Task type values accepted by the API (call, email, meeting, task, lunch, visit, whatsapp).
const taskTypeOptions = [
	{ name: 'Call', value: 'call' },
	{ name: 'Email', value: 'email' },
	{ name: 'Lunch', value: 'lunch' },
	{ name: 'Meeting', value: 'meeting' },
	{ name: 'Task', value: 'task' },
	{ name: 'Visit', value: 'visit' },
	{ name: 'WhatsApp', value: 'whatsapp' },
];

export const taskDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForTasks },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a task',
				description: 'Create a new task',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a task',
				description: 'Get a single task by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many tasks',
				description: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a task',
				description: 'Update an existing task',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update) -----
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForTasks, operation: ['get', 'update'] } },
		description: 'The ID of the task',
	},

	// ----- Create fields -----
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForTasks, operation: ['create'] } },
		description: 'Subject of the task',
	},
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...showOnlyForTasks, operation: ['create'] } },
		description: 'The ID of the deal the task belongs to',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: taskTypeOptions,
		default: 'task',
		displayOptions: { show: { ...showOnlyForTasks, operation: ['create'] } },
		description: 'Type of the task',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { ...showOnlyForTasks, operation: ['create'] } },
		description: 'Date the task is scheduled for (only the date part is sent)',
	},
	{
		displayName: 'Hour',
		name: 'hour',
		type: 'string',
		default: '',
		placeholder: 'e.g. 14:30',
		displayOptions: { show: { ...showOnlyForTasks, operation: ['create'] } },
		description: 'Time the task is scheduled for, in HH:MM format',
	},

	// ----- Additional / Update fields -----
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForTasks, operation: ['create'] } },
		options: [
			{
				displayName: 'Done',
				name: 'done',
				type: 'boolean',
				default: false,
				description: 'Whether the task has been completed',
			},
			{ displayName: 'Notes', name: 'notes', type: 'string', default: '' },
			{
				displayName: 'User Names or IDs',
				name: 'userIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: [],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForTasks, operation: ['update'] } },
		options: [
			{
				displayName: 'Date',
				name: 'date',
				type: 'dateTime',
				default: '',
				description: 'Date the task is scheduled for (only the date part is sent)',
			},
			{ displayName: 'Deal ID', name: 'dealId', type: 'string', default: '', description: 'The ID of the deal the task belongs to' },
			{
				displayName: 'Done',
				name: 'done',
				type: 'boolean',
				default: false,
				description: 'Whether the task has been completed',
			},
			{ displayName: 'Hour', name: 'hour', type: 'string', default: '', placeholder: 'e.g. 14:30', description: 'Time the task is scheduled for, in HH:MM format' },
			{ displayName: 'Notes', name: 'notes', type: 'string', default: '' },
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '', description: 'Subject of the task' },
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: taskTypeOptions,
				default: 'task',
				description: 'Type of the task',
			},
			{
				displayName: 'User Names or IDs',
				name: 'userIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: [],
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
		displayOptions: { show: { ...showOnlyForTasks, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForTasks, operation: ['getMany'], returnAll: [false] },
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...showOnlyForTasks, operation: ['getMany'] } },
		options: [
			{
				displayName: 'Date End',
				name: 'dateEnd',
				type: 'dateTime',
				default: '',
				description: 'Filter tasks up to this date (only the date part is sent)',
			},
			{
				displayName: 'Date Start',
				name: 'dateStart',
				type: 'dateTime',
				default: '',
				description: 'Filter tasks from this date (only the date part is sent)',
			},
			{ displayName: 'Deal ID', name: 'dealId', type: 'string', default: '' },
			{
				displayName: 'Done',
				name: 'done',
				type: 'boolean',
				default: false,
				description: 'Whether to return only completed tasks',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: taskTypeOptions,
				default: 'task',
			},
			{
				displayName: 'User Name or ID',
				name: 'userId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getUsers' },
				default: '',
			},
		],
	},
];

function toDateString(value: string): string {
	return new Date(value).toISOString().slice(0, 10);
}

// The API wraps the task payload in a `task` key (matches the "task object" body param in the docs).
function buildTaskBody(fields: IDataObject): IDataObject {
	const task: IDataObject = {};

	if (fields.subject) task.subject = fields.subject;
	if (fields.type) task.type = fields.type;
	if (fields.date) task.date = toDateString(fields.date as string);
	if (fields.hour) task.hour = fields.hour;
	if (fields.dealId) task.deal_id = fields.dealId;
	if (fields.notes) task.notes = fields.notes;
	if (fields.done !== undefined) task.done = fields.done;
	if (fields.userIds) {
		const raw = fields.userIds;
		const userIds = Array.isArray(raw)
			? raw
			: (raw as string).split(',').map((s) => s.trim()).filter(Boolean);
		if (userIds.length) task.user_ids = userIds;
	}

	return task;
}

export async function executeTask(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	if (operation === 'create') {
		const subject = this.getNodeParameter('subject', i) as string;
		const dealId = this.getNodeParameter('dealId', i) as string;
		const type = this.getNodeParameter('type', i) as string;
		const date = this.getNodeParameter('date', i, '') as string;
		const hour = this.getNodeParameter('hour', i, '') as string;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		const task = buildTaskBody({ subject, dealId, type, date, hour, ...additionalFields });
		return rdCrmApiRequest.call(this, 'POST', '/tasks', { task });
	}

	if (operation === 'get') {
		const taskId = this.getNodeParameter('taskId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/tasks/${taskId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
		const qs: IDataObject = {};
		if (filters.dealId) qs.deal_id = filters.dealId;
		if (filters.userId) qs.user_id = filters.userId;
		if (filters.type) qs.type = filters.type;
		if (filters.done !== undefined) qs.done = filters.done;
		if (filters.dateStart) qs.date_start = toDateString(filters.dateStart as string);
		if (filters.dateEnd) qs.date_end = toDateString(filters.dateEnd as string);

		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'tasks', 'GET', '/tasks', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmApiRequest.call(this, 'GET', '/tasks', {}, qs);
		return response.tasks ?? response;
	}

	if (operation === 'update') {
		const taskId = this.getNodeParameter('taskId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const task = buildTaskBody(updateFields);
		return rdCrmApiRequest.call(this, 'PUT', `/tasks/${taskId}`, { task });
	}

	return {};
}
