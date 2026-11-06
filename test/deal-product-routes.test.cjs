/**
 * Prova as rotas de produtos da negociação da API v1 (slices S1 e S2 do plano rotas-novas-v1).
 * Os testes chamam o `execute` real do node compilado e leem a requisição que sairia para a RD,
 * então falham se a rota, o método ou o corpo divergirem da documentação oficial da v1.
 */
const { describe, it } = require('node:test');
const { assert, runExecute } = require('./helpers.cjs');

/** Roda uma operação de Deal Product na versão 1 e devolve a requisição gravada. */
async function runDealProduct(operation, params) {
	const requests = await runExecute({
		version: 1,
		params: { resource: 'dealProduct', operation, dealId: 'd1', ...params },
	});
	assert.equal(requests.length, 1, 'uma operação faz exatamente uma requisição');
	return requests[0];
}

describe('deal product routes (v1)', () => {
	// C1: a doc manda PATCH em batch/update e só descreve id, amount e price por linha.
	it('v1 batch update sends PATCH to batch/update with only id amount and price', async () => {
		const request = await runDealProduct('update', {
			// A linha vem do editor com todos os campos preenchidos pelo padrão.
			updateProductsUi: {
				product: [
					{
						id: 'P1',
						product_id: 'PR1',
						amount: 2,
						price: 15.1,
						discount: 0,
						discount_type: 'percentage',
						recurrence: 'monthly',
						total: 0,
					},
				],
			},
		});
		assert.equal(request.method, 'PATCH');
		assert.equal(request.url, '/deals/d1/deal_products/batch/update');
		assert.deepEqual(request.body, { deal_products: [{ id: 'P1', amount: 2, price: 15.1 }] });
	});

	// C2: a doc manda DELETE em batch/destroy com a lista de objetos { id }.
	it('v1 batch remove sends DELETE to batch/destroy with deal_products ids', async () => {
		const requests = await runExecute({
			version: 1,
			params: {
				resource: 'dealProduct',
				operation: 'remove',
				dealId: 'd1',
				idsUi: { id: [{ id: 'P1' }, { id: 'P2' }] },
			},
		});
		assert.equal(requests[0].method, 'DELETE');
		assert.equal(requests[0].url, '/deals/d1/deal_products/batch/destroy');
		assert.deepEqual(requests[0].body, { deal_products: [{ id: 'P1' }, { id: 'P2' }] });
	});

	// C4: criar um produto usa POST na coleção, sem o /batch.
	it('v1 addOne posts a single deal product', async () => {
		const request = await runDealProduct('addOne', {
			product_id: 'PR1',
			amount: 3.1,
			price: 150,
			discount: 50,
			discount_type: 'value',
			recurrence: 'spare',
		});
		assert.equal(request.method, 'POST');
		assert.equal(request.url, '/deals/d1/deal_products');
		assert.deepEqual(request.body, {
			product_id: 'PR1',
			amount: 3.1,
			price: 150,
			discount: 50,
			discount_type: 'value',
			recurrence: 'spare',
		});
	});

	// C5: atualizar um produto usa PUT no id dele e leva só os campos escolhidos.
	it('v1 updateOne puts a single deal product', async () => {
		const request = await runDealProduct('updateOne', {
			dealProductId: 'DP9',
			updateOneFields: { price: 500 },
		});
		assert.equal(request.method, 'PUT');
		assert.equal(request.url, '/deals/d1/deal_products/DP9');
		assert.deepEqual(request.body, { price: 500 });
	});

	// C6: remover um produto usa DELETE no id dele, sem corpo; a RD responde 204 vazio.
	it('v1 removeOne deletes a single deal product', async () => {
		const requests = await runExecute({
			version: 1,
			params: { resource: 'dealProduct', operation: 'removeOne', dealId: 'd1', dealProductId: 'DP9' },
		});
		assert.equal(requests[0].method, 'DELETE');
		assert.equal(requests[0].url, '/deals/d1/deal_products/DP9');
		assert.ok(
			requests[0].body === undefined || Object.keys(requests[0].body).length === 0,
			'removeOne não envia corpo',
		);
	});

	// C7: ID vazio nunca vira requisição (a rota sem o ID listaria ou apagaria a coleção errada).
	it('v1 single deal product operations reject an empty id', async () => {
		for (const operation of ['updateOne', 'removeOne']) {
			await assert.rejects(
				() =>
					runExecute({
						version: 1,
						params: {
							resource: 'dealProduct',
							operation,
							dealId: 'd1',
							dealProductId: '  ',
							updateOneFields: {},
						},
					}),
				/Deal Product ID/,
				operation,
			);
		}
	});

	// C8: toda chamada nova leva timeout explícito de 30 s.
	it('v1 single deal product operations send a 30 s timeout', async () => {
		const cases = [
			[
				'addOne',
				// O n8n real sempre entrega os campos com o valor padrão; o contexto falso exige o mesmo.
				{ product_id: 'PR1', amount: 1, price: 10, discount: 0, discount_type: 'percentage', recurrence: 'monthly' },
			],
			['updateOne', { dealProductId: 'DP9', updateOneFields: { price: 1 } }],
			['removeOne', { dealProductId: 'DP9' }],
		];
		for (const [operation, params] of cases) {
			const request = await runDealProduct(operation, params);
			assert.equal(request.timeout, 30000, operation);
		}
	});
});
