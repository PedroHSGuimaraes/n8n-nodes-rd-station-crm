import type { IExecuteFunctions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { campaignDescription, executeCampaign } from './campaign/Campaign';
import { contactDescription, executeContact } from './contact/Contact';
import { customFieldDescription, executeCustomField } from './customField/CustomField';
import { dealDescription, executeDeal } from './deal/Deal';
import { dealProductDescription, executeDealProduct } from './dealProduct/DealProduct';
import { lossReasonDescription, executeLossReason } from './lossReason/LossReason';
import { noteDescription, executeNote } from './note/Note';
import { organizationDescription, executeOrganization } from './organization/Organization';
import { pipelineDescription, executePipeline } from './pipeline/Pipeline';
import { productDescription, executeProduct } from './product/Product';
import { sourceDescription, executeSource } from './source/Source';
import { stageDescription, executeStage } from './stage/Stage';
import { taskDescription, executeTask } from './task/Task';
import { teamDescription, executeTeam } from './team/Team';
import { userDescription, executeUser } from './user/User';
import { webhookDescription, executeWebhook } from './webhook/Webhook';

// The Resource dropdown (alphabetically sorted by name).
export const resourceOptions: INodePropertyOptions[] = [
	{ name: 'Campaign', value: 'campaign' },
	{ name: 'Contact', value: 'contact' },
	{ name: 'Custom Field', value: 'customField' },
	{ name: 'Deal', value: 'deal' },
	{ name: 'Deal Product', value: 'dealProduct' },
	{ name: 'Loss Reason', value: 'lossReason' },
	{ name: 'Note', value: 'note' },
	{ name: 'Organization', value: 'organization' },
	{ name: 'Pipeline', value: 'pipeline' },
	{ name: 'Product', value: 'product' },
	{ name: 'Source', value: 'source' },
	{ name: 'Stage', value: 'stage' },
	{ name: 'Task', value: 'task' },
	{ name: 'Team', value: 'team' },
	{ name: 'User', value: 'user' },
	{ name: 'Webhook', value: 'webhook' },
];

// Concatenated per-resource property definitions (operations + fields).
export const resourceProperties: INodeProperties[] = [
	...campaignDescription,
	...contactDescription,
	...customFieldDescription,
	...dealDescription,
	...dealProductDescription,
	...lossReasonDescription,
	...noteDescription,
	...organizationDescription,
	...pipelineDescription,
	...productDescription,
	...sourceDescription,
	...stageDescription,
	...taskDescription,
	...teamDescription,
	...userDescription,
	...webhookDescription,
];

// Dispatch to the right resource implementation.
export async function executeResource(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<any> {
	switch (resource) {
		case 'campaign':
			return executeCampaign.call(this, operation, i);
		case 'contact':
			return executeContact.call(this, operation, i);
		case 'customField':
			return executeCustomField.call(this, operation, i);
		case 'deal':
			return executeDeal.call(this, operation, i);
		case 'dealProduct':
			return executeDealProduct.call(this, operation, i);
		case 'lossReason':
			return executeLossReason.call(this, operation, i);
		case 'note':
			return executeNote.call(this, operation, i);
		case 'organization':
			return executeOrganization.call(this, operation, i);
		case 'pipeline':
			return executePipeline.call(this, operation, i);
		case 'product':
			return executeProduct.call(this, operation, i);
		case 'source':
			return executeSource.call(this, operation, i);
		case 'stage':
			return executeStage.call(this, operation, i);
		case 'task':
			return executeTask.call(this, operation, i);
		case 'team':
			return executeTeam.call(this, operation, i);
		case 'user':
			return executeUser.call(this, operation, i);
		case 'webhook':
			return executeWebhook.call(this, operation, i);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The resource "${resource}" is not supported`,
			);
	}
}
