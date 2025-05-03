// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config({
  languageOptions: {
    parserOptions: {
      project: true,
      tsconfigRootDir: import.meta.dirname
    }
  },
  files: ['**/*.ts'],
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintConfigPrettier
  ],
  rules: {
    // --- Possible Errors ---
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-extra-semi': 'error',
    'no-unreachable': 'error',

    // --- Best Practices ---
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    curly: ['error', 'all'],
    'no-shadow': ['error', { hoist: 'all' }],
    'no-var': 'error',
    'prefer-const': ['warn', { destructuring: 'all' }],
    'no-param-reassign': ['warn', { props: false }],
    'no-useless-catch': 'warn',
    radix: 'error',
    'no-implicit-coercion': 'warn',
    'no-loop-func': 'error',

    // --- Stylistic Issues ---
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'comma-dangle': ['error', 'never'],
    'arrow-body-style': ['warn', 'as-needed'],
    'object-shorthand': ['warn', 'properties'],
    'prefer-arrow-callback': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0, maxBOF: 0 }],
    'no-trailing-spaces': 'warn',
    'eol-last': ['warn', 'always'],

    // --- ES6 ---
    'prefer-template': 'warn',
    'no-useless-constructor': 'warn',
    'prefer-destructuring': ['warn', { object: true, array: false }]
  }
});
