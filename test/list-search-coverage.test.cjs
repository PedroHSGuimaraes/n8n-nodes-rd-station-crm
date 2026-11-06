/**
 * Fecha os achados F1-F3 e F5 do Verifier: etapas filtradas pelo funil com Resource Locator,
 * cada método do listSearch com a forma de resposta da RD, a paginação e a lista certa por campo.
 */
const { describe, it } = require('node:test');
const { assert, RdStationCrm, makeSearchContext } = require('./helpers.cjs');

const node = new RdStationCrm();
const { listSearch } = node.methods;

describe('listSearch coverage', () => {
	it('searchStages filters by the pipeline locator value', async () => {
		// O valor padrão do locator ({ mode, value: '' }) é objeto: não pode virar filtro.
		for (const [pipelineId, expected] of [
			[{ mode: 'list', value: 'p1' }, 'p1'],
			[{ mode: 'id', value: ' p2 ' }, 'p2'],
			[{ mode: 'list', value: '' }, undefined],
			['p3', 'p3'],
		]) {
			const { context, requests } = makeSearchContext({
				params: { pipelineId },
				responder: () => ({ deal_stages: [{ id: 's1', name: 'Won' }], has_more: false }),
			});
			const found = await listSearch.searchStages.call(context, '');
			assert.equal(requests[0].qs.deal_pipeline_id, expected, JSON.stringify(pipelineId));
			assert.deepEqual(found.results, [{ name: 'Won', value: 's1' }]);
		}
	});

	it('every listSearch method maps the RD response to name and value', async () => {
		const list = (key) => ({ [key]: [{ id: 'i1', name: 'Alpha', label: 'Alpha', subject: 'Alpha' }], has_more: false });
		const v2 = () => ({ data: [{ id: 'i1', name: 'Alpha' }], links: {} });
		const cases = {
			searchUsers: list('users'),
			searchTeams: list('teams'),
			searchPipelines: list('deal_pipelines'),
			searchProducts: list('products'),
			searchSources: list('deal_sources'),
			searchCampaigns: list('campaigns'),
			searchLossReasons: list('deal_lost_reasons'),
			searchTasks: list('tasks'),
			searchCustomFields: list('custom_fields'),
			searchWebhooks: { webhooks: [{ uuid: 'u1', event_type: 'crm_deal_created', url: 'https://x.test' }] },
			searchOrganizationsV2: v2(),
			searchTasksV2: v2(),
			searchCustomFieldsV2: v2(),
		};
		for (const [method, response] of Object.entries(cases)) {
			const { context } = makeSearchContext({ responder: () => response });
			const found = await listSearch[method].call(context, '');
			assert.equal(found.results.length, 1, method);
			assert.equal(found.results[0].value, method === 'searchWebhooks' ? 'u1' : 'i1', method);
			assert.ok(found.results[0].name.length > 0, method);
		}
	});

	it('listSearch pages contacts and deals with a pagination token', async () => {
		const full = Array.from({ length: 50 }, (_, n) => ({ id: `c${n}`, name: `Name ${n}` }));
		const { context, requests } = makeSearchContext({ responder: () => ({ contacts: full }) });
		const first = await listSearch.searchContacts.call(context, '');
		assert.equal(first.paginationToken, '2');
		await listSearch.searchContacts.call(context, '', '2');
		assert.equal(requests[1].qs.page, 2);

		const last = makeSearchContext({ responder: () => ({ contacts: full.slice(0, 3), has_more: false }) });
		assert.equal((await listSearch.searchContacts.call(last.context, '')).paginationToken, undefined);

		const next = makeSearchContext({
			responder: () => ({ data: [{ id: 'd1', name: 'D' }], links: { next: 'https://x/deals?page=2' } }),
		});
		assert.equal((await listSearch.searchDealsV2.call(next.context, '')).paginationToken, '2');
		const end = makeSearchContext({ responder: () => ({ data: [], links: {} }) });
		assert.equal((await listSearch.searchDealsV2.call(end.context, '')).paginationToken, undefined);
	});

	it('each guided field points to the list of its own API', () => {
		const expected = {
			contactId: ['searchContacts', 'searchContactsV2'],
			dealId: ['searchDeals', 'searchDealsV2'],
			organizationId: ['searchOrganizations', 'searchOrganizationsV2'],
			taskId: ['searchTasks', 'searchTasksV2'],
			customFieldId: ['searchCustomFields', 'searchCustomFieldsV2'],
			// Os recursos novos da v2 (rotas-novas-v2) trazem a lista própria da API v2; os da v1 seguem iguais.
			pipelineId: ['searchPipelines', 'searchPipelinesV2'],
			stageId: ['searchStages', 'searchStagesV2'],
			productId: ['searchProducts', 'searchProductsV2'],
			sourceId: ['searchSources', 'searchSourcesV2'],
			campaignId: ['searchCampaigns', 'searchCampaignsV2'],
			lossReasonId: ['searchLossReasons', 'searchLossReasonsV2'],
			teamId: ['searchTeams', 'searchTeamsV2'],
			userId: ['searchUsers', 'searchUsersV2'],
			webhookId: ['searchWebhooks', 'searchWebhooksV2'],
			leadId: ['searchLeadsV2', 'searchLeadsV2'],
			meetingId: ['searchMeetingsV2', 'searchMeetingsV2'],
			segmentId: ['searchSegmentsV2', 'searchSegmentsV2'],
			dialerCallId: ['searchDialerCallsV2', 'searchDialerCallsV2'],
			fileId: ['searchFilesV2', 'searchFilesV2'],
			proposalId: ['searchProposalsV2', 'searchProposalsV2'],
			dealProductId: ['searchDealProductsV2', 'searchDealProductsV2'],
		};
		const guided = node.description.properties.filter((p) => p.type === 'resourceLocator');
		for (const field of guided) {
			const [v1, v2] = expected[field.name];
			const isV2 = field.displayOptions.show.resource.some((r) => r.endsWith('V2'));
			assert.equal(field.modes[0].typeOptions.searchListMethod, isV2 && v2 ? v2 : v1, field.name);
		}
	});
});
