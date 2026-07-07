import {
	ICredentialType,
	INodeProperties,
	IAuthenticateGeneric,
} from 'n8n-workflow';

// Classe de credenciais para a API do RD Station CRM
// Esta classe gerencia a autenticação com a API do RD Station CRM usando um token privado
export class RdStationCrmApi implements ICredentialType {
	// Define o nome da credencial, que será mostrado na interface do n8n
	name = 'rdStationCrmApi';
	
	// Fornece um nome amigável para exibição na interface
	displayName = 'RD Station CRM API';
	
	// Descrição que aparecerá na interface do n8n ao selecionar esta credencial
	description = 'Credenciais para a API do RD Station CRM';
	
	// Documentação exibida na interface do n8n (URL da documentação da API)
	documentationUrl = 'https://developers.rdstation.com/en/reference';
	
	// Define as propriedades da credencial (campos que o usuário deve preencher)
	properties: INodeProperties[] = [
		{
			displayName: 'Token de API do RD Station CRM',
			name: 'apiToken',
			type: 'string',
			default: '',
			required: true,
			description: 'Token privado do usuário para autenticação nas requisições do RD Station CRM',
		},
	];

	// Método de autenticação que especifica como o token deve ser usado nas requisições
	// Neste caso, o token será adicionado como parâmetro de query string em todas as requisições
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				token: '={{$credentials.apiToken}}',
			},
		},
	};
}
