/**
 * Prova as rotas novas da API v2 (slices S1, S3 e S4 do plano `rotas-novas-v2`).
 *
 * Cada teste chama o `execute` real do node compilado em `dist` com um contexto falso que grava
 * a requisição HTTP, e confere método, rota, corpo e timeout contra o que a OpenAPI oficial manda.
 * Os valores esperados vêm da doc (developers.rdstation.com, páginas crm-v2-*), nunca do código.
 */
const { describe, it } = require('node:test');
const { NodeOperationError } = require('n8n-workflow');
const { assert, RdStationCrm, runExecute } = require('./helpers.cjs');
const snapshot = require('./fixtures/params-origin-master.json');

const BASE = 'https://api.rd.services/crm/v2';
const description = new RdStationCrm().description;

/** Valor de Resource Locator como o editor do n8n grava. */
const locator = (value, mode = 'list') => ({ mode, value });

/** Roda uma operação na versão 2 do node com OAuth2 e devolve as requisições feitas. */
async function call(params, responder = () => ({ data: [] })) {
	return runExecute({
		version: 2,
		params: { authentication: 'oauth2', ...params },
		responder,
	});
}

/** Confere uma requisição: método, rota e (opcional) corpo/qs, mais base, credencial e timeout. */
function expectRequest(request, method, url, extra = {}) {
	assert.equal(request.method, method);
	assert.equal(request.url, url);
	assert.equal(request.baseURL, BASE);
	assert.equal(request.cred, 'rdStationCrmOAuth2Api');
	assert.equal(request.timeout, 30000);
	if ('body' in extra) assert.deepEqual(request.body, extra.body);
	if ('qs' in extra) assert.deepEqual(request.qs, extra.qs);
}

/** Acha as propriedades do node com um nome, para um recurso e uma faixa de versão. */
function props(name, resource) {
	return description.properties.filter(
		(p) => p.name === name && p.displayOptions?.show?.resource?.includes(resource),
	);
}

