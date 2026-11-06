/**
 * Fábrica de recursos da API v2 (OAuth2).
 *
 * Por que existe: os recursos novos da v2 (leads, funis, etapas, fontes, produtos, reuniões...) seguem
 * o mesmo molde do `TaskV2.ts`: criar, ler um, listar, atualizar e, às vezes, apagar, sempre com o
 * corpo embrulhado em `{ data }` pelo `rdCrmV2Request`. Escrever 16 cópias desse molde repetiria
 * centenas de linhas; aqui cada recurso é uma especificação (rota, campos, operações) e a fábrica
 * gera as propriedades da tela e a função de execução (decisão do Jev, 1,00, 06/11/2026).
 *
 * Recurso com corpo fora do molde (envio de arquivo) ganha uma função própria, chamada antes do molde.
 */
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getIdParameter } from '../../helpers/resourceLocator';
import { rdCrmV2Request, rdCrmV2RequestAllItems } from '../../transport/v2';

/** Tipos de campo que a fábrica sabe ler e converter para o formato da RD. */
export type V2FieldType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'options'
	| 'dateTime'
	| 'json'
	| 'csv'
	| 'id';

/** Um campo do corpo da requisição. */
export interface V2Field {
	/** Nome do parâmetro na tela; também é a chave do corpo, salvo se houver `apiName`. */
	name: string;
	displayName: string;
	type: V2FieldType;
	description: string;
	/** Chave do corpo quando ela difere do nome do parâmetro (ex.: `productId` vira `product_id`). */
	apiName?: string;
	/** Opções fixas, quando `type` é `options`. */
	options?: INodePropertyOptions[];
	/** Método de `loadOptions` que lista as opções da conta, quando `type` é `options`. */
	loadOptionsMethod?: string;
	/** Valor padrão do campo; o lint do n8n exige `default` em toda definição de campo. */
	default?: string | number | boolean;
	/** Formato exigido do JSON digitado (ex.: `sections` das propostas é uma lista). */
	expect?: 'array' | 'object';
	/** Campo que só vale na atualização (ex.: o lead só nasce `ongoing`, e o status muda depois). */
	updateOnly?: boolean;
	/** Campo que só vale na criação (a RD não aceita trocar depois). */
	createOnly?: boolean;
}

/** Os cinco formatos de operação que a fábrica entende. */
// `custom` é a operação que a especificação executa por conta própria (ex.: envio de arquivo).
export type V2Kind = 'create' | 'get' | 'getMany' | 'update' | 'delete' | 'custom';

/** Uma operação do recurso, com a rota própria quando ela foge do padrão. */
export interface V2Operation {
	value: string;
	kind: V2Kind;
	name: string;
	action: string;
	description: string;
	/** Rota fora do padrão (ex.: disponibilidade de reunião do usuário). */
	path?: (parentId: string, id: string) => string;
	/** `false` quando a listagem não aceita o filtro RDQL (ex.: disponibilidade). */
	filter?: boolean;
}

/** Especificação de um recurso v2. */
export interface V2Spec {
	/** Valor do menu Resource, sempre terminado em `V2`. */
	resource: string;
	/** Nome do recurso no menu, em Title Case. */
	label: string;
	/** Descrição do recurso no menu. */
	summary: string;
	/** Rota da coleção; recebe o ID do pai quando existe. */
	path: (parentId: string) => string;
	/** Nome do parâmetro de ID do pai (ex.: `pipelineId` para etapas). */
	parent?: string;
	/** Nome do parâmetro de ID do item (ex.: `leadId`). */
	idName?: string;
	operations: V2Operation[];
	/** Campos obrigatórios da criação, mostrados como parâmetros de topo. */
	topFields?: V2Field[];
	/** Demais campos: vão em "Additional Fields" (criar) e "Update Fields" (atualizar). */
	fields?: V2Field[];
	/** Propriedades de tela das operações `custom`, com o próprio `displayOptions`. */
	extraProperties?: INodeProperties[];
	/** Parte fixa do corpo na criação (ex.: `http_method: 'POST'` do webhook). */
	fixedCreateBody?: IDataObject;
	/** `true` quando a listagem aceita o filtro RDQL. */
	filter?: boolean;
	/** Execução própria para operações fora do molde; devolve `undefined` se não for dela. */
	custom?: (
		this: IExecuteFunctions,
		operation: string,
		i: number,
		ids: { parentId: string; id: string },
	) => Promise<unknown | undefined>;
}

