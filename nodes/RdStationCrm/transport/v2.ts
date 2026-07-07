import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const RD_CRM_V2_BASE_URL = 'https://api.rd.services/crm/v2';

type RdV2Context = IExecuteFunctions | ILoadOptionsFunctions;

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
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		baseURL: RD_CRM_V2_BASE_URL,
		url: endpoint,
		qs,
		json: true,
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
): Promise<any[]> {
	const returnData: any[] = [];
	let response = await rdCrmV2Request.call(this, 'GET', endpoint, {}, qs);
	returnData.push(...((response?.data as unknown[]) ?? []));

	let next = response?.links?.next as string | undefined;
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
		returnData.push(...((response?.data as unknown[]) ?? []));
		next = response?.links?.next as string | undefined;
	}

	return returnData;
}
