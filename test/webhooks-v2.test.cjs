/**
 * Prova os webhooks da API v2 (slice S2 do plano `rotas-novas-v2`): o recurso `webhookV2` do node e o
 * trigger com autenticação OAuth2. Os valores esperados vêm da OpenAPI oficial de `POST /webhooks`
 * (crm-v2-create-webhook) e do contrato seguro do trigger do RD Station Marketing: o trigger procura o
 * webhook pela URL do modo atual e nunca apaga o webhook de outra URL.
 */
const { describe, it } = require('node:test');
const { assert, runExecute } = require('./helpers.cjs');
const { RdStationCrmTrigger } = require('../dist/nodes/RdStationCrmTrigger/RdStationCrmTrigger.node');

const BASE = 'https://api.rd.services/crm/v2';
const trigger = new RdStationCrmTrigger();
const hooks = trigger.webhookMethods.default;
const locator = (value) => ({ mode: 'list', value });

/** Os 38 valores de `event_name` da OpenAPI da v2, copiados da doc (não do código). */
const DOC_EVENTS = [
	'crm_campaign_created', 'crm_campaign_deleted', 'crm_campaign_updated',
	'crm_contact_created', 'crm_contact_deleted', 'crm_contact_updated',
	'crm_deal_created', 'crm_deal_deleted', 'crm_deal_updated',
	'crm_dialer_call_status_changed', 'crm_dialer_call_transcription_completed',
	'crm_lead_created', 'crm_lead_deleted', 'crm_lead_owner_changed', 'crm_lead_rating_changed',
	'crm_lead_stage_changed', 'crm_lead_status_changed', 'crm_lead_updated',
	'crm_lost_reason_created', 'crm_lost_reason_deleted', 'crm_lost_reason_updated',
	'crm_meeting_created', 'crm_meeting_participants_changed', 'crm_meeting_status_changed',
	'crm_meeting_updated',
	'crm_organization_created', 'crm_organization_deleted', 'crm_organization_updated',
	'crm_product_created', 'crm_product_deleted', 'crm_product_updated',
	'crm_proposal_created',
	'crm_source_created', 'crm_source_deleted', 'crm_source_updated',
	'crm_task_created', 'crm_task_deleted', 'crm_task_updated',
];

/**
 * Contexto falso de hook do trigger. `remote` é a lista de webhooks que a RD devolve; as chamadas
 * ficam em `calls`. `failOnDelete` faz o DELETE de um id lançar o erro dado.
 */
function hookContext({ params, remote = [], staticData = {}, url = 'https://n8n.test/webhook/U', failOnDelete = {} }) {
	const calls = [];
	const warnings = [];
	let nextId = 1;
	const context = {
		getNode: () => ({ name: 'RD Station CRM Trigger', type: 'trigger', typeVersion: 1 }),
		getNodeParameter: (name, fallback) => (name in params ? params[name] : fallback),
		getNodeWebhookUrl: () => url,
		getWorkflowStaticData: () => staticData,
		logger: { warn: (message) => warnings.push(String(message)) },
		helpers: {
			httpRequestWithAuthentication: async (credential, options) => {
				calls.push({ cred: credential, method: options.method, base: options.baseURL, url: options.url, body: options.body, timeout: options.timeout });
				// A API v1 lista como `{ webhooks }` e cria devolvendo `{ uuid }`; a v2 usa o envelope `{ data }`.
				if (options.baseURL.includes('crm.rdstation.com')) {
					return options.method === 'GET' ? { webhooks: remote } : { uuid: 'v1-1' };
				}
				if (options.method === 'GET') return { data: remote, links: {} };
				if (options.method === 'POST') return { data: { id: `new${nextId++}`, event_name: options.body.data.event_name, url: options.body.data.url } };
				const id = options.url.split('/').pop();
				if (failOnDelete[id]) throw Object.assign(new Error('boom'), { httpCode: failOnDelete[id] });
				return '';
			},
		},
	};
	return { context, calls, warnings, staticData };
}

const oauth = (events) => ({ authentication: 'oauth2', eventsV2: events });

