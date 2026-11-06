/**
 * Ciclo de vida dos webhooks do trigger com autenticação OAuth2 (API v2).
 *
 * O trigger cria um webhook por evento escolhido, na URL pública do n8n, e apaga os seus ao desativar o
 * workflow. O contrato é o mesmo do trigger do RD Station Marketing: o webhook é sempre procurado pela
 * URL do modo atual (produção e teste usam URLs diferentes e podem coexistir) e este módulo NUNCA apaga
 * webhook de outra URL, porque ele pode ser de outro workflow ou da integração de outra pessoa.
 */
import type { IDataObject, IHookFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../RdStationCrm/transport/v2';

/** Webhook que este trigger criou: o ID da RD e o evento que ele assina. */
interface IRegisteredWebhook {
	id: string;
	event: string;
}

/** Static data do workflow: lista de webhooks por URL (produção e teste não se misturam). */
type ByUrl = Record<string, IRegisteredWebhook[]>;

/** Lê os eventos escolhidos na tela do trigger. */
function selectedEvents(ctx: IHookFunctions): string[] {
	return ctx.getNodeParameter('eventsV2', []) as string[];
}

/**
 * Normaliza uma URL para comparar: o host vem em minúsculas e a barra final do caminho some.
 * A RD pode devolver a URL cadastrada com essa forma; comparar com `===` faria o trigger não achar o seu
 * webhook e criar um novo a cada ativação.
 */
function normalizeUrl(value: unknown): string {
	try {
		const parsed = new URL(String(value));
		return `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
	} catch {
		// Texto que não é URL só casa com ele mesmo.
		return String(value);
	}
}

/** Lista os webhooks da conta que apontam para a URL deste modo. Os de outras URLs ficam de fora. */
async function ownWebhooks(ctx: IHookFunctions, url: string): Promise<IDataObject[]> {
	const all = await rdCrmV2RequestAllItems.call(ctx, '/webhooks');
	// Entrada sem `id` não dá para guardar nem apagar, então é ignorada.
	const wanted = normalizeUrl(url);
	return all.filter((webhook) => normalizeUrl(webhook.url) === wanted && webhook.id !== undefined);
}

/** Guarda a lista de webhooks desta URL no static data do nó. */
function remember(ctx: IHookFunctions, url: string, webhooks: IRegisteredWebhook[]): void {
	const staticData = ctx.getWorkflowStaticData('node');
	const map = (staticData.webhooksV2 ?? {}) as ByUrl;
	map[url] = webhooks;
	staticData.webhooksV2 = map;
}

/**
 * Separa os webhooks da URL em "mantém" (um por evento escolhido) e "sobra" (evento que saiu da seleção
 * ou repetido). A RD mandaria o mesmo evento duas vezes se o repetido ficasse.
 */
function sortOwn(own: IDataObject[], events: string[]) {
	const keep = new Map<string, IDataObject>();
	const extra: IDataObject[] = [];
	for (const webhook of own) {
		const event = String(webhook.event_name);
		if (events.includes(event) && !keep.has(event)) keep.set(event, webhook);
		else extra.push(webhook);
	}
	return { keep, extra };
}

/** Pergunta do n8n: "o webhook já existe?". Limpa o que sobra da URL e diz se falta algum evento. */
export async function checkExistsV2(this: IHookFunctions): Promise<boolean> {
	const url = this.getNodeWebhookUrl('default') as string;
	const events = selectedEvents(this);
	const { keep, extra } = sortOwn(await ownWebhooks(this, url), events);

	for (const webhook of extra) {
		try {
			await rdCrmV2Request.call(this, 'DELETE', `/webhooks/${String(webhook.id)}`);
		} catch (error) {
			// Se a RD recusar apagar, o fluxo continua; o webhook velho fica para limpeza manual.
			this.logger.warn(
				`RD Station CRM: could not delete the outdated webhook ${String(webhook.id)}: ${(error as Error).message}`,
			);
		}
	}

	// Guarda o que existe agora (o static data pode ter se perdido). Com evento faltando, o n8n chama `create`.
	remember(
		this,
		url,
		[...keep.entries()].map(([event, webhook]) => ({ id: String(webhook.id), event })),
	);
	return events.every((event) => keep.has(event));
}

/** Cria só os webhooks que faltam e guarda todos os IDs desta URL. */
export async function createV2(this: IHookFunctions): Promise<boolean> {
	const url = this.getNodeWebhookUrl('default') as string;
	const events = selectedEvents(this);
	const { keep } = sortOwn(await ownWebhooks(this, url), events);

	const registered: IRegisteredWebhook[] = [];
	for (const event of events) {
		const existing = keep.get(event);
		if (existing) {
			registered.push({ id: String(existing.id), event });
			continue;
		}
		const response = await rdCrmV2Request.call(this, 'POST', '/webhooks', {
			event_name: event,
			http_method: 'POST',
			url,
		});
		const created = (response.data ?? response) as IDataObject;
		// Sem `id` não há como apagar o webhook depois; tratar como falha evita webhook órfão.
		if (created.id === undefined) return false;
		registered.push({ id: String(created.id), event });
	}

	remember(this, url, registered);
	return true;
}

/** Apaga só os webhooks guardados para a URL deste modo. 404 conta como já apagado. */
export async function deleteV2(this: IHookFunctions): Promise<boolean> {
	const url = this.getNodeWebhookUrl('default') as string;
	const staticData = this.getWorkflowStaticData('node');
	const map = (staticData.webhooksV2 ?? {}) as ByUrl;
	const saved = map[url] ?? [];

	const failed: IRegisteredWebhook[] = [];
	let firstError: unknown;
	for (const webhook of saved) {
		try {
			await rdCrmV2Request.call(this, 'DELETE', `/webhooks/${webhook.id}`);
		} catch (error) {
			// 404: alguém já apagou na RD, então o objetivo foi cumprido.
			const gone = error instanceof NodeApiError && String(error.httpCode) === '404';
			if (!gone) {
				failed.push(webhook);
				firstError ??= error;
			}
		}
	}

	// Os que falharam continuam guardados para a próxima tentativa; os demais saem da memória.
	if (failed.length) map[url] = failed;
	else delete map[url];
	staticData.webhooksV2 = map;

	if (firstError) {
		throw firstError instanceof NodeApiError
			? firstError
			: new NodeApiError(this.getNode(), firstError as JsonObject);
	}
	return true;
}
