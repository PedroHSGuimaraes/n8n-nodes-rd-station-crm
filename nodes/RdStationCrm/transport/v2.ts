import { randomBytes } from 'node:crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { REQUEST_TIMEOUT_MS } from './index';

export const RD_CRM_V2_BASE_URL = 'https://api.rd.services/crm/v2';

// O contexto de hook entra para o trigger OAuth2 criar e apagar webhooks pela API v2.
type RdV2Context = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions;

/**
 * Make a single authenticated request to the RD Station CRM v2 API (OAuth2).
 * Request bodies are wrapped in a JSON:API `{ data: ... }` envelope.
 */
export async function rdCrmV2Request(
	this: RdV2Context,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		baseURL: RD_CRM_V2_BASE_URL,
		url: endpoint,
		qs,
		json: true,
		// Sem timeout uma RD travada prende a execução do workflow; 30 s cobre as respostas normais da API.
		timeout: REQUEST_TIMEOUT_MS,
	};

	if (Object.keys(body).length) {
		options.body = { data: body };
	}
	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'rdStationCrmOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Fetch every page of a v2 list endpoint by following `links.next` until it is absent.
 * Each `links.next` URL already carries the active filter/sort/page params.
 */
export async function rdCrmV2RequestAllItems(
	this: RdV2Context,
	endpoint: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let response = await rdCrmV2Request.call(this, 'GET', endpoint, {}, qs);
	returnData.push(...((response?.data as IDataObject[]) ?? []));

	let next = (response?.links as IDataObject | undefined)?.next as string | undefined;
	let guard = 0;
	const maxPages = 1000;

	while (next && guard < maxPages) {
		guard += 1;
		// Re-issue the same endpoint with the next page's query params.
		const parsed = new URL(next);
		const nextQs: IDataObject = {};
		parsed.searchParams.forEach((value, key) => {
			nextQs[key] = value;
		});
		response = await rdCrmV2Request.call(this, 'GET', endpoint, {}, nextQs);
		returnData.push(...((response?.data as IDataObject[]) ?? []));
		next = (response?.links as IDataObject | undefined)?.next as string | undefined;
	}

	return returnData;
}

/**
 * Monta um corpo `multipart/form-data` com um único arquivo.
 * O boundary é aleatório para nunca coincidir com o conteúdo do arquivo; aspas e quebras de linha no
 * nome do arquivo são trocadas porque fechariam o cabeçalho `Content-Disposition` antes da hora.
 */
export function buildMultipart(
	field: string,
	fileName: string,
	mimeType: string,
	content: Buffer,
): { body: Buffer; contentType: string } {
	const boundary = `----n8nrdcrm${randomBytes(12).toString('hex')}`;
	const safeName = fileName.replace(/"/g, '%22').replace(/[\r\n]/g, ' ');
	const head = Buffer.from(
		`--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="${safeName}"\r\n` +
			`Content-Type: ${mimeType}\r\n\r\n`,
		'utf8',
	);
	const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
	return {
		body: Buffer.concat([head, content, tail]),
		contentType: `multipart/form-data; boundary=${boundary}`,
	};
}

/**
 * Envia um arquivo à API v2 em `multipart/form-data` (anexos da negociação).
 * Fica separado do `rdCrmV2Request` porque este embrulha o corpo em `{ data }` JSON; aqui o corpo já vem
 * pronto em Buffer e o `Content-Type` com o boundary segue no cabeçalho.
 */
export async function rdCrmV2Multipart(
	this: RdV2Context,
	endpoint: string,
	body: Buffer,
	contentType: string,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		baseURL: RD_CRM_V2_BASE_URL,
		url: endpoint,
		body,
		headers: { 'Content-Type': contentType },
		// Mesmo teto de 30 s das outras rotas: um arquivo grande não deve prender o workflow para sempre.
		timeout: REQUEST_TIMEOUT_MS,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'rdStationCrmOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
