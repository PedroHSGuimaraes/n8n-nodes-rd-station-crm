/**
 * Prova os campos novos graváveis da API v1 (slice S3 do plano rotas-novas-v1):
 * `legal_bases` no contato e `distribution_settings` na negociação.
 * Os corpos esperados vêm das páginas oficiais crm-v1-create-contact, crm-v1-update-contact
 * e crm-v1-create-deal; sem campo novo o corpo precisa ser o da 2.4.0.
 */
const { describe, it } = require('node:test');
const { assert, runExecute } = require('./helpers.cjs');

/** Uma base legal como o editor a entrega (campos de texto livre, pois a doc v1 só dá exemplos). */
const legalBase = { category: 'data_processing', type: 'consent', status: 'granted' };

describe('new writable fields (v1)', () => {
	// C9: a base legal vai dentro de `contact`, no create e no update.
	it('v1 contact sends legal_bases on create and update', async () => {
		const [create] = await runExecute({
			version: 1,
			params: {
				resource: 'contact',
				operation: 'create',
				name: 'Maria',
				additionalFields: {},
				legalBasesUi: { legalBase: [legalBase] },
			},
		});
		assert.equal(create.url, '/contacts');
		assert.deepEqual(create.body.contact.legal_bases, [legalBase]);

		const [update] = await runExecute({
			version: 1,
			params: {
				resource: 'contact',
				operation: 'update',
				contactId: 'c1',
				updateFields: {},
				legalBasesUi: { legalBase: [legalBase] },
			},
		});
		assert.equal(update.url, '/contacts/c1');
		assert.deepEqual(update.body.contact.legal_bases, [legalBase]);
	});

	// C10: a doc v1 põe `distribution_settings.owner` na raiz do corpo, ao lado de `deal`.
	it('v1 deal create sends distribution_settings owner', async () => {
		const [request] = await runExecute({
			version: 1,
			params: {
				resource: 'deal',
				operation: 'create',
				name: 'Negócio',
				dealStageId: 's1',
				additionalFields: {
					distributionOwnerType: 'team',
					distributionOwnerId: 'T1',
					distributionOwnerEmail: 'a@b.com',
				},
			},
		});
		assert.equal(request.url, '/deals');
		assert.deepEqual(request.body.distribution_settings, {
			owner: { type: 'team', id: 'T1', email: 'a@b.com' },
		});
	});

	// C11: sem campo novo nada muda no corpo (workflows salvos enviam a mesma requisição).
	it('v1 bodies stay unchanged without the new fields', async () => {
		const [contact] = await runExecute({
			version: 1,
			params: { resource: 'contact', operation: 'create', name: 'Maria', additionalFields: {} },
		});
		assert.deepEqual(contact.body, { contact: { name: 'Maria' } });

		const [deal] = await runExecute({
			version: 1,
			params: {
				resource: 'deal',
				operation: 'create',
				name: 'Negócio',
				dealStageId: 's1',
				additionalFields: {},
			},
		});
		assert.deepEqual(deal.body, { deal: { name: 'Negócio', deal_stage_id: 's1' } });
	});
});
