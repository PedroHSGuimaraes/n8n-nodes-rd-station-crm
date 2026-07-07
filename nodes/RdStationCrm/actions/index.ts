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

// v2 (OAuth2) resources — separate values (…V2) so they never collide with v1.
import { contactV2Description, executeContactV2 } from './v2/ContactV2';
import { customFieldV2Description, executeCustomFieldV2 } from './v2/CustomFieldV2';
import { dealV2Description, executeDealV2 } from './v2/DealV2';
import { noteV2Description, executeNoteV2 } from './v2/NoteV2';
import { organizationV2Description, executeOrganizationV2 } from './v2/OrganizationV2';
import { taskV2Description, executeTaskV2 } from './v2/TaskV2';

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

// The v2 (OAuth2) Resource dropdown — shown when Authentication = OAuth2.
export const resourceOptionsV2: INodePropertyOptions[] = [
	{ name: 'Contact', value: 'contactV2' },
	{ name: 'Custom Field', value: 'customFieldV2' },
	{ name: 'Deal', value: 'dealV2' },
	{ name: 'Note', value: 'noteV2' },
	{ name: 'Organization', value: 'organizationV2' },
	{ name: 'Task', value: 'taskV2' },
];

// Concatenated v2 per-resource property definitions.
export const resourcePropertiesV2: INodeProperties[] = [
	...contactV2Description,
	...customFieldV2Description,
	...dealV2Description,
	...noteV2Description,
	...organizationV2Description,
	...taskV2Description,
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
		// v2 (OAuth2) resources
		case 'contactV2':
			return executeContactV2.call(this, operation, i);
		case 'customFieldV2':
			return executeCustomFieldV2.call(this, operation, i);
		case 'dealV2':
			return executeDealV2.call(this, operation, i);
		case 'noteV2':
			return executeNoteV2.call(this, operation, i);
		case 'organizationV2':
			return executeOrganizationV2.call(this, operation, i);
		case 'taskV2':
			return executeTaskV2.call(this, operation, i);
		default:
			throw new NodeOperationError(
				this.getNode(),
				`The resource "${resource}" is not supported`,
			);
	}
}