describe('S2 webhooks v2 and the OAuth2 trigger', () => {
	it('S2.1 webhook create posts the v2 body', async () => {
		const [plain] = await runExecute({
			version: 2,
			params: {
				authentication: 'oauth2',
				resource: 'webhookV2',
				operation: 'create',
				event_name: 'crm_lead_created',
				url: 'https://x.test/h',
			},
		});
		assert.equal(plain.method, 'POST');
		assert.equal(plain.url, '/webhooks');
		assert.equal(plain.baseURL, BASE);
		assert.equal(plain.timeout, 30000);
		assert.deepEqual(plain.body, {
			data: { http_method: 'POST', event_name: 'crm_lead_created', url: 'https://x.test/h' },
		});
		const [withAuth] = await runExecute({
			version: 2,
			params: {
				authentication: 'oauth2',
				resource: 'webhookV2',
				operation: 'create',
				event_name: 'crm_lead_created',
				url: 'https://x.test/h',
				additionalFields: { auth_header: 'X-Key', auth_key: 'k' },
			},
		});
		assert.equal(withAuth.body.data.auth_header, 'X-Key');
		assert.equal(withAuth.body.data.auth_key, 'k');
	});

	it('S2.2 webhook get list update and delete routes', async () => {
		const base = { authentication: 'oauth2', resource: 'webhookV2' };
		const [get] = await runExecute({ version: 2, params: { ...base, operation: 'get', webhookId: locator('W1') } });
		assert.equal(`${get.method} ${get.url}`, 'GET /webhooks/W1');
		const [many] = await runExecute({ version: 2, params: { ...base, operation: 'getMany', returnAll: false, limit: 5 } });
		assert.equal(`${many.method} ${many.url}`, 'GET /webhooks');
		const [update] = await runExecute({
			version: 2,
			params: { ...base, operation: 'update', webhookId: locator('W1'), updateFields: { url: 'https://y.test/h' } },
		});
		assert.equal(`${update.method} ${update.url}`, 'PUT /webhooks/W1');
		assert.deepEqual(update.body, { data: { url: 'https://y.test/h' } });
		const [del] = await runExecute({ version: 2, params: { ...base, operation: 'delete', webhookId: locator('W1') } });
		assert.equal(`${del.method} ${del.url}`, 'DELETE /webhooks/W1');
	});

	it('S2.3 trigger lists the 38 v2 events', () => {
		const field = trigger.description.properties.find((p) => p.name === 'eventsV2');
		assert.ok(field, 'eventsV2 is missing');
		assert.equal(field.type, 'multiOptions');
		assert.deepEqual(field.options.map((o) => o.value).sort(), [...DOC_EVENTS].sort());
		assert.equal(field.options.length, 38);
	});

	it('S2.4 trigger credentials follow authentication and events stay', () => {
		const description = trigger.description;
		const auth = description.properties.find((p) => p.name === 'authentication');
		assert.equal(auth.default, 'accessToken');
		assert.deepEqual(auth.options.map((o) => o.value), ['accessToken', 'oauth2']);
		const credential = (name) => description.credentials.find((c) => c.name === name);
		assert.deepEqual(credential('rdStationCrmApi').displayOptions.show.authentication, ['accessToken']);
		assert.deepEqual(credential('rdStationCrmOAuth2Api').displayOptions.show.authentication, ['oauth2']);
		const events = description.properties.find((p) => p.name === 'events');
		assert.equal(events.type, 'multiOptions');
		assert.deepEqual(events.options.map((o) => o.value).sort(), [
			'crm_campaign_created', 'crm_campaign_deleted', 'crm_campaign_updated',
			'crm_contact_created', 'crm_contact_deleted', 'crm_contact_updated',
			'crm_deal_created', 'crm_deal_deleted', 'crm_deal_updated',
			'crm_lost_reason_created', 'crm_lost_reason_deleted', 'crm_lost_reason_updated',
			'crm_organization_created', 'crm_organization_deleted', 'crm_organization_updated',
			'crm_product_created', 'crm_product_deleted', 'crm_product_updated',
			'crm_source_created', 'crm_source_deleted', 'crm_source_updated',
			'crm_task_created', 'crm_task_updated',
		]);
		assert.equal(description.version, 1);
	});

	it('S2.5 create posts only the missing event and remembers ids by url', async () => {
		const { context, calls, staticData } = hookContext({
			params: oauth(['crm_lead_created', 'crm_lead_updated']),
			remote: [{ id: 'A', event_name: 'crm_lead_created', url: 'https://n8n.test/webhook/U' }],
		});
		assert.equal(await hooks.create.call(context), true);
		const posts = calls.filter((c) => c.method === 'POST');
		assert.equal(posts.length, 1);
		assert.equal(posts[0].url, '/webhooks');
		assert.equal(posts[0].base, BASE);
		assert.equal(posts[0].cred, 'rdStationCrmOAuth2Api');
		assert.equal(posts[0].timeout, 30000);
		assert.deepEqual(posts[0].body, {
			data: { event_name: 'crm_lead_updated', http_method: 'POST', url: 'https://n8n.test/webhook/U' },
		});
		assert.deepEqual(staticData.webhooksV2['https://n8n.test/webhook/U'], [
			{ id: 'A', event: 'crm_lead_created' },
			{ id: 'new1', event: 'crm_lead_updated' },
		]);
	});

	it('S2.6 checkExists never deletes a webhook of another url', async () => {
		const { context, calls } = hookContext({
			params: oauth(['crm_lead_created']),
			remote: [
				{ id: 'A', event_name: 'crm_lead_created', url: 'https://n8n.test/webhook/U' },
				{ id: 'Z', event_name: 'crm_lead_created', url: 'https://other.test/x' },
				{ id: 'Y', event_name: 'crm_deal_created', url: 'https://n8n.test/webhook-test/U' },
			],
		});
		assert.equal(await hooks.checkExists.call(context), true);
		assert.deepEqual(calls.filter((c) => c.method === 'DELETE'), []);
	});

	it('S2.7 checkExists removes stale and duplicate webhooks of its own url', async () => {
		const U = 'https://n8n.test/webhook/U';
		const { context, calls } = hookContext({
			params: oauth(['crm_lead_created', 'crm_lead_updated']),
			remote: [
				{ id: 'A', event_name: 'crm_lead_created', url: U },
				{ id: 'B', event_name: 'crm_lead_created', url: U },
				{ id: 'C', event_name: 'crm_deal_created', url: U },
			],
		});
		// Falta crm_lead_updated, então devolve false; mesmo assim limpa o repetido (B) e o velho (C).
		assert.equal(await hooks.checkExists.call(context), false);
		assert.deepEqual(
			calls.filter((c) => c.method === 'DELETE').map((c) => c.url).sort(),
			['/webhooks/B', '/webhooks/C'],
		);
		const complete = hookContext({
			params: oauth(['crm_lead_created']),
			remote: [{ id: 'A', event_name: 'crm_lead_created', url: U }],
		});
		assert.equal(await hooks.checkExists.call(complete.context), true);
		assert.deepEqual(complete.staticData.webhooksV2[U], [{ id: 'A', event: 'crm_lead_created' }]);
	});

	it('S2.8 delete removes only its own ids and keeps them on failure', async () => {
		const U = 'https://n8n.test/webhook/U';
		const staticData = {
			webhooksV2: {
				[U]: [{ id: 'A', event: 'crm_lead_created' }, { id: 'B', event: 'crm_lead_updated' }],
				'https://n8n.test/webhook-test/U': [{ id: 'T', event: 'crm_lead_created' }],
			},
		};
		// 404 = já apagado: tudo certo e o id sai da memória.
		const gone = hookContext({ params: oauth([]), staticData, failOnDelete: { A: '404' } });
		assert.equal(await hooks.delete.call(gone.context), true);
		assert.deepEqual(gone.calls.map((c) => c.url), ['/webhooks/A', '/webhooks/B']);
		assert.equal(U in staticData.webhooksV2, false);
		assert.deepEqual(staticData.webhooksV2['https://n8n.test/webhook-test/U'], [{ id: 'T', event: 'crm_lead_created' }]);
		// Outro erro: o id que falhou continua guardado para a próxima tentativa.
		const keep = { webhooksV2: { [U]: [{ id: 'A', event: 'crm_lead_created' }] } };
		const failing = hookContext({ params: oauth([]), staticData: keep, failOnDelete: { A: '500' } });
		await assert.rejects(hooks.delete.call(failing.context));
		assert.deepEqual(keep.webhooksV2[U], [{ id: 'A', event: 'crm_lead_created' }]);
	});

	it('S2.9 token mode keeps the v1 calls', async () => {
		const { context, calls } = hookContext({
			params: { events: ['crm_deal_created'] },
			remote: [],
		});
		assert.equal(await hooks.create.call(context), true);
		assert.equal(calls[0].method, 'GET');
		assert.equal(calls[0].base, 'https://crm.rdstation.com/api/v1');
		assert.equal(calls[0].url, '/webhooks');
		assert.equal(calls[0].cred, 'rdStationCrmApi');
		assert.equal(calls[1].method, 'POST');
		assert.deepEqual(calls[1].body, { event_type: 'crm_deal_created', url: 'https://n8n.test/webhook/U', http_method: 'POST' });
		// checkExists lista pela v1 e delete apaga pela v1 os ids guardados em `staticData.webhooks`.
		const exists = hookContext({
			params: { events: ['crm_deal_created'] },
			remote: [{ uuid: 'w1', url: 'https://n8n.test/webhook/U', event_type: 'crm_deal_created' }],
		});
		assert.equal(await hooks.checkExists.call(exists.context), true);
		assert.equal(exists.calls[0].base, 'https://crm.rdstation.com/api/v1');
		assert.deepEqual(exists.staticData.webhooks, [{ id: 'w1', event: 'crm_deal_created' }]);
		const removal = hookContext({ params: {}, staticData: { webhooks: [{ id: 'w1', event: 'crm_deal_created' }] } });
		assert.equal(await hooks.delete.call(removal.context), true);
		assert.equal(removal.calls[0].method, 'DELETE');
		assert.equal(removal.calls[0].url, '/webhooks/w1');
		assert.equal(removal.calls[0].base, 'https://crm.rdstation.com/api/v1');
	});

	it('S2.10 trigger emits the delivered body', async () => {
		const body = {
			event_name: 'crm_lead_created',
			event_timestamp: '2026-11-06T10:00:00.000Z',
			transaction_uuid: '00000000-0052-4400-B753-746174696F6E',
			document: { id: 'L1' },
		};
		const context = {
			getBodyData: () => body,
			helpers: { returnJsonArray: (item) => [{ json: item }] },
		};
		const result = await trigger.webhook.call(context);
		assert.deepEqual(result.workflowData[0][0].json, body);
	});

	it('F3 checkExists and create read every page of the webhook list', async () => {
		const U = 'https://n8n.test/webhook/U';
		// Página 1 só tem webhook de outra URL; o velho da própria URL está na página 2.
		const pages = {
			undefined: { data: [{ id: 'Z', event_name: 'crm_lead_created', url: 'https://other.test/x' }], links: { next: 'https://api.rd.services/crm/v2/webhooks?page=2' } },
			2: { data: [{ id: 'A', event_name: 'crm_lead_created', url: U }, { id: 'S', event_name: 'crm_deal_created', url: U }], links: {} },
		};
		const calls = [];
		const context = hookContext({ params: oauth(['crm_lead_created']) }).context;
		context.helpers.httpRequestWithAuthentication = async (_cred, options) => {
			calls.push(`${options.method} ${options.url}`);
			if (options.method === 'GET') return pages[options.qs?.page];
			return '';
		};
		assert.equal(await hooks.checkExists.call(context), true);
		assert.deepEqual(calls.filter((c) => c.startsWith('DELETE')), ['DELETE /webhooks/S']);
		// `create` lê as mesmas páginas: o evento já existe na página 2, então não posta outro webhook.
		calls.length = 0;
		assert.equal(await hooks.create.call(context), true);
		assert.deepEqual(calls.filter((c) => c.startsWith('POST')), []);
	});

	it('F7 the webhook url is compared without trailing slash or host case', async () => {
		const { context, calls } = hookContext({
			params: oauth(['crm_lead_created']),
			remote: [{ id: 'A', event_name: 'crm_lead_created', url: 'https://N8N.test/webhook/U/' }],
		});
		assert.equal(await hooks.checkExists.call(context), true);
		assert.deepEqual(calls.filter((c) => c.method !== 'GET'), []);
	});
});
