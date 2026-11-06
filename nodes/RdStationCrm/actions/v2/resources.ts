/**
 * Especificações dos recursos novos da API v2 (OAuth2).
 *
 * Cada entrada diz à fábrica (`resourceFactory.ts`) qual rota, quais campos e quais operações o recurso
 * tem. Rotas e campos vêm das páginas oficiais `crm-v2-*` (OpenAPI), lidas em 06/11/2026; campo que a
 * OpenAPI marca como somente leitura não entra.
 */
import type { IExecuteFunctions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import type { V2Field, V2Spec } from './resourceFactory';
import { buildDescription, makeExecutor, standardOperations } from './resourceFactory';
import { RD_CRM_WEBHOOK_EVENTS_V2 } from '../../helpers/constants';
import { buildMultipart, rdCrmV2Multipart } from '../../transport/v2';

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
	// A doc crm-v2-create-lead exige `name` e `owner_id` na criação (sem eles a RD responde 422).
	topFields: [
		text('name', 'Name', 'Name of the lead, for example Ana Souza'),
		account('owner_id', 'Owner', 'getUsersV2', 'User responsible for the lead'),
	],
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
		num('rating', 'Rating', 'Rating given to the lead'),
		account('source_id', 'Source', 'getSourcesV2', 'Source the lead came from'),
		account('stage_id', 'Stage', 'getStagesV2', 'Pipeline stage the lead is in'),
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'ongoing',
			// Na criação a RD só aceita `ongoing`; os outros valores valem na atualização.
			updateOnly: true,
			options: choices(['Converted', 'converted'], ['Discarded', 'discarded'], ['Ongoing', 'ongoing']),
			description: 'Status of the lead. One of: ongoing, converted, discarded.',
		},
	],
};

/** Funil de vendas. */
export const pipelineSpec: V2Spec = {
	resource: 'pipelineV2',
	label: 'Pipeline',
	summary: 'A sales funnel made up of ordered stages, in RD Station CRM API v2',
	path: () => '/pipelines',
	idName: 'pipelineId',
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'pipeline', 'pipelines'),
	topFields: [text('name', 'Name', 'Name of the pipeline, for example Sales')],
	fields: [num('order', 'Order', 'Position of the pipeline in the pipeline list')],
};

/** Etapa: mora dentro de um funil, então toda rota leva o ID do funil. */
export const stageSpec: V2Spec = {
	resource: 'stageV2',
	label: 'Stage',
	summary: 'A stage inside a pipeline, in RD Station CRM API v2',
	path: (pipelineId) => `/pipelines/${pipelineId}/stages`,
	parent: 'pipelineId',
	idName: 'stageId',
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'stage', 'stages'),
	topFields: [text('name', 'Name', 'Name of the stage, for example Proposal sent')],
	fields: [
		text('description', 'Description', 'Free-text description of the stage'),
		text('objective', 'Objective', 'What the team must achieve to move a deal past this stage'),
		num('order', 'Order', 'Position of the stage inside the pipeline'),
	],
};

/** Fonte de origem do negócio ou lead. */
export const sourceSpec: V2Spec = {
	resource: 'sourceV2',
	label: 'Source',
	summary: 'The origin a deal or lead came from, in RD Station CRM API v2',
	path: () => '/sources',
	idName: 'sourceId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'source', 'sources'),
	topFields: [text('name', 'Name', 'Name of the source, for example Trade show')],
	fields: [text('description', 'Description', 'Free-text description of the source')],
};

/** Motivo de perda de uma negociação. */
export const lostReasonSpec: V2Spec = {
	resource: 'lostReasonV2',
	label: 'Loss Reason',
	summary: 'A reason a deal was marked as lost, in RD Station CRM API v2',
	path: () => '/lost_reasons',
	idName: 'lossReasonId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'loss reason', 'loss reasons'),
	topFields: [text('name', 'Name', 'Name of the loss reason, for example Price too high')],
};

