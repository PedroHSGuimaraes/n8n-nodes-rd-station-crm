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
				description: 'Register a new webhook subscription in RD Station CRM that posts to your URL when the chosen event fires',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a webhook',
				description: 'Delete a webhook subscription from RD Station CRM by its ID',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a webhook',
				description: 'Retrieve a single webhook subscription by its ID from RD Station CRM',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many webhooks',
				description: 'Retrieve a paginated list of webhook subscriptions from RD Station CRM',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a webhook',
				description: 'Update the event or target URL of an existing webhook subscription in RD Station CRM',
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
		description: 'UUID of the webhook subscription to operate on, obtained from a create or get many webhook operation',
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
		description: 'RD Station CRM event that triggers this webhook, only one event is allowed per subscription, for example crm_deal_created or crm_contact_updated',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/webhook',
		displayOptions: { show: { ...showOnlyForWebhooks, operation: ['create'] } },
		description: 'HTTPS endpoint that receives the event payload by POST, must have a valid TLS certificate',
	},

	// ----- Update fields -----
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...showOnlyForWebhooks, operation: ['update'] } },
		description: 'Fields of the webhook subscription to change, only included fields are updated',
		options: [
			{
				displayName: 'Event',
				name: 'eventType',
				type: 'options',
				options: RD_CRM_WEBHOOK_EVENTS,
				default: 'crm_deal_created',
				description: 'Event that replaces the current trigger for the webhook, for example crm_deal_created or crm_contact_updated',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/webhook',
				description: 'HTTPS URL that RD Station CRM will POST events to, e.g. https://example.com/webhook',
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
