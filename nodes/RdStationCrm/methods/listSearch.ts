/**
 * `listSearch` dos Resource Locators da versão 2: alimenta a lista pesquisável dos campos de ID.
 *
 * Regra de reaproveitamento: onde já existe um `loadOptions` para a mesma lista (organizações,
 * usuários, times, funis, etapas, produtos, origens, campanhas, motivos de perda), o `listSearch`
 * chama esse `loadOptions` e só aplica o texto de busca. Só as listas que não tinham
 * `loadOptions` (contatos, negócios, tarefas, campos personalizados, webhooks) ganham busca nova aqui.
 *
 * Contatos e negócios podem ser milhares: para eles o texto vai à RD (parâmetro de filtro da rota)
 * e a lista vem paginada. As demais listas são curtas, então carregam inteiras e o filtro roda no node.
 */
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

import { plainId } from '../helpers/resourceLocator';
import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../transport';
import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../transport/v2';
import { loadOptions, toOptions } from './loadOptions';
import { loadOptionsV2, toOptionsV2 } from './loadOptionsV2';

/** Itens por página nas listas grandes (contatos e negócios); 50 cabe bem no dropdown do editor. */
const PAGE_SIZE = 50;

type Loader = (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>;

/** Tira acento e caixa, para "ana" achar "Ânâ Lima" (busca sem diferenciar acento). */
function normalize(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Converte opções em resultados do n8n, filtrando pelo texto no próprio node quando houver. */
function toResults(options: INodePropertyOptions[], filter?: string): INodeListSearchResult {
	const needle = normalize(filter ?? '');
	const results = options
		.filter((option) => !needle || normalize(String(option.name)).includes(needle))
		.map((option) => ({ name: String(option.name), value: String(option.value) }));
	return { results };
}

/** Lista curta: reaproveita um `loadOptions` existente e filtra pelo texto. */
function fromLoader(loader: Loader) {
	return async function (this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		return toResults(await loader.call(this), filter);
	};
}

/** Lista curta sem `loadOptions` prévio: busca tudo, monta as opções e filtra pelo texto. */
function fromItems(fetch: (ctx: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]>) {
	return async function (this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		return toResults(await fetch(this), filter);
	};
}

/**
 * Lista grande da API v1 (contatos, negócios): manda o texto à RD no parâmetro de filtro da rota
 * e devolve uma página por vez. `paginationToken` carrega o número da próxima página.
 */
function pagedV1(propertyName: string, endpoint: string, filterParam?: string, labelKey = 'name') {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: unknown,
	): Promise<INodeListSearchResult> {
		const page = Number(paginationToken) || 1;
		const qs: IDataObject = { page, limit: PAGE_SIZE };
		// Rota sem filtro de texto (tarefas): a página inteira vem e o filtro roda no node, em toResults.
		if (filter && filterParam) qs[filterParam] = filter;

		const response = await rdCrmApiRequest.call(this, 'GET', endpoint, {}, qs);
		const items = (Array.isArray(response) ? response : (response?.[propertyName] ?? [])) as IDataObject[];
		const hasMore = !Array.isArray(response) && (response?.has_more === true || items.length === PAGE_SIZE);

		return {
			...toResults(toOptions(items, labelKey), filterParam ? undefined : filter),
			...(hasMore ? { paginationToken: String(page + 1) } : {}),
		};
	};
}

/**
 * Monta o filtro RDQL "contém" (`campo:~valor`, sem diferenciar maiúscula; doc crm-v2-rdql-filtering).
 * `campo:valor` sem o `~` seria igualdade e só acharia o nome inteiro. Valor com espaço precisa de
 * aspas, e aspas dentro do texto são removidas porque fechariam o valor antes da hora.
 */
function rdqlContains(field: string, text: string): string | undefined {
	const clean = text.replace(/"/g, '').trim();
	// Texto só com espaços ou aspas vira vazio; `campo:~` sem valor seria recusado pela RD.
	if (!clean) return undefined;
	return `${field}:~${/\s/.test(clean) ? `"${clean}"` : clean}`;
}

/** Lista grande da API v2: filtro RDQL (`filter=name:texto`) e paginação por `page`. */
function pagedV2(endpoint: string, filterable = true, labelKey = 'name') {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: unknown,
	): Promise<INodeListSearchResult> {
		const page = Number(paginationToken) || 1;
		const qs: IDataObject = { page };
		// A RDQL de tarefas não tem filtro por nome (só status, tipo, dono, datas): pagina e filtra no node.
		const rdql = filter && filterable ? rdqlContains('name', filter) : undefined;
		if (rdql) qs.filter = rdql;

		const response = await rdCrmV2Request.call(this, 'GET', endpoint, {}, qs);
		const items = (response?.data ?? []) as IDataObject[];
		const hasNext = Boolean((response?.links as IDataObject | undefined)?.next);

		return {
			...toResults(toOptionsV2(items, labelKey), filterable ? undefined : filter),
			...(hasNext ? { paginationToken: String(page + 1) } : {}),
		};
	};
}

/**
 * Lista de itens que moram dentro de outro registro (etapas de um funil, produtos de uma negociação):
 * lê o ID do pai no formulário em edição e lista só os filhos dele. Sem pai escolhido, devolve lista vazia
 * em vez de chamar a RD com rota quebrada.
 */
function childrenV2(parentParam: string, pathOf: (parentId: string) => string, labelKey = 'name') {
	return async function (
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: unknown,
	): Promise<INodeListSearchResult> {
		const parentId = plainId(this.getCurrentNodeParameter(parentParam));
		if (!parentId) return { results: [] };
		return pagedV2(pathOf(parentId), false, labelKey).call(this, filter, paginationToken);
	};
}

export const listSearch = {
	// ---- API v1 (token): listas curtas que já tinham loadOptions ----
	searchOrganizations: fromLoader(loadOptions.getOrganizations),
	searchUsers: fromLoader(loadOptions.getUsers),
	searchTeams: fromLoader(loadOptions.getTeams),
	searchPipelines: fromLoader(loadOptions.getPipelines),
	searchStages: fromLoader(loadOptions.getStages),
	searchProducts: fromLoader(loadOptions.getProducts),
	searchSources: fromLoader(loadOptions.getSources),
	searchCampaigns: fromLoader(loadOptions.getCampaigns),
	searchLossReasons: fromLoader(loadOptions.getLossReasons),

	// ---- API v1: listas grandes, com o texto enviado à RD ----
	searchContacts: pagedV1('contacts', '/contacts', 'q'),
	searchDeals: pagedV1('deals', '/deals', 'name'),

	// ---- API v1: listas curtas sem loadOptions prévio ----
	// Tarefas podem ser muitas e a RD não filtra por texto: uma página por vez, rótulo = assunto.
	searchTasks: pagedV1('tasks', '/tasks', undefined, 'subject'),
	searchCustomFields: fromItems(async (ctx) =>
		toOptions(await rdCrmApiRequestAllItems.call(ctx, 'custom_fields', 'GET', '/custom_fields'), 'label'),
	),
	searchWebhooks: fromItems(async (ctx) => {
		const response = await rdCrmApiRequest.call(ctx, 'GET', '/webhooks');
		const items = (Array.isArray(response) ? response : (response?.webhooks ?? [])) as IDataObject[];
		// O webhook é identificado por `uuid` e descrito pelo evento que assina.
		return items.map((webhook) => ({
			name: `${webhook.event_type ?? webhook.event_name ?? 'webhook'} (${webhook.url ?? webhook.uuid})`,
			value: String(webhook.uuid ?? webhook.id),
		}));
	}),

	// ---- API v2 (OAuth2) ----
	searchContactsV2: pagedV2('/contacts'),
	searchDealsV2: pagedV2('/deals'),
	searchOrganizationsV2: fromLoader(loadOptionsV2.getOrganizationsV2),
	searchTasksV2: pagedV2('/tasks', false),
	searchCustomFieldsV2: fromItems(async (ctx) =>
		toOptionsV2(await rdCrmV2RequestAllItems.call(ctx, '/custom_fields')),
	),

	// ---- API v2: recursos novos ----
	searchLeadsV2: pagedV2('/leads', false),
	searchSegmentsV2: fromLoader(loadOptionsV2.getSegmentsV2),
	searchDialerCallsV2: pagedV2('/dialer_calls', false, 'id'),
	searchFilesV2: childrenV2('dealId', (dealId) => `/deals/${dealId}/files`),
	searchMeetingsV2: pagedV2('/meetings', false, 'subject'),
	searchProposalsV2: childrenV2('dealId', (dealId) => `/deals/${dealId}/proposals`, 'id'),
	searchProductsV2: pagedV2('/products', false),
	searchPipelinesV2: fromLoader(loadOptionsV2.getPipelinesV2),
	searchSourcesV2: fromLoader(loadOptionsV2.getSourcesV2),
	searchLossReasonsV2: fromLoader(loadOptionsV2.getLossReasonsV2),
	searchUsersV2: fromLoader(loadOptionsV2.getUsersV2),
	searchTeamsV2: fromLoader(loadOptionsV2.getTeamsV2),
	searchCampaignsV2: fromLoader(loadOptionsV2.getCampaignsV2),
	// O webhook v2 é identificado por `id` e descrito pelo evento e pela URL.
	searchWebhooksV2: fromItems(async (ctx) =>
		(await rdCrmV2RequestAllItems.call(ctx, '/webhooks')).map((webhook) => ({
			name: `${webhook.event_name ?? 'webhook'} (${webhook.url ?? webhook.id})`,
			value: String(webhook.id),
		})),
	),
	searchStagesV2: childrenV2('pipelineId', (pipelineId) => `/pipelines/${pipelineId}/stages`),
	searchDealProductsV2: childrenV2('dealId', (dealId) => `/deals/${dealId}/products`, 'product_id'),
};
