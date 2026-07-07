import tseslint from 'typescript-eslint';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';

export default [
	{ ignores: ['dist/**', 'node_modules/**', 'gulpfile.js', '.prettierrc.js', 'eslint.config.mjs'] },
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			sourceType: 'module',
			ecmaVersion: 2022,
		},
	},
	n8nCommunityNodesPlugin.configs.recommended,
	{
		rules: {
			// Trigger nodes cannot be AI tools; downgrade to warn as documented by the plugin.
			'@n8n/community-nodes/node-usable-as-tool': 'warn',
		},
	},
];
