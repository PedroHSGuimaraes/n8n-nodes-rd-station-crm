/**
 * Prova as rotas de produtos da negociação da API v1 (slices S1 e S2 do plano rotas-novas-v1).
 * Os testes chamam o `execute` real do node compilado e leem a requisição que sairia para a RD,
 * então falham se a rota, o método ou o corpo divergirem da documentação oficial da v1.
 */
const { describe, it } = require('node:test');
const { NodeOperationError } = require('n8n-workflow');
const { assert, RdStationCrm, makeContext, runExecute } = require('./helpers.cjs');

/** Roda o execute inteiro e devolve o resultado do node junto com as requisições gravadas. */
async function runFull(params) {
	const { context, requests } = makeContext({ version: 1, params });
	const output = await new RdStationCrm().execute.call(context);
	return { output, requests };
}

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

	// C2 (retorno): o node devolve um item { deleted: true } depois do DELETE em lote.
	it('v1 batch remove and removeOne return deleted true', async () => {
		const batch = await runFull({
			resource: 'dealProduct', operation: 'remove', dealId: 'd1', idsUi: { id: [{ id: ' P1 ' }] },
		});
		assert.deepEqual(batch.output[0].map((item) => item.json), [{ deleted: true }]);
		// O id sai sem espaços nas pontas, como no removeOne.
		assert.deepEqual(batch.requests[0].body, { deal_products: [{ id: 'P1' }] });
		const one = await runFull({
			resource: 'dealProduct', operation: 'removeOne', dealId: 'd1', dealProductId: 'DP9',
		});
		assert.deepEqual(one.output[0].map((item) => item.json), [{ deleted: true }]);
	});

	// F9: lista vazia nunca vira DELETE; a rota apagaria nada e o node diria que apagou.
	it('v1 batch remove rejects a list with no valid id', async () => {
		for (const idsUi of [{}, { id: [] }, { id: [{ id: '' }, { id: '  ' }] }]) {
			const { context, requests } = makeContext({
				version: 1,
				params: { resource: 'dealProduct', operation: 'remove', dealId: 'd1', idsUi },
			});
			await assert.rejects(() => new RdStationCrm().execute.call(context), NodeOperationError);
			assert.equal(requests.length, 0);
		}
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

	// C7: ID vazio nunca vira requisição (a rota sem o ID apontaria para a coleção errada).
	it('v1 single deal product operations reject an empty id', async () => {
		for (const operation of ['updateOne', 'removeOne']) {
			for (const dealProductId of ['', '  ']) {
				const { context, requests } = makeContext({
					version: 1,
					params: {
						resource: 'dealProduct', operation, dealId: 'd1', dealProductId,
						updateOneFields: { price: 1 },
					},
				});
				await assert.rejects(
					() => new RdStationCrm().execute.call(context),
					(error) => error instanceof NodeOperationError && /Deal Product ID/.test(error.message),
					`${operation} com id "${dealProductId}"`,
				);
				assert.equal(requests.length, 0, 'nenhuma requisição sai antes da falha');
			}
		}
	});

	// F10: o ID entra na URL já codificado e updateOne sem campo falha antes da requisição.
	it('v1 updateOne encodes the id and rejects an empty field list', async () => {
		const request = await runDealProduct('updateOne', {
			dealProductId: '../x', updateOneFields: { price: 1 },
		});
		assert.equal(request.url, '/deals/d1/deal_products/..%2Fx');
		const { context, requests } = makeContext({
			version: 1,
			params: { resource: 'dealProduct', operation: 'updateOne', dealId: 'd1', dealProductId: 'DP9', updateOneFields: {} },
		});
		await assert.rejects(() => new RdStationCrm().execute.call(context), NodeOperationError);
		assert.equal(requests.length, 0);
	});

	// F11: addOne exige o produto e não oferece o campo Total, que o POST de um item não aceita.
	it('v1 addOne requires a product and hides total', async () => {
		const { context, requests } = makeContext({
			version: 1,
			params: {
				resource: 'dealProduct', operation: 'addOne', dealId: 'd1', product_id: '',
				amount: 1, price: 1, discount: 0, discount_type: 'percentage', recurrence: 'monthly',
			},
		});
		await assert.rejects(() => new RdStationCrm().execute.call(context), NodeOperationError);
		assert.equal(requests.length, 0);
		const shown = new RdStationCrm().description.properties.filter(
			(p) => p.name === 'total' && p.displayOptions?.show?.operation?.includes('addOne'),
		);
		assert.equal(shown.length, 0, 'o campo Total não aparece em addOne');
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

	// C3: nome e tipo de cada parâmetro de Deal Product da 2.4.0 continuam na versão 1.
	// A lista abaixo foi copiada de `origin/master` (2.4.0) antes desta mudança.
	it('v1 deal product keeps every parameter name and type of 2.4.0', () => {
		const original = [
			'operation|options', 'dealId|string', 'productsUi|fixedCollection',
			'updateProductsUi|fixedCollection', 'idsUi|fixedCollection', 'returnAll|boolean', 'limit|number',
		];
		const visibleToV1 = new RdStationCrm().description.properties.filter((p) => {
			const versions = p.displayOptions?.show?.['@version'];
			const shown = p.displayOptions?.show?.resource;
			return (versions === undefined || versions.includes(1)) && shown?.includes('dealProduct');
		});
		const available = new Set(visibleToV1.map((p) => `${p.name}|${p.type}`));
		for (const pair of original) assert.ok(available.has(pair), `version 1 lost ${pair}`);
	});
});
