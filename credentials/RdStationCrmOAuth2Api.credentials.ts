import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

// OAuth2 credential for the RD Station CRM API v2.
// RD Station uses two hosts: authorization on accounts.rdstation.com,
// token/refresh on api.rd.services. Client credentials go in the request body
// (not HTTP Basic), and there are no scopes. n8n's built-in OAuth2 handles the
// rolling refresh-token rotation automatically.
export class RdStationCrmOAuth2Api implements ICredentialType {
	name = 'rdStationCrmOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'RD Station CRM OAuth2 API';

	documentationUrl = 'https://developers.rdstation.com/reference/crm-v2-authentication';

	icon = { light: 'file:rdStationCrm.svg', dark: 'file:rdStationCrm.dark.svg' } as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://accounts.rdstation.com/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.rd.services/oauth2/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.rd.services/crm/v2',
			url: '/users',
			qs: { 'page[size]': 1 },
		},
	};
}
