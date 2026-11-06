/**
 * Utilidades de teste compartilhadas: um contexto falso de execução do n8n que grava
 * cada requisição HTTP em vez de sair para a rede. Os testes chamam o `execute` real do
 * node compilado em `dist`, então provam o que o n8n realmente executa.
 */
const assert = require('node:assert/strict');
const { RdStationCrm } = require('../dist/nodes/RdStationCrm/RdStationCrm.node');

/**
 * Monta o contexto falso. `params` simula os valores salvos no workflow;
 * `responder` devolve (ou lança) a resposta da RD para cada requisição.
 */
function makeContext({ version = 2, params, responder = () => ({}), binary = {} }) {
	const requests = [];
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({
			name: 'RD Station CRM',
			type: 'n8n-nodes-rd-station-crm.rdStationCrm',
			typeVersion: version,
		}),
		continueOnFail: () => false,
		// Imita o n8n: parâmetro ausente sem valor padrão é erro.
		getNodeParameter: (name, _i, fallback) => {
			if (Object.prototype.hasOwnProperty.call(params, name)) return params[name];
			if (fallback !== undefined) return fallback;
			throw new Error(`Could not get parameter "${name}"`);
		},
		helpers: {
			httpRequestWithAuthentication: async function (credential, options) {
				requests.push({
					cred: credential,
					method: options.method,
					baseURL: options.baseURL,
					url: options.url,
					qs: options.qs,
					body: options.body,
					timeout: options.timeout,
					headers: options.headers,
				});
				return responder(options);
			},
			// Dados binários do item (anexos): `binary` mapeia o nome da propriedade ao arquivo.
			assertBinaryData: (_i, name) => {
				if (!binary[name]) throw new Error(`No binary data property "${name}" exists on item!`);
				return { fileName: binary[name].fileName, mimeType: binary[name].mimeType };
			},
			getBinaryDataBuffer: async (_i, name) => binary[name].buffer,
			constructExecutionMetaData: (data) => data,
			returnJsonArray: (items) => items.map((json) => ({ json })),
		},
	};
	return { context, requests };
}

/** Roda o execute do node e devolve as requisições feitas à RD. */
async function runExecute({ version, params, responder, binary }) {
	const { context, requests } = makeContext({ version, params, responder, binary });
	await new RdStationCrm().execute.call(context);
	return requests;
}

/** Contexto do `listSearch`/`loadOptions`: só precisa do http e do nó. */
function makeSearchContext({ params = {}, responder = () => ({}) } = {}) {
	const { context, requests } = makeContext({ version: 2, params, responder });
	return { context, requests };
}

module.exports = { assert, RdStationCrm, makeContext, runExecute, makeSearchContext };
