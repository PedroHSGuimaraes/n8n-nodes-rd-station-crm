import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const RD_CRM_BASE_URL = 'https://crm.rdstation.com/api/v1';

type RdContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

/**
 * Make a single authenticated request to the RD Station CRM v1 API.
 * The private token is injected as a query-string param by the credential.
 */
export async function rdCrmApiRequest(
	this: RdContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		baseURL: RD_CRM_BASE_URL,
		url: endpoint,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(
			this,
			'rdStationCrmApi',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Fetch every page of a paginated RD Station CRM list endpoint.
 *
 * Handles the two response shapes the API uses:
 *  - `{ [propertyName]: [...], has_more: boolean, total: number }`
 *  - a bare array `[...]`
 *
 * @param propertyName key that holds the array in wrapped responses (e.g. "deals", "contacts").
 */
export async function rdCrmApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const returnData: any[] = [];
	const query: IDataObject = { ...qs };
	query.page = (query.page as number) || 1;
	query.limit = (query.limit as number) || 200;

	let hasMore = true;
	let guard = 0;
	const maxPages = 1000;

	while (hasMore && guard < maxPages) {
		guard += 1;
		const responseData = await rdCrmApiRequest.call(this, method, endpoint, body, query);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let items: any[];
		if (Array.isArray(responseData)) {
			items = responseData;
			hasMore = items.length === query.limit;
		} else {
			items = (responseData?.[propertyName] as unknown[]) ?? [];
			hasMore =
				responseData?.has_more === true ||
				(items.length > 0 && items.length === query.limit && responseData?.has_more === undefined);
		}

		returnData.push(...items);
		query.page = (query.page as number) + 1;

		if (!items.length) {
			break;
		}
	}

	return returnData;
}
