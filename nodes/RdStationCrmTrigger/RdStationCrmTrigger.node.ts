import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { RD_CRM_WEBHOOK_EVENTS } from '../RdStationCrm/helpers/constants';
import { rdCrmApiRequest } from '../RdStationCrm/transport';

interface IRegisteredWebhook {
	id: string;
	event: string;
}

export class RdStationCrmTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RD Station CRM Trigger',
		name: 'rdStationCrmTrigger',
		icon: { light: 'file:rdStationCrm.svg', dark: 'file:rdStationCrm.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when RD Station CRM events happen',
		defaults: {
			name: 'RD Station CRM Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'rdStationCrmApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The RD Station CRM events to subscribe to (one webhook is registered per event)',
				options: RD_CRM_WEBHOOK_EVENTS,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const staticData = this.getWorkflowStaticData('node');

				const response = await rdCrmApiRequest.call(this, 'GET', '/webhooks');
				const existing = (response?.webhooks ?? response ?? []) as IDataObject[];

				const registered: IRegisteredWebhook[] = [];
				for (const event of events) {
					const match = existing.find(
						(w) => w.url === webhookUrl && w.event_type === event,
					);
					if (!match) {
						return false;
					}
					registered.push({ id: match.uuid as string, event });
				}

				staticData.webhooks = registered;
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const staticData = this.getWorkflowStaticData('node');

				// Re-read existing webhooks so we don't create duplicates.
				const response = await rdCrmApiRequest.call(this, 'GET', '/webhooks');
				const existing = (response?.webhooks ?? response ?? []) as IDataObject[];

				const registered: IRegisteredWebhook[] = [];
				for (const event of events) {
					const match = existing.find(
						(w) => w.url === webhookUrl && w.event_type === event,
					);
					if (match) {
						registered.push({ id: match.uuid as string, event });
						continue;
					}
					const created = await rdCrmApiRequest.call(this, 'POST', '/webhooks', {
						event_type: event,
						url: webhookUrl,
						http_method: 'POST',
					});
					if (created?.uuid === undefined) {
						return false;
					}
					registered.push({ id: created.uuid as string, event });
				}

				staticData.webhooks = registered;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const registered = (staticData.webhooks as IRegisteredWebhook[]) ?? [];

				for (const webhook of registered) {
					try {
						await rdCrmApiRequest.call(this, 'DELETE', `/webhooks/${webhook.id}`);
					} catch {
						// The webhook may already be gone; keep removing the rest.
					}
				}

				delete staticData.webhooks;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData as IDataObject)],
		};
	}
}
