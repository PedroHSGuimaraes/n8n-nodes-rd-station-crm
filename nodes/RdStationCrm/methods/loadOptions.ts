import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { rdCrmApiRequest, rdCrmApiRequestAllItems } from '../transport';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOptions(items: any[], labelKey = 'name'): INodePropertyOptions[] {
	return items
		.filter(Boolean)
		.map((item) => ({
			name: (item[labelKey] ?? item.name ?? item.label ?? item.email ?? item.id) as string,
			value: (item.id ?? item._id) as string,
		}));
}

async function loadCustomFields(
	this: ILoadOptionsFunctions,
	forEntity: string,
): Promise<INodePropertyOptions[]> {
	const fields = await rdCrmApiRequestAllItems.call(
		this,
		'custom_fields',
		'GET',
		'/custom_fields',
		{},
		{ for: forEntity },
	);
	return toOptions(fields, 'label');
}

export const loadOptions = {
	async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(
			this,
			'organizations',
			'GET',
			'/organizations',
		);
		return toOptions(items);
	},

	async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(this, 'users', 'GET', '/users');
		return toOptions(items);
	},

	async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(this, 'teams', 'GET', '/teams');
		return toOptions(items);
	},

	async getPipelines(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(
			this,
			'deal_pipelines',
			'GET',
			'/deal_pipelines',
		);
		return toOptions(items);
	},

	async getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		let pipelineId = '';
		try {
			pipelineId = this.getNodeParameter('pipelineId', '') as string;
		} catch {
			pipelineId = '';
		}
		const qs = pipelineId ? { deal_pipeline_id: pipelineId, limit: 12 } : { limit: 12 };
		const items = await rdCrmApiRequestAllItems.call(this, 'deal_stages', 'GET', '/deal_stages', {}, qs);
		return toOptions(items);
	},

	async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(this, 'campaigns', 'GET', '/campaigns');
		return toOptions(items);
	},

	async getSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(this, 'deal_sources', 'GET', '/deal_sources');
		return toOptions(items);
	},

	async getLossReasons(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(
			this,
			'deal_lost_reasons',
			'GET',
			'/deal_lost_reasons',
		);
		return toOptions(items);
	},

	async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await rdCrmApiRequestAllItems.call(this, 'products', 'GET', '/products');
		return toOptions(items);
	},

	async getContactCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFields.call(this, 'contact');
	},

	async getDealCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFields.call(this, 'deal');
	},

	async getOrganizationCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFields.call(this, 'organization');
	},

	async getProductCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFields.call(this, 'product');
	},
};

// Silence unused import in strict builds where only some helpers are referenced.
void rdCrmApiRequest;
