import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { RD_CRM_WEBHOOK_EVENTS, RD_CRM_WEBHOOK_EVENTS_V2 } from '../RdStationCrm/helpers/constants';
import { rdCrmApiRequest } from '../RdStationCrm/transport';
import { checkExistsV2, createV2, deleteV2 } from './webhooksV2';

// Com OAuth2 o trigger usa a API v2; sem o parâmetro (workflows salvos) vale o token da API v1.
function usesOAuth2(ctx: IHookFunctions): boolean {
	return ctx.getNodeParameter('authentication', 'accessToken') === 'oauth2';
}

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
		subtitle:
			'=Events: {{($parameter["authentication"] === "oauth2" ? $parameter["eventsV2"] : $parameter["events"]).join(", ")}}',
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
				displayOptions: { show: { authentication: ['accessToken'] } },
			},
			{
				name: 'rdStationCrmOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oauth2'] } },
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
				// Parâmetro novo com padrão `accessToken`: workflows salvos não o têm e seguem pela API v1.
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Access Token (API V1)', value: 'accessToken' },
					{ name: 'OAuth2 (API V2)', value: 'oauth2' },
				],
				default: 'accessToken',
				description: 'API v1 uses a private token; API v2 uses OAuth2 and has more events',
			},
			{
				displayName: 'Trigger On',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				displayOptions: { show: { authentication: ['accessToken'] } },
				description: 'The RD Station CRM events to subscribe to (one webhook is registered per event)',
				options: RD_CRM_WEBHOOK_EVENTS,
			},
			{
				displayName: 'Trigger On',
				name: 'eventsV2',
				type: 'multiOptions',
				required: true,
				default: [],
				displayOptions: { show: { authentication: ['oauth2'] } },
				description: 'The RD Station CRM API v2 events to subscribe to (one webhook is registered per event)',
				options: RD_CRM_WEBHOOK_EVENTS_V2,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				if (usesOAuth2(this)) return checkExistsV2.call(this);
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
				if (usesOAuth2(this)) return createV2.call(this);
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
				if (usesOAuth2(this)) return deleteV2.call(this);
				const staticData = this.getWorkflowStaticData('node');
				const registered = (staticData.webhooks as IRegisteredWebhook[]) ?? [];

				for (const webhook of registered) {
					try {
						await rdCrmApiRequest.call(this, 'DELETE', `/webhooks/${webhook.id}`);
					} catch (error) {
						// O webhook pode já ter sido apagado na RD. Registramos o erro (em vez de
						// engoli-lo) para o problema aparecer nos logs e seguimos removendo os outros.
						this.logger.warn(
							`Could not remove RD Station CRM webhook ${webhook.id} (${webhook.event}): ${(error as Error).message}`,
						);
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
