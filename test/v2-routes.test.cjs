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