/** Usuário da conta (somente leitura na v2). */
export const userSpec: V2Spec = {
	resource: 'userV2',
	label: 'User',
	summary: 'A CRM user or account member, in RD Station CRM API v2',
	path: () => '/users',
	idName: 'userId',
	filter: true,
	operations: [
		...standardOperations(['get', 'getMany'], 'user', 'users'),
		// Disponibilidade para reuniões: rota própria, sem o filtro RDQL (a doc só aceita ordenar e paginar).
		{
			value: 'getMeetingAvailability',
			kind: 'get',
			name: 'Get Meeting Availability',
			action: 'Get the meeting availability of a user',
			description: 'Retrieve the meeting availability of one user from RD Station CRM (API v2)',
			path: (_parentId, id) => `/users/${id}/meeting_availability`,
		},
		{
			value: 'getManyMeetingAvailabilities',
			kind: 'getMany',
			name: 'Get Many Meeting Availabilities',
			action: 'Get the meeting availability of many users',
			description: 'Retrieve the meeting availability of all users from RD Station CRM (API v2)',
			path: () => '/users/meeting_availability',
			filter: false,
		},
	],
};

/** Produto de uma negociação: preço, quantidade, desconto e frequência de cobrança. */
export const dealProductSpec: V2Spec = {
	resource: 'dealProductV2',
	label: 'Deal Product',
	summary: 'A product line item attached to a deal, in RD Station CRM API v2',
	path: (dealId) => `/deals/${dealId}/products`,
	parent: 'dealId',
	// Não use `dealProductId`: o recurso `dealProduct` da API v1 já tem esse nome e a tabela de IDs guiados é por nome.
	idName: 'dealProductLineId',
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
		{
			displayName: 'Custom Fields',
			name: 'deal_product_custom_fields',
			type: 'json',
			default: '[]',
			expect: 'array',
			description:
				'Custom field values as a JSON list of objects with custom_field_id and value',
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

/** Produto do catálogo. */
export const productSpec: V2Spec = {
	resource: 'productV2',
	label: 'Product',
	summary: 'A catalog product with a name and base price, in RD Station CRM API v2',
	path: () => '/products',
	idName: 'productId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'product', 'products'),
	topFields: [text('name', 'Name', 'Name of the product, for example Pro plan')],
	fields: [
		{
			displayName: 'Custom Fields',
			name: 'custom_fields',
			type: 'json',
			default: '',
			expect: 'object',
			description: 'Custom field values as a JSON object, keyed by custom field slug',
		},
		text('description', 'Description', 'Free-text description of the product'),
		num('price', 'Price', 'Base price of the product'),
		{
			displayName: 'Visible',
			name: 'visible',
			type: 'boolean',
			default: true,
			description: 'Whether the product is visible in the catalog',
		},
	],
};

/** Campanha de marketing ligada a leads e negociações. */
export const campaignSpec: V2Spec = {
	resource: 'campaignV2',
	label: 'Campaign',
	summary: 'A marketing campaign that leads and deals can be linked to, in RD Station CRM API v2',
	path: () => '/campaigns',
	idName: 'campaignId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'campaign', 'campaigns'),
	topFields: [text('name', 'Name', 'Name of the campaign, for example Black Friday')],
	fields: [text('description', 'Description', 'Free-text description of the campaign')],
};

/** Reunião agendada com contatos. */
export const meetingSpec: V2Spec = {
	resource: 'meetingV2',
	label: 'Meeting',
	summary: 'A meeting scheduled with contacts, in RD Station CRM API v2',
	path: () => '/meetings',
	idName: 'meetingId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'meeting', 'meetings'),
	topFields: [text('subject', 'Subject', 'Title of the meeting, for example Product demo')],
	fields: [
		{
			displayName: 'Contact IDs',
			name: 'contact_ids',
			type: 'csv',
			default: '',
			description: 'Comma-separated list of contact IDs that take part in the meeting',
		},
		num('duration_minutes', 'Duration (Minutes)', 'Length of the meeting in minutes'),
		text('notes', 'Notes', 'Free-text notes about the meeting'),
		account('organizer_id', 'Organizer', 'getUsersV2', 'User who organizes the meeting'),
		account('responsible_id', 'Responsible', 'getUsersV2', 'User responsible for the meeting'),
		{
			displayName: 'Starts At',
			name: 'starts_at',
			type: 'dateTime',
			default: '',
			description: 'Start of the meeting; sent to RD Station in ISO 8601 UTC',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'scheduled',
			options: choices(['Completed', 'completed'], ['No Show', 'no_show'], ['Scheduled', 'scheduled']),
			description: 'Status of the meeting. One of: scheduled, completed, no_show.',
		},
	],
};

/** Proposta comercial de uma negociação (criar, ler e listar; a RD não permite editar). */
export const proposalSpec: V2Spec = {
	resource: 'proposalV2',
	label: 'Proposal',
	summary: 'A commercial proposal built on a deal, in RD Station CRM API v2',
	path: (dealId) => `/deals/${dealId}/proposals`,
	parent: 'dealId',
	idName: 'proposalId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany'], 'proposal', 'proposals'),
	topFields: [
		text('proposal_template_id', 'Proposal Template ID', 'ID of the proposal template the proposal is built from'),
		{
			displayName: 'Sections',
			name: 'sections',
			type: 'json',
			default: '[]',
			expect: 'array',
			description:
				'Proposal sections as a JSON list, each with slug, type (html or products_list), value and order',
		},
	],
	fields: [
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'active',
			options: choices(['Active', 'active'], ['Inactive', 'inactive']),
			description: 'Status of the proposal. One of: active, inactive.',
		},
	],
};