/** Monta a lista de operações padrão (Create, Get, Get Many, Update, Delete) de um recurso. */
export function standardOperations(
	kinds: Array<Exclude<V2Kind, 'custom'>>,
	singular: string,
	plural: string,
): V2Operation[] {
	const all: Record<Exclude<V2Kind, 'custom'>, V2Operation> = {
		create: {
			value: 'create',
			kind: 'create',
			name: 'Create',
			action: `Create a ${singular}`,
			description: `Create a ${singular} in RD Station CRM (API v2) and return the created record`,
		},
		get: {
			value: 'get',
			kind: 'get',
			name: 'Get',
			action: `Get a ${singular}`,
			description: `Retrieve a single ${singular} by its ID from RD Station CRM (API v2)`,
		},
		getMany: {
			value: 'getMany',
			kind: 'getMany',
			name: 'Get Many',
			action: `Get many ${plural}`,
			description: `Retrieve a list of ${plural} from RD Station CRM (API v2)`,
		},
		update: {
			value: 'update',
			kind: 'update',
			name: 'Update',
			action: `Update a ${singular}`,
			description: `Update fields of an existing ${singular} in RD Station CRM (API v2)`,
		},
		delete: {
			value: 'delete',
			kind: 'delete',
			name: 'Delete',
			action: `Delete a ${singular}`,
			description: `Delete a ${singular} from RD Station CRM (API v2)`,
		},
	};
	return kinds.map((kind) => all[kind]);
}

/** Ordena campos pelo nome de tela: a regra de lint do n8n exige lista de opções em ordem alfabética. */
function sortFields(fields: V2Field[]): V2Field[] {
	return [...fields].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** Converte um campo da especificação em propriedade de tela do n8n. */
function toProperty(field: V2Field, withRequired = false): INodeProperties {
	const base = {
		displayName: field.displayName,
		name: field.name,
		description: field.description,
	};
	switch (field.type) {
		case 'number':
			return { ...base, type: 'number', default: 0, required: withRequired || undefined };
		case 'boolean':
			return { ...base, type: 'boolean', default: false };
		case 'dateTime':
			return { ...base, type: 'dateTime', default: '', required: withRequired || undefined };
		case 'options':
			return {
				...base,
				type: 'options',
				default: '',
				required: withRequired || undefined,
				...(field.loadOptionsMethod
					? { typeOptions: { loadOptionsMethod: field.loadOptionsMethod } }
					: { options: field.options }),
			};
		case 'json':
			return { ...base, type: 'json', default: '', required: withRequired || undefined };
		default:
			// string, csv e id aparecem como texto; `id` vira Resource Locator em `withGuidedIds`.
			return { ...base, type: 'string', default: '', required: withRequired || undefined };
	}
}

/** Gera as propriedades da tela (operações, IDs, campos, paginação e filtro) de um recurso. */
export function buildDescription(spec: V2Spec): INodeProperties[] {
	const showResource = { resource: [spec.resource] };
	const ops = [...spec.operations].sort((a, b) => a.name.localeCompare(b.name));
	const withId = ops.filter((op) => ['get', 'update', 'delete'].includes(op.kind)).map((o) => o.value);
	const create = ops.find((op) => op.kind === 'create');
	const update = ops.find((op) => op.kind === 'update');
	const many = ops.filter((op) => op.kind === 'getMany');
	const props: INodeProperties[] = [];

	// Seletor de operação do recurso.
	// O valor padrão é a primeira operação do recurso, que muda de um recurso para outro; por isso não é literal.
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	props.push({
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showResource },
		options: ops.map(({ value, name, action, description }) => ({ name, value, action, description })),
		default: ops[0].value,
	});

	// ID do pai (funil da etapa, negociação do produto...): todas as operações precisam dele.
	if (spec.parent) {
		props.push({
			// 'pipelineId' vira 'Pipeline ID' no campo em texto da versão 1 do node.
			displayName: `${spec.parent.charAt(0).toUpperCase()}${spec.parent.slice(1).replace(/Id$/, '')} ID`,
			name: spec.parent,
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: showResource },
			description: 'Unique identifier of the parent record, taken from a get or list operation',
		});
	}

	// ID do item: só as operações que miram um registro.
	if (spec.idName && withId.length) {
		props.push({
			displayName: `${spec.label} ID`,
			name: spec.idName,
			type: 'string',
			required: true,
			default: '',
			displayOptions: { show: { ...showResource, operation: withId } },
			description: `Unique identifier of the ${spec.label.toLowerCase()}, taken from a create or list operation`,
		});
	}

	// Confirmação do Delete: nasce desligada e a execução falha antes do HTTP, como nos outros nodes do lote.
	const remove = ops.find((op) => op.kind === 'delete');
	if (remove) {
		props.push({
			displayName: 'Confirm Delete',
			name: 'confirmDelete',
			type: 'boolean',
			default: false,
			displayOptions: { show: { ...showResource, operation: [remove.value] } },
			description: `Whether to confirm that this ${spec.label.toLowerCase()} is deleted for good; the operation stops before calling RD Station CRM while this is off`,
		});
	}

	// Campos de topo da criação (os obrigatórios).
	if (create) {
		for (const field of sortFields(spec.topFields ?? [])) {
			props.push({
				...toProperty(field, true),
				displayOptions: { show: { ...showResource, operation: [create.value] } },
			});
		}
	}

	// Campos opcionais da criação e da atualização.
	const optional = sortFields((spec.fields ?? []).filter((f) => !f.updateOnly));
	if (create && optional.length) {
		props.push({
			displayName: 'Additional Fields',
			name: 'additionalFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: { show: { ...showResource, operation: [create.value] } },
			options: optional.map((field) => toProperty(field)),
		});
	}
	if (update) {
		const updatable = sortFields(
			[...(spec.topFields ?? []), ...(spec.fields ?? [])].filter((f) => !f.createOnly),
		);
		props.push({
			displayName: 'Update Fields',
			name: 'updateFields',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: { show: { ...showResource, operation: [update.value] } },
			options: updatable.map((field) => toProperty(field)),
		});
	}

	// Paginação e filtro das listagens.
	if (many.length) {
		const manyValues = many.map((op) => op.value);
		props.push(
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { ...showResource, operation: manyValues } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				// A RD aceita no máximo 200 itens por página (doc crm-v2-list-leads); acima disso responde 400.
				typeOptions: { minValue: 1, maxValue: 200 },
				description: 'Max number of results to return',
				displayOptions: { show: { ...showResource, operation: manyValues, returnAll: [false] } },
			},
		);
		const filterable = many.filter((op) => op.filter ?? spec.filter).map((op) => op.value);
		if (filterable.length) {
			props.push({
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { ...showResource, operation: filterable } },
				options: [
					{
						displayName: 'RDQL Filter',
						name: 'filter',
						type: 'string',
						default: '',
						placeholder: 'e.g. name:~Follow up',
						description:
							'RDQL filter expression to narrow the results, for example <code>name:~Follow up</code>. See the RD Station CRM v2 docs.',
					},
				],
			});
		}
	}

	// Campos das operações `custom` (por exemplo, o nome da propriedade binária do arquivo).
	props.push(...(spec.extraProperties ?? []));

	return props;
}

