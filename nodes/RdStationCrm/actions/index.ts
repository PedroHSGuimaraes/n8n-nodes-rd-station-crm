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
	{ name: 'Campaign', value: 'campaign', description: 'A marketing campaign that deals can be linked to' },
	{ name: 'Contact', value: 'contact', description: 'A person or lead, with name, emails and phones' },
	{ name: 'Custom Field', value: 'customField', description: 'A custom field definition for contacts, deals or organizations' },
	{ name: 'Deal', value: 'deal', description: 'A sales opportunity or negotiation moving through a pipeline' },
	{ name: 'Deal Product', value: 'dealProduct', description: 'A product line item (price, quantity, discount) attached to a deal' },
	{ name: 'Loss Reason', value: 'lossReason', description: 'A reason a deal was marked as lost' },
	{ name: 'Note', value: 'note', description: 'A text note attached to a deal or contact' },
	{ name: 'Organization', value: 'organization', description: 'A company or account that contacts and deals belong to' },
	{ name: 'Pipeline', value: 'pipeline', description: 'A sales funnel made up of ordered stages' },
	{ name: 'Product', value: 'product', description: 'A catalog product with a name and base price' },
	{ name: 'Source', value: 'source', description: 'The origin (source) a deal came from' },
	{ name: 'Stage', value: 'stage', description: 'A stage inside a pipeline funnel' },
	{ name: 'Task', value: 'task', description: 'An activity or to-do linked to a deal or contact' },
	{ name: 'Team', value: 'team', description: 'A group of CRM users' },
	{ name: 'User', value: 'user', description: 'A CRM user or account member' },
	{ name: 'Webhook', value: 'webhook', description: 'Manage RD Station CRM webhook subscriptions' },
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
	{ name: 'Contact', value: 'contactV2', description: 'A person or lead in RD Station CRM API v2' },
	{ name: 'Custom Field', value: 'customFieldV2', description: 'A custom field definition in RD Station CRM API v2' },
	{ name: 'Deal', value: 'dealV2', description: 'A sales opportunity in RD Station CRM API v2' },
	{ name: 'Note', value: 'noteV2', description: 'A text note attached to a deal or contact in RD Station CRM API v2' },
	{ name: 'Organization', value: 'organizationV2', description: 'A company or account in RD Station CRM API v2' },
	{ name: 'Task', value: 'taskV2', description: 'An activity or to-do in RD Station CRM API v2' },
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