/** Equipe de usuários (somente leitura na v2). */
export const teamSpec: V2Spec = {
	resource: 'teamV2',
	label: 'Team',
	summary: 'A group of CRM users, in RD Station CRM API v2',
	path: () => '/teams',
	idName: 'teamId',
	operations: standardOperations(['get', 'getMany'], 'team', 'teams'),
};

/** Segmento de contatos. */
export const segmentSpec: V2Spec = {
	resource: 'segmentV2',
	label: 'Segment',
	summary: 'A saved group of contacts, in RD Station CRM API v2',
	path: () => '/segments',
	idName: 'segmentId',
	filter: true,
	operations: standardOperations(['create', 'get', 'getMany', 'update'], 'segment', 'segments'),
	topFields: [text('name', 'Name', 'Name of the segment, for example VIP clients')],
};

/** Ligação do discador (webphone): somente leitura. */
export const dialerCallSpec: V2Spec = {
	resource: 'dialerCallV2',
	label: 'Dialer Call',
	summary: 'A call made through the RD Station CRM webphone, in RD Station CRM API v2',
	path: () => '/dialer_calls',
	idName: 'dialerCallId',
	filter: true,
	operations: standardOperations(['get', 'getMany'], 'dialer call', 'dialer calls'),
};

/**
 * Envio de arquivo à negociação: o corpo é `multipart/form-data` com o arquivo em `data[file]`,
 * então fica fora do molde JSON da fábrica. Valida o binário antes de qualquer requisição.
 */
async function uploadDealFile(
	this: IExecuteFunctions,
	operation: string,
	i: number,
	ids: { parentId: string },
): Promise<unknown | undefined> {
	if (operation !== 'upload') return undefined;
	const propertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	// Lança erro claro se o item não traz o binário, antes de qualquer chamada à RD.
	const binary = this.helpers.assertBinaryData(i, propertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(i, propertyName);
	// O n8n-core só reconhece o FormData do pacote `form-data` (dependência que este pacote não pode ter),
	// então o multipart é montado à mão num Buffer, com o boundary no cabeçalho Content-Type.
	const { body, contentType } = buildMultipart(
		'data[file]',
		binary.fileName ?? 'file',
		binary.mimeType ?? 'application/octet-stream',
		buffer,
	);
	const response = await rdCrmV2Multipart.call(this, `/deals/${ids.parentId}/files`, body, contentType);
	return response.data ?? response;
}

/** Anexos da negociação: listar, apagar e enviar arquivo. */
export const dealFileSpec: V2Spec = {
	resource: 'dealFileV2',
	label: 'Deal File',
	summary: 'A file attached to a deal, in RD Station CRM API v2',
	path: (dealId) => `/deals/${dealId}/files`,
	parent: 'dealId',
	idName: 'fileId',
	operations: [
		...standardOperations(['delete', 'getMany'], 'deal file', 'deal files'),
		{
			value: 'upload',
			kind: 'custom',
			name: 'Upload',
			action: 'Upload a file to a deal',
			description: 'Attach a binary file from the item to a deal in RD Station CRM (API v2)',
		},
	],
	custom: uploadDealFile,
	extraProperties: [
		{
			displayName: 'Input Binary Field',
			name: 'binaryPropertyName',
			type: 'string',
			required: true,
			default: 'data',
			displayOptions: { show: { resource: ['dealFileV2'], operation: ['upload'] } },
			hint: 'The name of the input binary field that holds the file',
			description: 'Name of the binary property of the item that holds the file to upload',
		},
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
	campaignSpec,
	dealFileSpec,
	dealProductSpec,
	dialerCallSpec,
	leadSpec,
	lostReasonSpec,
	meetingSpec,
	pipelineSpec,
	productSpec,
	proposalSpec,
	segmentSpec,
	sourceSpec,
	stageSpec,
	teamSpec,
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
