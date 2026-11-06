/** Prova o trigger (C19): erro ao remover webhook é registrado, não engolido. */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { RdStationCrmTrigger } = require('../dist/nodes/RdStationCrmTrigger/RdStationCrmTrigger.node');

describe('trigger', () => {
	it('trigger delete logs a failed removal and keeps going', async () => {
		const deleted = [];
		const warnings = [];
		const staticData = {
			webhooks: [
				{ id: 'w-1', event: 'crm_deal_created' },
				{ id: 'w-2', event: 'crm_deal_updated' },
			],
		};
		const context = {
			getNode: () => ({ name: 'RD Station CRM Trigger', type: 'trigger', typeVersion: 1 }),
			// O trigger agora pergunta a autenticação; sem o parâmetro vale o token da API v1 (padrão).
			getNodeParameter: (_name, fallback) => fallback,
			getWorkflowStaticData: () => staticData,
			logger: { warn: (message) => warnings.push(String(message)) },
			helpers: {
				httpRequestWithAuthentication: async (_credential, options) => {
					deleted.push(options.url);
					// O primeiro webhook falha (já foi apagado na RD); o segundo precisa ser tentado.
					if (options.url === '/webhooks/w-1') throw new Error('not found');
					return {};
				},
			},
		};
		const hooks = new RdStationCrmTrigger().webhookMethods.default;
		assert.equal(await hooks.delete.call(context), true);
		assert.deepEqual(deleted, ['/webhooks/w-1', '/webhooks/w-2']);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0], /w-1/);
		assert.equal('webhooks' in staticData, false);
	});
});
