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
			['searchContactsV2', v2, (qs) => qs.filter === 'name:~ana'],
			['searchDealsV2', v2, (qs) => qs.filter === 'name:~ana'],
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

describe('listSearch RDQL and tasks', () => {
	it('listSearch quotes RDQL text that has spaces', async () => {
		const { context, requests } = makeSearchContext({
			responder: () => ({ data: [], links: {} }),
		});
		await listSearch.searchContactsV2.call(context, 'Ana Lima');
		assert.equal(requests[0].qs.filter, 'name:~"Ana Lima"');
		// Aspas dentro do texto sairiam do valor e quebrariam a consulta: são removidas.
		await listSearch.searchDealsV2.call(context, 'Ana "X" Lima');
		assert.equal(requests[1].qs.filter, 'name:~"Ana X Lima"');
	});

	it('listSearch sends no RDQL filter for blank text', async () => {
		const { context, requests } = makeSearchContext({ responder: () => ({ data: [], links: {} }) });
		for (const blank of ['   ', '""', '"']) {
			await listSearch.searchContactsV2.call(context, blank);
		}
		for (const request of requests) {
			assert.equal(request.qs.filter, undefined);
		}
	});

	it('listSearch pages tasks one page at a time', async () => {
		const full = Array.from({ length: 50 }, (_, n) => ({ id: `t${n}`, subject: `Call ${n}`, name: `Call ${n}` }));
		const v1 = makeSearchContext({ responder: () => ({ tasks: full }) });
		const first = await listSearch.searchTasks.call(v1.context, 'call 7');
		assert.equal(v1.requests.length, 1);
		assert.equal(v1.requests[0].qs.page, 1);
		assert.equal(v1.requests[0].qs.limit, 50);
		assert.deepEqual(first.results, [{ name: 'Call 7', value: 't7' }]);
		assert.equal(first.paginationToken, '2');
		await listSearch.searchTasks.call(v1.context, '', '2');
		assert.equal(v1.requests[1].qs.page, 2);

		const v2 = makeSearchContext({
			responder: () => ({ data: [{ id: 'k1', name: 'Visit' }], links: { next: 'https://x/tasks?page=2' } }),
		});
		const found = await listSearch.searchTasksV2.call(v2.context, 'vis');
		assert.equal(v2.requests.length, 1);
		assert.equal(v2.requests[0].qs.filter, undefined);
		assert.deepEqual(found.results, [{ name: 'Visit', value: 'k1' }]);
		assert.equal(found.paginationToken, '2');
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
