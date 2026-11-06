/**
 * Prova os campos novos graváveis da API v2 (slice S4 do plano rotas-novas-v1).
 * Os formatos vêm dos schemas das páginas oficiais crm-v2-create-contact, crm-v2-create-custom-field,
 * crm-v2-create-deal e crm-v2-create-organization. A v2 envia o corpo dentro de `{ data: ... }`.
 */
const { describe, it } = require('node:test');
const { assert, runExecute } = require('./helpers.cjs');

/** Roda uma operação do node e devolve o `data` da única requisição feita. */
async function dataOf(params) {
	const requests = await runExecute({ version: 2, params });
	assert.equal(requests.length, 1);
	return requests[0].body.data;
}

const legalBase = { category: 'communications', type: 'consent', status: 'granted' };

describe('new writable fields (v2)', () => {
	// C12: perfis sociais e bases legais do contato, no create e no update.
	it('v2 contact sends social_profiles and legal_bases', async () => {
		const extra = {
			socialProfilesUi: { profile: [{ type: 'linkedin', username: 'maria' }] },
			legalBasesUi: { legalBase: [legalBase] },
		};
		const created = await dataOf({
			resource: 'contactV2', operation: 'create', name: 'Maria', additionalFields: extra,
		});
		assert.deepEqual(created.social_profiles, [{ type: 'linkedin', username: 'maria' }]);
		assert.deepEqual(created.legal_bases, [legalBase]);
		const updated = await dataOf({
			resource: 'contactV2', operation: 'update', contactId: 'c1', updateFields: extra,
		});
		assert.deepEqual(updated.social_profiles, [{ type: 'linkedin', username: 'maria' }]);
		assert.deepEqual(updated.legal_bases, [legalBase]);
	});

	// C13: escopo por produto do campo personalizado.
	it('v2 custom field sends product scope fields', async () => {
		const data = await dataOf({
			resource: 'customFieldV2', operation: 'create', name: 'Garantia', entity: 'product', type: 'text',
			additionalFields: {
				application_scope: 'selected',
				product_ids: 'P1, P2',
				calculation_action: 'add',
				editable_on_deal: true,
			},
		});
		assert.equal(data.application_scope, 'selected');
		assert.deepEqual(data.product_ids, ['P1', 'P2']);
		assert.equal(data.calculation_action, 'add');
		assert.equal(data.editable_on_deal, true);
		// `false` também é valor válido e precisa seguir no corpo; o update usa o mesmo construtor.
		const updated = await dataOf({
			resource: 'customFieldV2', operation: 'update', customFieldId: 'cf1',
			updateFields: { editable_on_deal: false, product_ids: ['P3'] },
		});
		assert.equal(updated.editable_on_deal, false);
		// Uma expressão pode devolver lista; ela segue como lista de IDs.
		assert.deepEqual(updated.product_ids, ['P3']);
	});

	// C14: regras de exibição e de obrigatoriedade.
	it('v2 custom field sends display and required rules', async () => {
		const rule = { property: 'deal_pipeline_id', value: 'PL1', always: false };
		const data = await dataOf({
			resource: 'customFieldV2', operation: 'update', customFieldId: 'cf1',
			updateFields: {
				displayRulesUi: { rule: [rule] },
				requiredRulesUi: { rule: [{ ...rule, always: true }] },
			},
		});
		assert.deepEqual(data.display_rules, [rule]);
		assert.deepEqual(data.required_rules, [{ ...rule, always: true }]);
		const created = await dataOf({
			resource: 'customFieldV2', operation: 'create', name: 'F', entity: 'deal', type: 'text',
			additionalFields: { displayRulesUi: { rule: [rule] } },
		});
		assert.deepEqual(created.display_rules, [rule]);
	});

	// C15: distribuição da negociação.
	it('v2 deal sends distribution_settings', async () => {
		const data = await dataOf({
			resource: 'dealV2', operation: 'create', name: 'N', stage_id: 'S1',
			additionalFields: {
				distribution_stage_id: 'S1',
				distribution_rule_type: 'user',
				distribution_rule_id: 'U1',
			},
		});
		assert.deepEqual(data.distribution_settings, { stage_id: 'S1', rule: { type: 'user', id: 'U1' } });
		// Update e preenchimento parcial: só o que foi preenchido segue.
		const updated = await dataOf({
			resource: 'dealV2', operation: 'update', dealId: 'd1',
			updateFields: { distribution_stage_id: 'S2' },
		});
		assert.deepEqual(updated.distribution_settings, { stage_id: 'S2' });
	});

	// C16: endereço e seguidores da empresa.
	it('v2 organization sends address and follower_ids', async () => {
		const data = await dataOf({
			resource: 'organizationV2', operation: 'create', name: 'Acme', customFieldsUi: {},
			additionalFields: {
				address_line: 'Rua A 1',
				address_latitude: '-23.5',
				address_longitude: '-46.6',
				follower_ids: 'U1, U2',
			},
		});
		assert.deepEqual(data.address, { line: 'Rua A 1', latitude: '-23.5', longitude: '-46.6' });
		assert.deepEqual(data.follower_ids, ['U1', 'U2']);
		// Update com só uma linha de endereço; e lista vinda de expressão (array) não quebra.
		const updated = await dataOf({
			resource: 'organizationV2', operation: 'update', organizationId: 'o1', customFieldsUi: {},
			updateFields: { address_line: 'Rua B 2', follower_ids: ['U3'] },
		});
		assert.deepEqual(updated.address, { line: 'Rua B 2' });
		assert.deepEqual(updated.follower_ids, ['U3']);
	});

	// C17: sem campo novo o corpo é o da 2.4.0.
	it('v2 bodies stay unchanged without the new fields', async () => {
		const contact = await dataOf({ resource: 'contactV2', operation: 'create', name: 'Maria', additionalFields: {} });
		assert.deepEqual(contact, { name: 'Maria' });
		const field = await dataOf({
			resource: 'customFieldV2', operation: 'create', name: 'F', entity: 'deal', type: 'text', additionalFields: {},
		});
		assert.deepEqual(field, { name: 'F', entity: 'deal', type: 'text' });
		const deal = await dataOf({
			resource: 'dealV2', operation: 'create', name: 'N', stage_id: 'S1', additionalFields: {},
		});
		assert.deepEqual(deal, { name: 'N', stage_id: 'S1' });
		const org = await dataOf({
			resource: 'organizationV2', operation: 'create', name: 'Acme', additionalFields: {}, customFieldsUi: {},
		});
		assert.deepEqual(org, { name: 'Acme' });
	});
});