describe('S1 leads, pipelines, stages, sources, lost reasons, users and deal products', () => {
	it('S1.1 lead create posts /leads with the data envelope', async () => {
		const [request] = await call({
			resource: 'leadV2',
			operation: 'create',
			name: 'Ana',
			additionalFields: { status: 'ongoing', rating: 3, contact_ids: 'c1, c2' },
		});
		expectRequest(request, 'POST', '/leads', {
			body: { data: { name: 'Ana', status: 'ongoing', rating: 3, contact_ids: ['c1', 'c2'] } },
		});
	});

	it('S1.2 lead get reads the locator and trims it', async () => {
		const [request] = await call({
			resource: 'leadV2',
			operation: 'get',
			leadId: locator(' L9 ', 'id'),
		});
		expectRequest(request, 'GET', '/leads/L9');
	});

	it('S1.3 lead update puts only the changed fields', async () => {
		const [request] = await call({
			resource: 'leadV2',
			operation: 'update',
			leadId: locator('L9'),
			updateFields: { status: 'converted' },
		});
		expectRequest(request, 'PUT', '/leads/L9', { body: { data: { status: 'converted' } } });
	});

	it('S1.4 lead getMany sends the filter and the page size', async () => {
		const [request] = await call({
			resource: 'leadV2',
			operation: 'getMany',
			returnAll: false,
			limit: 20,
			filters: { filter: 'status:ongoing' },
		});
		expectRequest(request, 'GET', '/leads', {
			qs: { filter: 'status:ongoing', 'page[size]': 20 },
		});
	});

	it('S1.5 pipeline get and getMany call the pipeline routes', async () => {
		const [get] = await call({ resource: 'pipelineV2', operation: 'get', pipelineId: locator('P1') });
		expectRequest(get, 'GET', '/pipelines/P1');
		const [many] = await call({
			resource: 'pipelineV2',
			operation: 'getMany',
			returnAll: false,
			limit: 5,
		});
		expectRequest(many, 'GET', '/pipelines', { qs: { 'page[size]': 5 } });
	});

	it('S1.6 stage get and getMany are nested under the pipeline', async () => {
		const [many] = await call({
			resource: 'stageV2',
			operation: 'getMany',
			pipelineId: locator('P1'),
			returnAll: false,
			limit: 5,
		});
		expectRequest(many, 'GET', '/pipelines/P1/stages');
		const [get] = await call({
			resource: 'stageV2',
			operation: 'get',
			pipelineId: locator('P1'),
			stageId: locator('S2'),
		});
		expectRequest(get, 'GET', '/pipelines/P1/stages/S2');
	});

	it('S1.7 source and lost reason read routes', async () => {
		const cases = [
			['sourceV2', 'sourceId', '/sources'],
			['lostReasonV2', 'lossReasonId', '/lost_reasons'],
		];
		for (const [resource, idParam, path] of cases) {
			const [get] = await call({ resource, operation: 'get', [idParam]: locator('Z1') });
			expectRequest(get, 'GET', `${path}/Z1`);
			const [many] = await call({ resource, operation: 'getMany', returnAll: false, limit: 5 });
			expectRequest(many, 'GET', path);
		}
	});

	it('S1.8 user get and getMany call the user routes', async () => {
		const [get] = await call({ resource: 'userV2', operation: 'get', userId: locator('U1') });
		expectRequest(get, 'GET', '/users/U1');
		const [many] = await call({ resource: 'userV2', operation: 'getMany', returnAll: false, limit: 5 });
		expectRequest(many, 'GET', '/users');
	});

	it('S1.9 deal product create posts the product line', async () => {
		const [request] = await call({
			resource: 'dealProductV2',
			operation: 'create',
			dealId: locator('D1'),
			productId: locator('PR1'),
			additionalFields: {
				price: 10,
				quantity: 2,
				discount_type: 'percentage',
				discount: 5,
				billing_frequency: 'monthly',
			},
		});
		expectRequest(request, 'POST', '/deals/D1/products', {
			body: {
				data: {
					product_id: 'PR1',
					price: 10,
					quantity: 2,
					discount_type: 'percentage',
					discount: 5,
					billing_frequency: 'monthly',
				},
			},
		});
	});

	it('S1.10 deal product list update and delete routes', async () => {
		const [many] = await call({
			resource: 'dealProductV2',
			operation: 'getMany',
			dealId: locator('D1'),
			returnAll: false,
			limit: 5,
		});
		expectRequest(many, 'GET', '/deals/D1/products');
		const [update] = await call({
			resource: 'dealProductV2',
			operation: 'update',
			dealId: locator('D1'),
			dealProductId: locator('X1'),
			updateFields: { quantity: 3 },
		});
		expectRequest(update, 'PUT', '/deals/D1/products/X1', { body: { data: { quantity: 3 } } });
		const [del] = await call({
			resource: 'dealProductV2',
			operation: 'delete',
			dealId: locator('D1'),
			dealProductId: locator('X1'),
		});
		expectRequest(del, 'DELETE', '/deals/D1/products/X1');
	});

	it('S1.11 new ID fields are locators backed by existing searches', () => {
		const wanted = {
			leadId: ['leadV2', 'searchLeadsV2'],
			pipelineId: ['pipelineV2', 'searchPipelinesV2'],
			stageId: ['stageV2', 'searchStagesV2'],
			sourceId: ['sourceV2', 'searchSourcesV2'],
			lossReasonId: ['lostReasonV2', 'searchLossReasonsV2'],
			userId: ['userV2', 'searchUsersV2'],
			dealProductId: ['dealProductV2', 'searchDealProductsV2'],
		};
		const searches = new RdStationCrm().methods.listSearch;
		for (const [name, [resource, method]] of Object.entries(wanted)) {
			const [locatorField] = props(name, resource).filter(
				(p) => JSON.stringify(p.displayOptions.show['@version']) === '[{"_cnd":{"gte":2}}]',
			);
			assert.ok(locatorField, `${resource}.${name} has no version 2 field`);
			assert.equal(locatorField.type, 'resourceLocator');
			assert.deepEqual(locatorField.modes.map((m) => m.name), ['list', 'id']);
			assert.equal(locatorField.default.mode, 'list');
			assert.equal(locatorField.modes[0].typeOptions.searchListMethod, method);
			assert.equal(typeof searches[method], 'function', method);
		}
	});

	it('S1.12 empty lead locator fails with a guiding message', async () => {
		await assert.rejects(
			call({ resource: 'leadV2', operation: 'get', leadId: locator('') }),
			(error) => {
				assert.ok(error instanceof NodeOperationError);
				assert.match(error.message, /The 'Lead' parameter is empty \[item 0\]/);
				return true;
			},
		);
	});

	it('S1.13 existing parameters keep name and type', () => {
		// O snapshot guarda cada parâmetro de origin/master com recurso, operação e faixa de versão.
		const key = (p) =>
			JSON.stringify([p.name, p.type, p.displayOptions?.show?.resource ?? null,
				p.displayOptions?.show?.operation ?? null, p.displayOptions?.show?.['@version'] ?? null]);
		const now = new Set(
			description.properties.map((p) =>
				key({ name: p.name, type: p.type, displayOptions: p.displayOptions }),
			),
		);
		for (const old of snapshot.node) {
			const probe = key({
				name: old.name,
				type: old.type,
				displayOptions: { show: { resource: old.resource ?? undefined, operation: old.operation ?? undefined, '@version': old.version ?? undefined } },
			});
			assert.ok(now.has(probe), `lost or changed: ${old.name} (${old.type}) ${old.resource}`);
		}
	});
});

