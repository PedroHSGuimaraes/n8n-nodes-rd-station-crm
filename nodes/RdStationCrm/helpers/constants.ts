import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * RD Station CRM v1 webhook event types.
 * One webhook is registered per event. Source: developers.rdstation.com (crm-v1-webhooks).
 */
export const RD_CRM_WEBHOOK_EVENTS: INodePropertyOptions[] = [
	{ name: 'Campaign Created', value: 'crm_campaign_created' },
	{ name: 'Campaign Deleted', value: 'crm_campaign_deleted' },
	{ name: 'Campaign Updated', value: 'crm_campaign_updated' },
	{ name: 'Contact Created', value: 'crm_contact_created' },
	{ name: 'Contact Deleted', value: 'crm_contact_deleted' },
	{ name: 'Contact Updated', value: 'crm_contact_updated' },
	{ name: 'Deal Created', value: 'crm_deal_created' },
	{ name: 'Deal Deleted', value: 'crm_deal_deleted' },
	{ name: 'Deal Updated', value: 'crm_deal_updated' },
	{ name: 'Loss Reason Created', value: 'crm_lost_reason_created' },
	{ name: 'Loss Reason Deleted', value: 'crm_lost_reason_deleted' },
	{ name: 'Loss Reason Updated', value: 'crm_lost_reason_updated' },
	{ name: 'Organization Created', value: 'crm_organization_created' },
	{ name: 'Organization Deleted', value: 'crm_organization_deleted' },
	{ name: 'Organization Updated', value: 'crm_organization_updated' },
	{ name: 'Product Created', value: 'crm_product_created' },
	{ name: 'Product Deleted', value: 'crm_product_deleted' },
	{ name: 'Product Updated', value: 'crm_product_updated' },
	{ name: 'Source Created', value: 'crm_source_created' },
	{ name: 'Source Deleted', value: 'crm_source_deleted' },
	{ name: 'Source Updated', value: 'crm_source_updated' },
	{ name: 'Task Created', value: 'crm_task_created' },
	{ name: 'Task Updated', value: 'crm_task_updated' },
];
