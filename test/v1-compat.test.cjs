/**
 * Prova que a versão 1 do node continua igual à 2.3.2 (slice S2, decisão AD-003):
 * workflows salvos guardam typeVersion 1 e campos de ID em texto, e a requisição
 * enviada à RD não pode mudar.
 */
const { describe, it } = require('node:test');
const { assert, RdStationCrm, runExecute } = require('./helpers.cjs');
const recorded = require('./fixtures/v1-requests.json');
const v1Parameters = require('./fixtures/v1-parameters.json');

/** Lê o `@version` de uma propriedade: lista de versões (ex.: [1]) ou ausente. */
function versionsOf(property) {
	return property.displayOptions?.show?.['@version'];
}

describe('version 1', () => {
	it('version 1 contact get calls GET /contacts/abc123', async () => {
		const [request] = await runExecute({
			version: 1,
			params: { resource: 'contact', operation: 'get', contactId: 'abc123' },
		});
		assert.equal(request.method, 'GET');
		assert.equal(request.baseURL, 'https://crm.rdstation.com/api/v1');
		assert.equal(request.url, '/contacts/abc123');
		assert.equal(request.cred, 'rdStationCrmApi');
	});

	it('version 1 deal moveToStage calls PUT /deals/d1', async () => {
		const [request] = await runExecute({
			version: 1,
			params: { resource: 'deal', operation: 'moveToStage', dealId: 'd1', dealStageId: 's9' },
		});
		assert.equal(request.method, 'PUT');
		assert.equal(request.url, '/deals/d1');
		assert.deepEqual(request.body, { deal_stage_id: 's9' });
	});

	it('version 1 replays every request recorded from 2.3.2', async () => {
		for (const item of recorded) {
			const [request] = await runExecute({
				version: 1,
				params: { resource: item.resource, operation: item.operation, [item.idParam]: 'ID1', ...item.extra },
			});
			const { timeout, ...sent } = request;
			assert.ok(timeout > 0, `${item.resource}.${item.operation} needs an explicit timeout`);
			assert.deepEqual(
				JSON.parse(JSON.stringify(sent)),
				item.expected,
				`${item.resource}.${item.operation}`,
			);
		}
	});

	it('version 1 keeps every parameter name and type of 2.3.2', () => {
		const { properties } = new RdStationCrm().description;
		// Campo que a versão 1 enxerga: sem `@version` ou com a lista contendo 1.
		const visibleToV1 = properties.filter((p) => {
			const versions = versionsOf(p);
			return versions === undefined || versions.includes(1);
		});
		const available = new Set(visibleToV1.map((p) => `${p.name}|${p.type}`));
		assert.equal(v1Parameters.pairs.length, 52);
		for (const pair of v1Parameters.pairs) {
			assert.ok(available.has(pair), `version 1 lost ${pair}`);
		}
	});
});
