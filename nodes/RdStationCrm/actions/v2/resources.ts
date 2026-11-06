/**
 * Especificações dos recursos novos da API v2 (OAuth2).
 *
 * Cada entrada diz à fábrica (`resourceFactory.ts`) qual rota, quais campos e quais operações o recurso
 * tem. Rotas e campos vêm das páginas oficiais `crm-v2-*` (OpenAPI), lidas em 06/11/2026; campo que a
 * OpenAPI marca como somente leitura não entra.
 */
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import type { V2Field, V2Spec } from './resourceFactory';
import { buildDescription, makeExecutor, standardOperations } from './resourceFactory';
import { RD_CRM_WEBHOOK_EVENTS_V2 } from '../../helpers/constants';

/** Atalho para um campo de texto simples. */
const text = (name: string, displayName: string, description: string): V2Field => ({
	displayName,
	name,
	type: 'string',
	default: '',
	description,
});

/** Atalho para um campo numérico. */
const num = (name: string, displayName: string, description: string): V2Field => ({
	displayName,
	name,
	type: 'number',
	default: 0,
	description,
});

/** Atalho para um campo de lista da conta (usuário, fonte, campanha...), carregada pela API v2. */
const account = (
	name: string,
	displayName: string,
	loadOptionsMethod: string,
	description: string,
): V2Field => ({
	displayName,
	name,
	type: 'options',
	default: '',
	loadOptionsMethod,
	description,
});

/** Opções fixas de um campo `options`. */
const choices = (...values: Array<[string, string]>): INodePropertyOptions[] =>
	values.map(([name, value]) => ({ name, value }));

/** Lead: o recurso novo da v2, com status, estágio, origem e responsável. */
export const leadSpec: V2Spec = {
	resource: 'leadV2',
	label: 'Lead',
	summary: 'A prospect not yet converted into a contact or deal, in RD Station CRM API v2',
	path: () => '/leads',
	idName: 'leadId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'lead', 'leads'),
	topFields: [text('name', 'Name', 'Name of the lead, for example Ana Souza')],
	fields: [
		account('campaign_id', 'Campaign', 'getCampaignsV2', 'Campaign that brought the lead in'),
		{
			displayName: 'Contact IDs',
			name: 'contact_ids',
			type: 'csv',
			default: '',
			description: 'Comma-separated list of contact IDs linked to the lead',
		},
		account('organization_id', 'Organization', 'getOrganizationsV2', 'Organization the lead belongs to'),
		account('owner_id', 'Owner', 'getUsersV2', 'User responsible for the lead'),
		num('rating', 'Rating', 'Rating given to the lead'),
		account('source_id', 'Source', 'getSourcesV2', 'Source the lead came from'),
		account('stage_id', 'Stage', 'getStagesV2', 'Pipeline stage the lead is in'),
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'ongoing',
			options: choices(['Converted', 'converted'], ['Discarded', 'discarded'], ['Ongoing', 'ongoing']),
			description: 'Status of the lead. One of: ongoing, converted, discarded.',
		},
	],
};

/** Funil de vendas: nesta fatia só leitura. */
export const pipelineSpec: V2Spec = {
	resource: 'pipelineV2',
	label: 'Pipeline',
	summary: 'A sales funnel made up of ordered stages, in RD Station CRM API v2',
	path: () => '/pipelines',
	idName: 'pipelineId',
	operations: standardOperations(['get', 'getMany'], 'pipeline', 'pipelines'),
};

/** Etapa: mora dentro de um funil, então toda rota leva o ID do funil. */
export const stageSpec: V2Spec = {
	resource: 'stageV2',
	label: 'Stage',
	summary: 'A stage inside a pipeline, in RD Station CRM API v2',
	path: (pipelineId) => `/pipelines/${pipelineId}/stages`,
	parent: 'pipelineId',
	idName: 'stageId',
	operations: standardOperations(['get', 'getMany'], 'stage', 'stages'),
};

/** Fonte de origem do negócio ou lead. */
export const sourceSpec: V2Spec = {
	resource: 'sourceV2',
	label: 'Source',
	summary: 'The origin a deal or lead came from, in RD Station CRM API v2',
	path: () => '/sources',
	idName: 'sourceId',
	filter: true,
	operations: standardOperations(['get', 'getMany'], 'source', 'sources'),
};