/** Lê o valor de um campo e o converte para o formato que a RD espera; `undefined` = não enviar. */
function convert(
	this: IExecuteFunctions,
	field: V2Field,
	value: unknown,
): unknown | undefined {
	// Vazio não vai no corpo: assim a atualização muda só o que a pessoa preencheu.
	if (value === undefined || value === null || value === '') return undefined;
	switch (field.type) {
		case 'csv': {
			// Lista digitada com vírgulas ("c1, c2") vira lista de IDs sem espaços nas pontas.
			const list = String(value)
				.split(',')
				.map((part) => part.trim())
				.filter(Boolean);
			// Só vírgulas e espaços não é lista: mandar `[]` na atualização apagaria os vínculos existentes.
			return list.length ? list : undefined;
		}
		case 'dateTime': {
			// A RD pede data-hora ISO 8601; o seletor do n8n entrega texto livre.
			const date = new Date(value as string);
			// Texto que não é data (ex.: "amanha") falha aqui com mensagem clara, não com "Invalid time value".
			if (Number.isNaN(date.getTime())) {
				throw new NodeOperationError(
					this.getNode(),
					`The '${field.displayName}' field is not a valid date`,
					{ description: 'Use a date such as 2026-12-01 or 2026-12-01T10:00:00Z' },
				);
			}
			return date.toISOString();
		}
		case 'json': {
			// JSON pode chegar pronto (expressão do n8n) ou como texto digitado pela pessoa.
			let parsed: unknown = value;
			if (typeof value === 'string') {
				try {
					parsed = JSON.parse(value);
				} catch {
					throw new NodeOperationError(
						this.getNode(),
						`The '${field.displayName}' field is not valid JSON`,
						{ description: 'Fix the JSON text and run the node again' },
					);
				}
			}
			// Formato errado (objeto no lugar da lista) falha aqui, antes de a RD responder 422.
			const isArray = Array.isArray(parsed);
			if (field.expect && (field.expect === 'array') !== isArray) {
				throw new NodeOperationError(
					this.getNode(),
					`The '${field.displayName}' field must be a JSON ${field.expect}`,
					{ description: 'Check the brackets of the JSON text and run the node again' },
				);
			}
			return parsed;
		}
		default:
			return value;
	}
}

