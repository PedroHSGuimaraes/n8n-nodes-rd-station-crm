/**
 * Prova a migração para o toolchain do @n8n/node-cli 0.55.5 (slice S1 do plano):
 * o build gera todos os artefatos, o package.json segue o template e o CI roda as etapas certas.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

describe('toolchain', () => {
	it('build generates both nodes, both credentials and the icons', () => {
		const expected = [
			'dist/nodes/RdStationCrm/RdStationCrm.node.js',
			'dist/nodes/RdStationCrmTrigger/RdStationCrmTrigger.node.js',
			'dist/credentials/RdStationCrmApi.credentials.js',
			'dist/credentials/RdStationCrmOAuth2Api.credentials.js',
			'dist/nodes/RdStationCrm/rdStationCrm.svg',
			'dist/nodes/RdStationCrm/rdStationCrm.dark.svg',
			'dist/nodes/RdStationCrmTrigger/rdStationCrm.svg',
			'dist/nodes/RdStationCrmTrigger/rdStationCrm.dark.svg',
		];
		for (const file of expected) {
			assert.ok(fs.existsSync(path.join(root, file)), `missing ${file}`);
		}
	});

	it('package.json follows the node-cli template', () => {
		assert.equal(pkg.scripts.build, 'n8n-node build');
		assert.equal(pkg.scripts.lint, 'n8n-node lint');
		assert.equal(pkg.n8n.strict, true);
		assert.equal(pkg.devDependencies['@n8n/node-cli'], '0.55.5');
		assert.equal('dependencies' in pkg, false, 'no runtime dependencies allowed');
		assert.equal(JSON.stringify(pkg).includes('gulp'), false, 'gulp must be gone');
		assert.equal(fs.existsSync(path.join(root, 'gulpfile.js')), false);
	});

	it('ci workflow runs install, lint, test and build on pull requests', () => {
		const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
		assert.match(ci, /pull_request:/);
		for (const step of ['npm ci', 'npm run lint', 'npm test', 'npm run build']) {
			// Precisa ser um passo `run:` de verdade; o texto em comentário não vale.
			assert.match(ci, new RegExp(`^\\s*run: ${step}\\b`, 'm'), `ci.yml must run "${step}"`);
		}
	});
});
