import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RdStationCrmApi implements ICredentialType {
	name = 'rdStationCrmApi';

	displayName = 'RD Station CRM API';

	documentationUrl = 'https://developers.rdstation.com/reference/crm-v1-token';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your private RD Station CRM user token. Find it in RD Station CRM under Settings → Integrations → API. It is sent as the "token" query-string parameter on every request.',
		},
	];

	// The token travels as a query-string parameter, as required by the RD Station CRM v1 API.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				token: '={{$credentials.apiToken}}',
			},
		},
	};

	// Validates the token against the lightweight /token/check endpoint.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://crm.rdstation.com/api/v1',
			url: '/token/check',
		},
	};
}
