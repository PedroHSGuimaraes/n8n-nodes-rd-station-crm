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

/**
 * RD Station CRM v2 webhook event names (`event_name` of `POST /webhooks`).
 * Source: the OpenAPI of developers.rdstation.com/reference/crm-v2-create-webhook (38 values, read on 2026-11-06).
 * The v2 sends one webhook per event name, like the v1.
 */
export const RD_CRM_WEBHOOK_EVENTS_V2: INodePropertyOptions[] = [
	{ name: 'Campaign Created', value: 'crm_campaign_created' },
	{ name: 'Campaign Deleted', value: 'crm_campaign_deleted' },
	{ name: 'Campaign Updated', value: 'crm_campaign_updated' },
	{ name: 'Contact Created', value: 'crm_contact_created' },
	{ name: 'Contact Deleted', value: 'crm_contact_deleted' },
	{ name: 'Contact Updated', value: 'crm_contact_updated' },
	{ name: 'Deal Created', value: 'crm_deal_created' },
	{ name: 'Deal Deleted', value: 'crm_deal_deleted' },
	{ name: 'Deal Updated', value: 'crm_deal_updated' },
	{ name: 'Dialer Call Status Changed', value: 'crm_dialer_call_status_changed' },
	{ name: 'Dialer Call Transcription Completed', value: 'crm_dialer_call_transcription_completed' },
	{ name: 'Lead Created', value: 'crm_lead_created' },
	{ name: 'Lead Deleted', value: 'crm_lead_deleted' },
	{ name: 'Lead Owner Changed', value: 'crm_lead_owner_changed' },
	{ name: 'Lead Rating Changed', value: 'crm_lead_rating_changed' },
	{ name: 'Lead Stage Changed', value: 'crm_lead_stage_changed' },
	{ name: 'Lead Status Changed', value: 'crm_lead_status_changed' },
	{ name: 'Lead Updated', value: 'crm_lead_updated' },
	{ name: 'Loss Reason Created', value: 'crm_lost_reason_created' },
	{ name: 'Loss Reason Deleted', value: 'crm_lost_reason_deleted' },
	{ name: 'Loss Reason Updated', value: 'crm_lost_reason_updated' },
	{ name: 'Meeting Created', value: 'crm_meeting_created' },
	{ name: 'Meeting Participants Changed', value: 'crm_meeting_participants_changed' },
	{ name: 'Meeting Status Changed', value: 'crm_meeting_status_changed' },
	{ name: 'Meeting Updated', value: 'crm_meeting_updated' },
	{ name: 'Organization Created', value: 'crm_organization_created' },
	{ name: 'Organization Deleted', value: 'crm_organization_deleted' },
	{ name: 'Organization Updated', value: 'crm_organization_updated' },
	{ name: 'Product Created', value: 'crm_product_created' },
	{ name: 'Product Deleted', value: 'crm_product_deleted' },
	{ name: 'Product Updated', value: 'crm_product_updated' },
	{ name: 'Proposal Created', value: 'crm_proposal_created' },
	{ name: 'Source Created', value: 'crm_source_created' },
	{ name: 'Source Deleted', value: 'crm_source_deleted' },
	{ name: 'Source Updated', value: 'crm_source_updated' },
	{ name: 'Task Created', value: 'crm_task_created' },
	{ name: 'Task Deleted', value: 'crm_task_deleted' },
	{ name: 'Task Updated', value: 'crm_task_updated' },
];
