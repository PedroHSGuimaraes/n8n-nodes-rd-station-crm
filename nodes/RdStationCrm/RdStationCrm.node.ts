import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	executeResource,
	resourceOptions,
	resourceOptionsV2,
	resourceProperties,
	resourcePropertiesV2,
} from './actions';
import { loadOptions } from './methods/loadOptions';
import { loadOptionsV2 } from './methods/loadOptionsV2';

export class RdStationCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RD Station CRM',
		name: 'rdStationCrm',
		icon: { light: 'file:rdStationCrm.svg', dark: 'file:rdStationCrm.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read and write data in RD Station CRM. Create, get, update and list contacts (leads/people), deals (sales opportunities), organizations (companies), tasks, notes, and manage pipelines, stages, products, custom fields, sources, campaigns, loss reasons, users, teams and webhooks. Supports API v1 (private token) and API v2 (OAuth2). Usable as an AI Agent tool.',
		defaults: {
			name: 'RD Station CRM',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'rdStationCrmApi',
				required: true,
				displayOptions: { show: { authentication: ['accessToken'] } },
			},
			{
				name: 'rdStationCrmOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oauth2'] } },
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Access Token (API V1)', value: 'accessToken' },
					{ name: 'OAuth2 (API V2)', value: 'oauth2' },
				],
				default: 'accessToken',
				description: 'API v1 uses a private token; API v2 uses OAuth2',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { authentication: ['accessToken'] } },
				options: resourceOptions,
				default: 'contact',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { authentication: ['oauth2'] } },
				options: resourceOptionsV2,
				default: 'contactV2',
			},
			...resourceProperties,
			...resourcePropertiesV2,
		],
	};

	methods = {
		loadOptions: { ...loadOptions, ...loadOptionsV2 },
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const responseData = await executeResource.call(this, resource, operation, i);
				const asArray = Array.isArray(responseData) ? responseData : [responseData];

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(asArray as IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
