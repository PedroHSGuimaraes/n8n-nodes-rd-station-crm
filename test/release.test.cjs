/** Prova o lançamento 2.4.0 (slice S4): versão, changelog e workflow de publicação. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const root = path.resolve(__dirname, '..');

describe('release', () => {
	it('release 2.4.0 is documented in the changelog', () => {
		const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		assert.equal(pkg.version, '2.4.0');
		const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
		const section = changelog.split(/^## /m).find((part) => part.startsWith('2.4.0'));
		assert.ok(section, 'CHANGELOG.md needs a "## 2.4.0" section');
		for (const topic of [/node-cli/i, /version 2/i, /lint/i]) {
			assert.match(section, topic);
		}
	});

	it('publish workflow keeps the v tag trigger and provenance', () => {
		const publish = fs.readFileSync(path.join(root, '.github/workflows/publish.yml'), 'utf8');
		assert.match(publish, /tags:\s*\n\s*- 'v\*'/);
		assert.ok(publish.includes('npm publish --provenance'));
	});
});
