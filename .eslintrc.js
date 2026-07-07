/**
 * Configuração mínima de ESLint para o pacote de nodes do n8n.
 * Ajuste as regras conforme sua necessidade.
 */
module.exports = {
	root: true,
	env: {
		node: true,
		es2021: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2021,
	},
	plugins: ['@typescript-eslint'],
	extends: ['eslint:recommended'],
	ignorePatterns: ['dist/**', 'node_modules/**', 'gulpfile.js', '.eslintrc.js'],
	rules: {
		'no-unused-vars': 'off',
		'no-undef': 'off',
	},
};
