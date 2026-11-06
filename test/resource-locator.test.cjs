/**
 * Prova os campos de ID guiados da versão 2 do node (slice S3): cada campo de ID vira um
 * Resource Locator com lista pesquisável e modo ID, e o execute lê o valor certo nos dois modos.
 */
const { describe, it } = require('node:test');
const { NodeApiError, NodeOperationError } = require('n8n-workflow');
const { assert, RdStationCrm, runExecute } = require('./helpers.cjs');
const cases = require('./fixtures/v1-requests.json');

const description = new RdStationCrm().description;

/** Modo `list` do n8n usado pelo editor, e modo `id` para colar o ID. */
const locator = (value, mode = 'list') => ({ mode, value });

/** Acha a propriedade de um campo de ID para um recurso, operação e versão do node. */
function findField(item, versionTag) {
	return description.properties.find((p) => {
		if (p.name !== item.idParam) return false;
		const show = p.displayOptions?.show ?? {};
		if (!show.resource?.includes(item.resource)) return false;
		if (show.operation && !show.operation.includes(item.operation)) return false;
		return JSON.stringify(show['@version']) === JSON.stringify(versionTag);
	});
}

const V2_ONLY = [{ _cnd: { gte: 2 } }];

describe('version 2 resource locators', () => {
	it('node defaults to version 2 and still lists version 1', () => {
		assert.deepEqual(description.version, [1, 2]);
		assert.equal(description.defaultVersion, 2);
	});

	it('version 2 exposes every guided ID field as a resourceLocator', () => {
		const names = new Set();
		for (const item of cases) {
			const guided = findField(item, V2_ONLY);
			assert.ok(guided, `${item.resource}.${item.operation} has no version 2 ${item.idParam}`);
			names.add(item.idParam);
			assert.equal(guided.type, 'resourceLocator', `${item.resource}.${item.idParam}`);
			assert.equal(guided.default.mode, 'list');
			const [list, id] = guided.modes;
			assert.equal(list.name, 'list');
			assert.equal(list.type, 'list');
			assert.equal(list.typeOptions.searchable, true);
			assert.equal(typeof list.typeOptions.searchListMethod, 'string');
			assert.equal(id.name, 'id');
			assert.equal(id.type, 'string');
			// A versão 1 mantém o mesmo nome em texto, só visível para @version 1.
			const legacy = findField(item, [1]);
			assert.ok(legacy, `${item.resource}.${item.idParam} lost its version 1 field`);
			assert.equal(legacy.type, 'string');
		}
		// 14 nomes de ID principais, mais os dealId de Note, Task e Deal Product.
		const wanted = [
			'contactId', 'dealId', 'organizationId', 'taskId', 'pipelineId', 'stageId', 'productId',
			'sourceId', 'campaignId', 'lossReasonId', 'customFieldId', 'teamId', 'userId', 'webhookId',
		];
		assert.deepEqual([...names].sort(), wanted.sort());
	});

	it('every searchListMethod exists in listSearch', () => {
		const modes = description.properties
			.filter((p) => p.type === 'resourceLocator')
			.map((p) => p.modes[0].typeOptions.searchListMethod);
		assert.ok(modes.length >= 20, `expected the guided fields, found ${modes.length}`);
		const methods = new RdStationCrm().methods.listSearch;
		for (const method of modes) {
			assert.equal(typeof methods[method], 'function', `listSearch.${method} is missing`);
		}
	});

	it('version 2 list mode reads the contact ID', async () => {
		const [request] = await runExecute({
			version: 2,
			params: { resource: 'contact', operation: 'get', contactId: locator('abc123') },
		});
		assert.equal(request.method, 'GET');
		assert.equal(request.url, '/contacts/abc123');
	});

	it('version 2 id mode trims the pasted ID', async () => {
		const [request] = await runExecute({
			version: 2,
			params: { resource: 'contact', operation: 'get', contactId: locator(' abc123 ', 'id') },
		});
		assert.equal(request.url, '/contacts/abc123');
	});

	it('version 2 empty locator fails with a guiding message', async () => {
		await assert.rejects(
			runExecute({
				version: 2,
				params: { resource: 'contact', operation: 'get', contactId: locator('') },
			}),
			(error) => {
				assert.ok(error instanceof NodeOperationError);
				assert.match(error.message, /The 'Contact' parameter is empty \[item 0\]/);
				assert.equal(error.description, 'Choose a contact from the list or paste its ID');
				return true;
			},
		);
	});

	it('every guided field reads its locator value in execute', async () => {
		for (const item of cases) {
			const [request] = await runExecute({
				version: 2,
				params: {
					resource: item.resource,
					operation: item.operation,
					[item.idParam]: locator('ID1'),
					...item.extra,
				},
			});
			const { timeout, ...sent } = request;
			assert.ok(timeout > 0);
			assert.deepEqual(
				JSON.parse(JSON.stringify(sent)),
				item.expected,
				`${item.resource}.${item.operation} ${item.idParam}`,
			);
		}
	});

	it('a 401 from RD becomes a NodeApiError', async () => {
		const unauthorized = () => {
			throw Object.assign(new Error('Unauthorized'), { httpCode: '401' });
		};
		for (const [version, resource, idParam, value] of [
			[1, 'contact', 'contactId', 'abc123'],
			[2, 'contact', 'contactId', locator('abc123')],
			[2, 'contactV2', 'contactId', locator('abc123')],
		]) {
			await assert.rejects(
				runExecute({
					version,
					params: { resource, operation: 'get', [idParam]: value },
					responder: unauthorized,
				}),
				(error) => error instanceof NodeApiError,
				`version ${version} ${resource}`,
			);
		}
	});
});
