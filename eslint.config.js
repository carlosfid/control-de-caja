const js = require('@eslint/js');

module.exports = [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/android/**'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs' },
  },
];
