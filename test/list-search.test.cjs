/**
 * Prova o `listSearch` dos Resource Locators (slice S3): a lista pesquisável do editor
 * reaproveita as rotas de listagem da RD e devolve `{ results: [{ name, value }] }`.
 */
const { describe, it } = require('node:test');
const { NodeApiError } = require('n8n-workflow');
const { assert, RdStationCrm, makeSearchContext } = require('./helpers.cjs');

const { listSearch } = new RdStationCrm().methods;

describe('listSearch', () => {
	it('listSearch filters by the typed text', async () => {
		const { context } = makeSearchContext({
			responder: () => ({
				organizations: [
					{ id: 'o1', name: 'Ana Souza' },
					{ id: 'o2', name: 'Ânâ Lima' },
					{ id: 'o3', name: 'João Silva' },
				],
				has_more: false,
			}),
		});
		const found = await listSearch.searchOrganizations.call(context, 'ana');
		assert.deepEqual(found.results, [
			{ name: 'Ana Souza', value: 'o1' },
			{ name: 'Ânâ Lima', value: 'o2' },
		]);
		const everything = await listSearch.searchOrganizations.call(context, '');
		assert.equal(everything.results.length, 3);
	});

	it('listSearch sends the search text to RD where the route filters', async () => {
		const v1 = (key) => () => ({ [key]: [{ id: 'x1', name: 'Ana' }], has_more: false });
		const v2 = () => ({ data: [{ id: 'x1', name: 'Ana' }], links: {} });
		const cases = [
			['searchContacts', v1('contacts'), (qs) => qs.q === 'ana'],
			['searchDeals', v1('deals'), (qs) => qs.name === 'ana'],
			['searchContactsV2', v2, (qs) => qs.filter === 'name:ana'],
			['searchDealsV2', v2, (qs) => qs.filter === 'name:ana'],
		];
		for (const [method, responder, sentFilter] of cases) {
			const { context, requests } = makeSearchContext({ responder });
			const found = await listSearch[method].call(context, 'ana');
			assert.ok(requests.length >= 1, method);
			assert.ok(sentFilter(requests[0].qs ?? {}), `${method} must send the text to RD`);
			assert.deepEqual(found.results, [{ name: 'Ana', value: 'x1' }], method);
		}
	});
});

describe('listSearch errors', () => {
	it('a 401 from RD becomes a NodeApiError in listSearch', async () => {
		const { context } = makeSearchContext({
			responder: () => {
				throw Object.assign(new Error('Unauthorized'), { httpCode: '401' });
			},
		});
		await assert.rejects(
			listSearch.searchOrganizations.call(context, 'ana'),
			(error) => error instanceof NodeApiError,
		);
	});
});
