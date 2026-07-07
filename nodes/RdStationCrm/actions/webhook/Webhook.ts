import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../../transport';
import { RD_CRM_WEBHOOK_EVENTS } from '../../helpers/constants';

const showOnlyForWebhooks = {
	resource: ['webhook'],
};

export const webhookDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForWebhooks },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a webhook',
				description: 'Register a new webhook subscription',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a webhook',
				description: 'Delete a webhook subscription',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a webhook',
				description: 'Get a single webhook by ID',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many webhooks',
				description: 'Get many webhooks',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a webhook',
				description: 'Update an existing webhook',
			},
		],
		default: 'create',
	},

	// ----- ID field (get / update / delete) -----
	{
		displayName: 'Webhook ID',
		name: 'webhookId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { ...showOnlyForWebhooks, operation: ['get', 'update', 'delete'] },
		},
		description: 'The UUID of the webhook',
	},

	// ----- Create fields -----
	{
		displayName: 'Event',
		name: 'eventType',
		type: 'options',
		required: true,
		default: 'crm_deal_created',
		displayOptions: { show: { ...showOnlyForWebhooks, operation: ['create'] } },
		options: RD_CRM_WEBHOOK_EVENTS,
		description: 'The event that triggers the webhook (one event per webhook)',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/webhook',
		displayOptions: { show: { ...showOnlyForWebhooks, operation: ['create'] } },
		description: 'The HTTPS URL that will receive the event (must have a valid certificate)',
	},

	// ----- Update fields -----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForWebhooks, operation: ['update'] } },
		options: [
			{
				displayName: 'Event',
				name: 'eventType',
				type: 'options',
				options: RD_CRM_WEBHOOK_EVENTS,
				default: 'crm_deal_created',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/webhook',
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
		displayOptions: { show: { ...showOnlyForWebhooks, operation: ['getMany'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		displayOptions: {
			show: { ...showOnlyForWebhooks, operation: ['getMany'], returnAll: [false] },
		},
	},
];

export async function executeWebhook(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<any> {
	if (operation === 'create') {
		const eventType = this.getNodeParameter('eventType', i) as string;
		const url = this.getNodeParameter('url', i) as string;
		const body: IDataObject = {
			event_type: eventType,
			http_method: 'POST',
			url,
		};
		return rdCrmApiRequest.call(this, 'POST', '/webhooks', body);
	}

	if (operation === 'get') {
		const webhookId = this.getNodeParameter('webhookId', i) as string;
		return rdCrmApiRequest.call(this, 'GET', `/webhooks/${webhookId}`);
	}

	if (operation === 'getMany') {
		const returnAll = this.getNodeParameter('returnAll', i) as boolean;
		if (returnAll) {
			return rdCrmApiRequestAllItems.call(this, 'webhooks', 'GET', '/webhooks');
		}
		const qs: IDataObject = { limit: this.getNodeParameter('limit', i) as number };
		const response = await rdCrmApiRequest.call(this, 'GET', '/webhooks', {}, qs);
		return response.webhooks ?? response;
	}

	if (operation === 'update') {
		const webhookId = this.getNodeParameter('webhookId', i) as string;
		const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
		const body: IDataObject = {};
		if (updateFields.eventType) body.event_type = updateFields.eventType;
		if (updateFields.url) body.url = updateFields.url;
		return rdCrmApiRequest.call(this, 'PUT', `/webhooks/${webhookId}`, body);
	}

	if (operation === 'delete') {
		const webhookId = this.getNodeParameter('webhookId', i) as string;
		await rdCrmApiRequest.call(this, 'DELETE', `/webhooks/${webhookId}`);
		return { deleted: true };
	}

	return {};
}
