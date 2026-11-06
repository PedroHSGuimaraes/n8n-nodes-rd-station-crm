/**
 * Campos de ID guiados (versão 2 do node).
 *
 * Por que existe: na versão 1 a pessoa digita à mão o ID de contato, negócio, funil etc.
 * A versão 2 troca esses campos por Resource Locator (lista pesquisável da conta + modo ID),
 * como manda a UX guideline do n8n. A troca é feita aqui, em um único lugar, sobre as
 * propriedades que os arquivos de `actions/` já declaram, para não duplicar 20 definições.
 *
 * Compatibilidade (AD-003): cada campo mantém o MESMO `name`. A cópia em texto fica visível só
 * para `@version` 1, e a cópia Resource Locator só para `@version` 2 ou maior. Workflows salvos
 * guardam typeVersion 1 e continuam lendo texto.
 */
import type {
	DisplayCondition,
	IDisplayOptions,
	IExecuteFunctions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** Como cada campo de ID aparece na tela e qual lista alimenta a busca dele. */
interface IdFieldSpec {
	/** Nome mostrado ao usuário, em Title Case (UX guideline). */
	noun: string;
	/** Método do `listSearch` para a API v1 (token) — e para a v2 quando não há versão própria. */
	search: string;
	/** Método do `listSearch` para a API v2 (OAuth2), quando a lista da v2 é diferente. */
	searchV2?: string;
	/** Exemplo de ID colado no modo "By ID". */
	example: string;
}

/**
 * Tabela dos 14 campos de ID principais. A chave é o `name` do parâmetro, igual nas duas versões.
 * Só vira Resource Locator o parâmetro de topo do tipo texto; os que já são dropdown
 * (`options` com `loadOptionsMethod`) ficam como estão, porque já são guiados.
 */
export const ID_FIELDS: Record<string, IdFieldSpec> = {
	campaignId: { noun: 'Campaign', search: 'searchCampaigns', searchV2: 'searchCampaignsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	contactId: { noun: 'Contact', search: 'searchContacts', searchV2: 'searchContactsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	customFieldId: { noun: 'Custom Field', search: 'searchCustomFields', searchV2: 'searchCustomFieldsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	dealId: { noun: 'Deal', search: 'searchDeals', searchV2: 'searchDealsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	lossReasonId: { noun: 'Loss Reason', search: 'searchLossReasons', searchV2: 'searchLossReasonsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	organizationId: { noun: 'Organization', search: 'searchOrganizations', searchV2: 'searchOrganizationsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	pipelineId: { noun: 'Pipeline', search: 'searchPipelines', searchV2: 'searchPipelinesV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	productId: { noun: 'Product', search: 'searchProducts', searchV2: 'searchProductsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	sourceId: { noun: 'Source', search: 'searchSources', searchV2: 'searchSourcesV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	stageId: { noun: 'Stage', search: 'searchStages', searchV2: 'searchStagesV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	taskId: { noun: 'Task', search: 'searchTasks', searchV2: 'searchTasksV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	teamId: { noun: 'Team', search: 'searchTeams', searchV2: 'searchTeamsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	userId: { noun: 'User', search: 'searchUsers', searchV2: 'searchUsersV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	// Campos que só existem na API v2 (OAuth2): a lista v1 e a v2 são a mesma, pois o recurso só aparece na v2.
	dealProductId: { noun: 'Deal Product', search: 'searchDealProductsV2', searchV2: 'searchDealProductsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	meetingId: { noun: 'Meeting', search: 'searchMeetingsV2', searchV2: 'searchMeetingsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	proposalId: { noun: 'Proposal', search: 'searchProposalsV2', searchV2: 'searchProposalsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	segmentId: { noun: 'Segment', search: 'searchSegmentsV2', searchV2: 'searchSegmentsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	dialerCallId: { noun: 'Dialer Call', search: 'searchDialerCallsV2', searchV2: 'searchDialerCallsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	fileId: { noun: 'File', search: 'searchFilesV2', searchV2: 'searchFilesV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	leadId: { noun: 'Lead', search: 'searchLeadsV2', searchV2: 'searchLeadsV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
	webhookId: { noun: 'Webhook', search: 'searchWebhooks', searchV2: 'searchWebhooksV2', example: '5f8a1c2b3d4e5f6a7b8c9d0e' },
};

/** Faixa de `@version` aceita pelo n8n: números exatos ou condições como `{ _cnd: { gte: 2 } }`. */
type VersionRange = Array<number | DisplayCondition>;

/** Versões do node em que o Resource Locator aparece: 2 ou maior. */
const FROM_VERSION_2: VersionRange = [{ _cnd: { gte: 2 } }];

/** Copia as regras de exibição do campo e acrescenta a faixa de `@version`. */
function withVersion(displayOptions: IDisplayOptions | undefined, versions: VersionRange): IDisplayOptions {
	return {
		...displayOptions,
		show: { ...displayOptions?.show, '@version': versions },
	};
}

/** Recursos da API v2 terminam em `V2` (contactV2, dealV2...). Eles usam a lista da API v2. */
function usesApiV2(property: INodeProperties): boolean {
	const resources = property.displayOptions?.show?.resource as string[] | undefined;
	return Boolean(resources?.some((resource) => resource.endsWith('V2')));
}

/** Frase "a contact" / "an organization" para a descrição do erro. */
function withArticle(noun: string): string {
	const lower = noun.toLowerCase();
	return `${/^[aeiou]/.test(lower) ? 'an' : 'a'} ${lower}`;
}

/**
 * Devolve a lista de propriedades pronta para as duas versões do node.
 * Para cada campo de ID guiado, sai o par: texto (`@version` 1) + Resource Locator (`@version` 2+).
 * As demais propriedades passam sem mudança e continuam visíveis nas duas versões.
 */
export function withGuidedIds(properties: INodeProperties[]): INodeProperties[] {
	return properties.flatMap((property) => {
		const spec = ID_FIELDS[property.name];
		if (!spec || property.type !== 'string') return [property];

		const searchListMethod = usesApiV2(property) && spec.searchV2 ? spec.searchV2 : spec.search;

		// Cópia em texto: mesma definição da 2.3.2, só presa à versão 1.
		const legacy: INodeProperties = {
			...property,
			displayOptions: withVersion(property.displayOptions, [1]),
		};

		const guided: INodeProperties = {
			displayName: spec.noun,
			name: property.name,
			type: 'resourceLocator',
			required: property.required,
			default: { mode: 'list', value: '' },
			description: property.description,
			displayOptions: withVersion(property.displayOptions, FROM_VERSION_2),
			modes: [
				{
					displayName: 'From List',
					name: 'list',
					type: 'list',
					placeholder: `Select ${withArticle(spec.noun)}...`,
					typeOptions: { searchListMethod, searchable: true },
				},
				{
					displayName: 'By ID',
					name: 'id',
					type: 'string',
					placeholder: `e.g. ${spec.example}`,
				},
			],
		};

		return [legacy, guided];
	});
}

/**
 * Normaliza o valor de um parâmetro de ID para texto, venha ele como texto (versão 1 ou dropdown)
 * ou como Resource Locator `{ mode, value }` (versão 2). Locator vazio vira '' e nunca um objeto.
 * Os `loadOptions` usam isto para ler o funil escolhido sem repassar o objeto à RD.
 */
export function plainId(raw: unknown): string {
	if (typeof raw === 'object' && raw !== null) {
		return String((raw as { value?: unknown }).value ?? '').trim();
	}
	return typeof raw === 'string' ? raw : '';
}

/**
 * Função única de leitura de ID: todos os `execute` passam por aqui.
 * - Versão 1 (ou campo que não virou locator): o parâmetro já é texto e volta como está.
 * - Versão 2: o parâmetro é `{ mode, value }`; devolve `value` sem espaços nas pontas,
 *   porque quem cola o ID costuma levar um espaço junto.
 * - Locator vazio: falha cedo com uma mensagem que diz o que fazer, em vez de a RD devolver 404.
 */
export function getIdParameter(this: IExecuteFunctions, name: string, itemIndex: number): string {
	const raw = this.getNodeParameter(name, itemIndex) as unknown;
	if (typeof raw !== 'object' || raw === null) return raw as string;

	const value = String((raw as { value?: unknown }).value ?? '').trim();
	if (value) return value;

	const noun = ID_FIELDS[name]?.noun ?? name;
	throw new NodeOperationError(this.getNode(), `The '${noun}' parameter is empty [item ${itemIndex}]`, {
		itemIndex,
		description: `Choose ${withArticle(noun)} from the list or paste its ID`,
	});
}
