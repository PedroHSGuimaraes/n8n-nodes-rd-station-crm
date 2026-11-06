/**
 * Prova a documentação das rotas novas da API v2 (slice S5 do plano `rotas-novas-v2`):
 * o CHANGELOG descreve a entrega e o README lista os recursos e os eventos do trigger OAuth2.
 */
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');
const { assert } = require('./helpers.cjs');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('S5 documentation of the new v2 routes', () => {
	it('S5.1 changelog documents the new v2 routes', () => {
		const section = read('CHANGELOG.md')
			.split(/^## /m)
			.find((part) => part.startsWith('2.5.0'));
		assert.ok(section, 'CHANGELOG.md needs a "## 2.5.0" section');
		for (const word of [
			'API v2', 'Lead', 'Trigger', 'OAuth2', '38', 'Pipeline', 'Stage', 'Source', 'Loss Reason', 'User',
			'Team', 'Product', 'Campaign', 'Meeting', 'Proposal', 'Segment', 'Deal Product', 'Deal File',
			'Dialer Call', 'Webhook',
		]) {
			assert.ok(section.includes(word), `the 2.5.0 section must mention ${word}`);
		}
	});

	it('S5.2 readme documents the new resources and events', () => {
		const readme = read('README.md');
		const v2 = readme.slice(readme.indexOf('### OAuth2 (API V2)'), readme.indexOf('### Exemplo'));
		for (const resource of [
			'Campaign', 'Deal File', 'Deal Product', 'Dialer Call', 'Lead', 'Loss Reason', 'Meeting',
			'Pipeline', 'Product', 'Proposal', 'Segment', 'Source', 'Stage', 'Team', 'User', 'Webhook',
		]) {
			assert.ok(v2.includes(`**${resource}**`), `README v2 table is missing ${resource}`);
		}
		// Cada linha traz as operações certas (ex.: Proposal não tem Update; Deal File tem Upload).
		const row = (name) => v2.split('\n').find((line) => line.includes(`**${name}**`));
		assert.ok(row('Deal File').includes('Upload'));
		assert.ok(row('Proposal').includes('Create, Get, Get Many') && !row('Proposal').includes('Update'));
		assert.ok(row('User').includes('Get Meeting Availability'));
		assert.ok(row('Webhook').includes('Delete'));
		const trigger = readme.slice(readme.indexOf('## 🔔 Trigger'), readme.indexOf('## 🤖'));
		assert.ok(trigger.includes('38'), 'README Trigger must state the 38 v2 events');
		for (const event of ['crm_lead_created', 'crm_meeting_status_changed', 'crm_proposal_created', 'crm_task_deleted']) {
			assert.ok(trigger.includes(event), `README Trigger is missing ${event}`);
		}
		// Seção de Tool de IA: as operações novas precisam aparecer ali também.
		const tool = readme.slice(readme.indexOf('## 🤖'), readme.indexOf('## 🔀'));
		assert.ok(tool.includes('Lead'), 'README AI tool section must cite the new v2 resources');
	});
});