/** Monta o corpo juntando os campos de topo, os opcionais e a parte fixa. */
function buildBody(
	this: IExecuteFunctions,
	fields: V2Field[],
	values: IDataObject,
	fixed: IDataObject = {},
): IDataObject {
	const body: IDataObject = { ...fixed };
	for (const field of fields) {
		const converted = convert.call(this, field, values[field.name]);
		if (converted !== undefined) body[field.apiName ?? field.name] = converted as IDataObject[string];
	}
	return body;
}

/** Cria a função de execução do recurso a partir da especificação. */
export function makeExecutor(spec: V2Spec) {
	return async function (this: IExecuteFunctions, operation: string, i: number): Promise<unknown> {
		const def = spec.operations.find((op) => op.value === operation);
		if (!def) {
			throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported`);
		}

		// IDs do pai e do item, lidos pela função única que aceita texto e Resource Locator.
		const parentId = spec.parent ? getIdParameter.call(this, spec.parent, i) : '';
		const needsId = ['get', 'update', 'delete'].includes(def.kind) && spec.idName;
		const id = needsId ? getIdParameter.call(this, spec.idName as string, i) : '';

		// Operação fora do molde (envio de arquivo) tem prioridade.
		const custom = await spec.custom?.call(this, operation, i, { parentId, id });
		if (custom !== undefined) return custom;

		const collection = def.path ? def.path(parentId, id) : spec.path(parentId);
		const itemPath = def.path ? collection : `${collection}/${id}`;

		if (def.kind === 'create') {
			// Campos de topo: o ID de outro recurso (`id`) passa pelo leitor de Resource Locator.
			const values: IDataObject = {};
			for (const field of spec.topFields ?? []) {
				values[field.name] =
					field.type === 'id'
						? getIdParameter.call(this, field.name, i)
						: (this.getNodeParameter(field.name, i) as IDataObject[string]);
			}
			Object.assign(values, this.getNodeParameter('additionalFields', i, {}) as IDataObject);
			const body = buildBody.call(
				this,
				[...(spec.topFields ?? []), ...(spec.fields ?? [])],
				values,
				spec.fixedCreateBody,
			);
			const response = await rdCrmV2Request.call(this, 'POST', collection, body);
			return response.data ?? response;
		}

		if (def.kind === 'get') {
			const response = await rdCrmV2Request.call(this, 'GET', itemPath);
			return response.data ?? response;
		}

		if (def.kind === 'update') {
			const updatable = [...(spec.topFields ?? []), ...(spec.fields ?? [])].filter(
				(f) => !f.createOnly,
			);
			const values = this.getNodeParameter('updateFields', i, {}) as IDataObject;
			const response = await rdCrmV2Request.call(
				this,
				'PUT',
				itemPath,
				buildBody.call(this, updatable, values),
			);
			return response.data ?? response;
		}

		if (def.kind === 'delete') {
			// Sem a confirmação ligada nada é enviado: apagar na RD não tem desfazer.
			if (this.getNodeParameter('confirmDelete', i, false) !== true) {
				throw new NodeOperationError(
					this.getNode(),
					`Turn on Confirm Delete to delete this ${spec.label.toLowerCase()} [item ${i}]`,
					{ itemIndex: i, description: 'The deletion is permanent, so the node waits for the confirmation' },
				);
			}
			await rdCrmV2Request.call(this, 'DELETE', itemPath);
			// A RD responde 204 sem corpo; devolver `success` dá ao workflow um item para seguir.
			return { success: true };
		}

		// getMany: filtro RDQL opcional e paginação por tamanho de página.
		const qs: IDataObject = {};
		if (def.filter ?? spec.filter) {
			const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
			if (filters.filter) qs.filter = filters.filter;
		}
		if (this.getNodeParameter('returnAll', i) as boolean) {
			return rdCrmV2RequestAllItems.call(this, collection, qs);
		}
		qs['page[size]'] = this.getNodeParameter('limit', i) as number;
		const response = await rdCrmV2Request.call(this, 'GET', collection, {}, qs);
		return response.data ?? response;
	};
}