describe('S3 create and update routes, products, campaigns, meetings, proposals and teams', () => {
	it('S3.1 pipeline create and update', async () => {
		const [create] = await call({ resource: 'pipelineV2', operation: 'create', name: 'Vendas', additionalFields: { order: 1 } });
		expectRequest(create, 'POST', '/pipelines', { body: { data: { name: 'Vendas', order: 1 } } });
		const [update] = await call({
			resource: 'pipelineV2',
			operation: 'update',
			pipelineId: locator('P1'),
			updateFields: { name: 'Vendas B2B' },
		});
		expectRequest(update, 'PUT', '/pipelines/P1', { body: { data: { name: 'Vendas B2B' } } });
	});

	it('S3.2 stage create and update', async () => {
		const [create] = await call({
			resource: 'stageV2',
			operation: 'create',
			pipelineId: locator('P1'),
			name: 'Proposta',
			additionalFields: { description: 'd', objective: 'o', order: 2 },
		});
		expectRequest(create, 'POST', '/pipelines/P1/stages', {
			body: { data: { name: 'Proposta', description: 'd', objective: 'o', order: 2 } },
		});
		const [update] = await call({
			resource: 'stageV2',
			operation: 'update',
			pipelineId: locator('P1'),
			stageId: locator('S2'),
			updateFields: { order: 3 },
		});
		expectRequest(update, 'PUT', '/pipelines/P1/stages/S2', { body: { data: { order: 3 } } });
	});

	it('S3.3 source and lost reason create and update', async () => {
		const [source] = await call({ resource: 'sourceV2', operation: 'create', name: 'Feira', additionalFields: { description: 'x' } });
		expectRequest(source, 'POST', '/sources', { body: { data: { name: 'Feira', description: 'x' } } });
		const [sourceUpdate] = await call({ resource: 'sourceV2', operation: 'update', sourceId: locator('S1'), updateFields: { description: 'y' } });
		expectRequest(sourceUpdate, 'PUT', '/sources/S1', { body: { data: { description: 'y' } } });
		const [reason] = await call({ resource: 'lostReasonV2', operation: 'create', name: 'Preço' });
		expectRequest(reason, 'POST', '/lost_reasons', { body: { data: { name: 'Preço' } } });
		const [reasonUpdate] = await call({ resource: 'lostReasonV2', operation: 'update', lossReasonId: locator('R1'), updateFields: { name: 'Prazo' } });
		expectRequest(reasonUpdate, 'PUT', '/lost_reasons/R1', { body: { data: { name: 'Prazo' } } });
	});

	it('S3.4 product create get list and update', async () => {
		const [create] = await call({
			resource: 'productV2',
			operation: 'create',
			name: 'Plano Pro',
			additionalFields: { description: 'd', price: 9.5, visible: true },
		});
		expectRequest(create, 'POST', '/products', {
			body: { data: { name: 'Plano Pro', description: 'd', price: 9.5, visible: true } },
		});
		const [get] = await call({ resource: 'productV2', operation: 'get', productId: locator('PR1') });
		expectRequest(get, 'GET', '/products/PR1');
		const [many] = await call({ resource: 'productV2', operation: 'getMany', returnAll: false, limit: 5 });
		expectRequest(many, 'GET', '/products');
		const [update] = await call({ resource: 'productV2', operation: 'update', productId: locator('PR1'), updateFields: { visible: false } });
		expectRequest(update, 'PUT', '/products/PR1', { body: { data: { visible: false } } });
	});

	it('S3.5 campaign create get list and update', async () => {
		const [create] = await call({ resource: 'campaignV2', operation: 'create', name: 'Black Friday', additionalFields: { description: 'd' } });
		expectRequest(create, 'POST', '/campaigns', { body: { data: { name: 'Black Friday', description: 'd' } } });
		const [get] = await call({ resource: 'campaignV2', operation: 'get', campaignId: locator('C1') });
		expectRequest(get, 'GET', '/campaigns/C1');
		const [many] = await call({ resource: 'campaignV2', operation: 'getMany', returnAll: false, limit: 5 });
		expectRequest(many, 'GET', '/campaigns');
		const [update] = await call({ resource: 'campaignV2', operation: 'update', campaignId: locator('C1'), updateFields: { name: 'BF 2026' } });
		expectRequest(update, 'PUT', '/campaigns/C1', { body: { data: { name: 'BF 2026' } } });
	});

	it('S3.6 meeting create normalizes date and contacts', async () => {
		const [create] = await call({
			resource: 'meetingV2',
			operation: 'create',
			subject: 'Demo',
			additionalFields: {
				starts_at: '2026-12-01T10:00:00Z',
				duration_minutes: 30,
				status: 'scheduled',
				contact_ids: 'c1',
			},
		});
		expectRequest(create, 'POST', '/meetings', {
			body: {
				data: {
					subject: 'Demo',
					starts_at: '2026-12-01T10:00:00.000Z',
					duration_minutes: 30,
					status: 'scheduled',
					contact_ids: ['c1'],
				},
			},
		});
		const [get] = await call({ resource: 'meetingV2', operation: 'get', meetingId: locator('M1') });
		expectRequest(get, 'GET', '/meetings/M1');
		const [many] = await call({ resource: 'meetingV2', operation: 'getMany', returnAll: false, limit: 5 });
		expectRequest(many, 'GET', '/meetings');
		const [update] = await call({ resource: 'meetingV2', operation: 'update', meetingId: locator('M1'), updateFields: { status: 'completed' } });
		expectRequest(update, 'PUT', '/meetings/M1', { body: { data: { status: 'completed' } } });
	});

	it('S3.7 proposal create list and get', async () => {
		const sections = '[{"slug":"a","type":"html","value":"x","order":1}]';
		const [create] = await call({
			resource: 'proposalV2',
			operation: 'create',
			dealId: locator('D1'),
			proposal_template_id: 'T1',
			sections,
		});
		expectRequest(create, 'POST', '/deals/D1/proposals', {
			body: { data: { proposal_template_id: 'T1', sections: [{ slug: 'a', type: 'html', value: 'x', order: 1 }] } },
		});
		const [many] = await call({ resource: 'proposalV2', operation: 'getMany', dealId: locator('D1'), returnAll: false, limit: 5 });
		expectRequest(many, 'GET', '/deals/D1/proposals');
		const [get] = await call({ resource: 'proposalV2', operation: 'get', dealId: locator('D1'), proposalId: locator('PP1') });
		expectRequest(get, 'GET', '/deals/D1/proposals/PP1');
	});

	it('S3.8 proposal sections must be a JSON list', async () => {
		for (const sections of ['{"a":1}', 'not json']) {
			let sent = false;
			await assert.rejects(
				call(
					{ resource: 'proposalV2', operation: 'create', dealId: locator('D1'), proposal_template_id: 'T1', sections },
					() => {
						sent = true;
						return {};
					},
				),
				(error) => {
					assert.ok(error instanceof NodeOperationError);
					assert.match(error.message, /Sections/);
					return true;
				},
			);
			assert.equal(sent, false, 'no request may leave before the JSON is validated');
		}
	});

	it('S3.9 team get and getMany', async () => {
		const [get] = await call({ resource: 'teamV2', operation: 'get', teamId: locator('T1') });
		expectRequest(get, 'GET', '/teams/T1');
		const [many] = await call({ resource: 'teamV2', operation: 'getMany', returnAll: false, limit: 5 });
		expectRequest(many, 'GET', '/teams');
	});

	it('S3.10 meeting campaign product and team locators', () => {
		const wanted = {
			meetingId: ['meetingV2', 'searchMeetingsV2'],
			campaignId: ['campaignV2', 'searchCampaignsV2'],
			productId: ['productV2', 'searchProductsV2'],
			teamId: ['teamV2', 'searchTeamsV2'],
			proposalId: ['proposalV2', 'searchProposalsV2'],
		};
		const searches = new RdStationCrm().methods.listSearch;
		for (const [name, [resource, method]] of Object.entries(wanted)) {
			const field = props(name, resource).find(
				(p) => JSON.stringify(p.displayOptions.show['@version']) === '[{"_cnd":{"gte":2}}]',
			);
			assert.ok(field, `${resource}.${name} has no version 2 field`);
			assert.equal(field.type, 'resourceLocator');
			assert.equal(field.modes[0].typeOptions.searchListMethod, method);
			assert.equal(typeof searches[method], 'function', method);
		}
	});
});
