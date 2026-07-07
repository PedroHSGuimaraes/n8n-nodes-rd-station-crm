import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { rdCrmV2RequestAllItems } from '../transport/v2';

function toOptionsV2(items: any[], labelKey = 'name'): INodePropertyOptions[] {
	return items
		.filter(Boolean)
		.map((item) => ({
			name: (item[labelKey] ?? item.name ?? item.email ?? item.id) as string,
			value: (item.id ?? item._id) as string,
		}));
}

async function loadCustomFieldsV2(
	this: ILoadOptionsFunctions,
	entity: string,
): Promise<INodePropertyOptions[]> {
	const fields = await rdCrmV2RequestAllItems.call(this, '/custom_fields', {
		filter: `entity:${entity}`,
	});
	// v2 custom_fields are addressed by slug, not id.
	return fields
		.filter(Boolean)
		.map((f) => ({ name: (f.name ?? f.slug) as string, value: (f.slug ?? f.id) as string }));
}

export const loadOptionsV2 = {
	async getUsersV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return toOptionsV2(await rdCrmV2RequestAllItems.call(this, '/users'));
	},

	async getOrganizationsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return toOptionsV2(await rdCrmV2RequestAllItems.call(this, '/organizations'));
	},

	async getSourcesV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return toOptionsV2(await rdCrmV2RequestAllItems.call(this, '/sources'));
	},

	async getCampaignsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return toOptionsV2(await rdCrmV2RequestAllItems.call(this, '/campaigns'));
	},

	async getLossReasonsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return toOptionsV2(await rdCrmV2RequestAllItems.call(this, '/lost_reasons'));
	},

	async getSegmentsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return toOptionsV2(await rdCrmV2RequestAllItems.call(this, '/segments'));
	},

	// Stages are nested under pipelines; list every pipeline's stages as "Pipeline › Stage".
	async getStagesV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const pipelines = await rdCrmV2RequestAllItems.call(this, '/pipelines');
		const out: INodePropertyOptions[] = [];
		for (const pipeline of pipelines) {
			const stages = await rdCrmV2RequestAllItems.call(
				this,
				`/pipelines/${pipeline.id}/stages`,
			);
			for (const stage of stages) {
				out.push({ name: `${pipeline.name} › ${stage.name}`, value: stage.id as string });
			}
		}
		return out;
	},

	async getContactCustomFieldsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFieldsV2.call(this, 'contact');
	},

	async getDealCustomFieldsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFieldsV2.call(this, 'deal');
	},

	async getOrganizationCustomFieldsV2(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return loadCustomFieldsV2.call(this, 'organization');
	},
};
