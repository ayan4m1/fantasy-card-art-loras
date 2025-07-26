import js from '@eslint/js';
import globals from 'globals';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node
    }
  },
  eslintPluginPrettier
];
