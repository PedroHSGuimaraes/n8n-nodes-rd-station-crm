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

	// Regressão da tag v2.4.0 (06/11/2026): o publish rodava Node 20 (npm 10) e o `npm ci` recusou
	// o lock gerado pelo npm do Node LTS que o CI usa ("Missing: ignore@7.0.14 from lock file").
	// O CI passava e a publicação falhava. Este teste falha se os dois workflows voltarem a divergir.
	it('publish workflow uses the same Node version as the ci workflow', () => {
		// Lê o valor de `node-version` de cada workflow, sem aspas, para comparar os dois.
		const nodeVersion = (file) => {
			const text = fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8');
			const found = text.match(/^\s*node-version:\s*['"]?([^'"\n]+)['"]?\s*$/m);
			return found ? found[1].trim() : undefined;
		};
		// O lock só é instalável pelo mesmo npm que o gerou; por isso a versão precisa ser igual.
		assert.equal(nodeVersion('publish.yml'), nodeVersion('ci.yml'));
	});

	// Token do npm "Read and write (stage only)" (06/11/2026): com ele `npm publish` falha com
	// E_STAGE_REQUIRED. A versão precisa ir para a fila do `npm stage publish`, que só existe no
	// npm 12 (o Node LTS do runner traz o npm 11). O dono aprova a versão na aba Staged Packages.
	// Este teste falha se o workflow voltar a chamar `npm publish` direto.
	it('publish workflow stages the package instead of publishing it', () => {
		const publish = fs.readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');
		// Só conta passo `run:` de verdade; comentário que cita o comando não vale.
		const runs = publish.split('\n').filter((line) => /^\s*(-\s+)?run:/.test(line));
		assert.ok(
			runs.some((line) => line.includes('npm@12.2.2 stage publish') && line.includes('--provenance')),
			'publish.yml must run "npm@12.2.2 stage publish --provenance"',
		);
		assert.equal(
			runs.some((line) => /\bnpm publish\b/.test(line)),
			false,
			'publish.yml must not run "npm publish" with a stage-only token',
		);
		// O token chega pelo setup-node (registry-url) e pelo NODE_AUTH_TOKEN do passo.
		assert.match(publish, /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/);
		assert.match(publish, /id-token:\s*write/);
	});
});