/** Motivo de perda de uma negociação. */
export const lostReasonSpec: V2Spec = {
	resource: 'lostReasonV2',
	label: 'Loss Reason',
	summary: 'A reason a deal was marked as lost, in RD Station CRM API v2',
	path: () => '/lost_reasons',
	idName: 'lossReasonId',
	filter: true,
	operations: standardOperations(['get', 'getMany'], 'loss reason', 'loss reasons'),
};

/** Usuário da conta (somente leitura na v2). */
export const userSpec: V2Spec = {
	resource: 'userV2',
	label: 'User',
	summary: 'A CRM user or account member, in RD Station CRM API v2',
	path: () => '/users',
	idName: 'userId',
	filter: true,
	operations: standardOperations(['get', 'getMany'], 'user', 'users'),
};

/** Produto de uma negociação: preço, quantidade, desconto e frequência de cobrança. */
export const dealProductSpec: V2Spec = {
	resource: 'dealProductV2',
	label: 'Deal Product',
	summary: 'A product line item attached to a deal, in RD Station CRM API v2',
	path: (dealId) => `/deals/${dealId}/products`,
	parent: 'dealId',
	idName: 'dealProductId',
	filter: true,
	operations: standardOperations(
		['create', 'delete', 'getMany', 'update'],
		'deal product',
		'deal products',
	),
	topFields: [
		{
			displayName: 'Product',
			name: 'productId',
			apiName: 'product_id',
			type: 'id',
			default: '',
			createOnly: true,
			description: 'Catalog product to attach to the deal',
		},
	],
	fields: [
		{
			displayName: 'Billing Frequency',
			name: 'billing_frequency',
			type: 'options',
			default: 'one-time',
			options: choices(['Annually', 'annually'], ['Monthly', 'monthly'], ['One-Time', 'one-time']),
			description: 'How often the product is billed. One of: one-time, monthly, annually.',
		},
		num('discount', 'Discount', 'Discount value; its unit comes from Discount Type'),
		{
			displayName: 'Discount Type',
			name: 'discount_type',
			type: 'options',
			default: 'amount',
			options: choices(['Amount', 'amount'], ['Percentage', 'percentage']),
			description: 'Whether the discount is an amount or a percentage',
		},
		num('price', 'Price', 'Unit price of the product on this deal'),
		num('quantity', 'Quantity', 'Quantity of the product on this deal'),
	],
};

/** Webhook da API v2: cada webhook assina um evento e entrega o corpo na URL informada. */
export const webhookSpec: V2Spec = {
	resource: 'webhookV2',
	label: 'Webhook',
	summary: 'A webhook subscription that sends an event to a URL, in RD Station CRM API v2',
	path: () => '/webhooks',
	idName: 'webhookId',
	operations: standardOperations(
		['create', 'delete', 'get', 'getMany', 'update'],
		'webhook',
		'webhooks',
	),
	// A OpenAPI aceita só `POST` em `http_method`, então o node o manda sempre na criação.
	fixedCreateBody: { http_method: 'POST' },
	topFields: [
		{
			displayName: 'Event',
			name: 'event_name',
			type: 'options',
			default: 'crm_deal_created',
			options: RD_CRM_WEBHOOK_EVENTS_V2,
			description: 'Event that triggers the webhook',
		},
		text('url', 'URL', 'Public HTTPS URL that receives the event body'),
	],
	fields: [
		text('auth_header', 'Auth Header', 'Name of the HTTP header RD Station sends to prove the call is genuine'),
		text('auth_key', 'Auth Key', 'Value RD Station puts in the auth header'),
	],
};

/** Todas as especificações, na ordem em que aparecem no menu Resource. */
export const v2Specs: V2Spec[] = [
	dealProductSpec,
	leadSpec,
	lostReasonSpec,
	pipelineSpec,
	sourceSpec,
	stageSpec,
	userSpec,
	webhookSpec,
];

/** Opções do menu Resource geradas das especificações. */
export const newResourceOptionsV2: INodePropertyOptions[] = v2Specs.map((spec) => ({
	name: spec.label,
	value: spec.resource,
	description: spec.summary,
}));

/** Propriedades de tela de todos os recursos novos. */
export const newResourcePropertiesV2: INodeProperties[] = v2Specs.flatMap(buildDescription);

/** Mapa recurso -> função de execução, usado pelo despachante `executeResource`. */
export const newExecutorsV2: Record<string, ReturnType<typeof makeExecutor>> = Object.fromEntries(
	v2Specs.map((spec) => [spec.resource, makeExecutor(spec)]),
);
