// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'dist/**', // Use more explicit glob pattern
      'build/',
      '.husky/',
      '.github/',
      'docker/',
      'logs/',
      'scripts/**',
      'nginx/',
      'docs/**',
      'test/**',
      'migrations/**'
    ]
  },
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    files: ['**/*.ts', '**/*.d.ts'],

    extends: [
      eslint.configs.recommended,
      // ...tseslint.configs.recommendedTypeChecked,
      eslintConfigPrettier
    ],
    rules: {
      // --- Possible Errors ---
      'no-console': 'warn',
      'no-debugger': 'warn',
      // 'no-unused-vars' is handled by '@typescript-eslint/no-unused-vars'
      'no-extra-semi': 'error',
      'no-unreachable': 'error',

      // --- Best Practices ---
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      // 'no-shadow' is handled by '@typescript-eslint/no-shadow'
      'no-var': 'error',
      'prefer-const': ['warn', { destructuring: 'all' }],
      'no-param-reassign': ['warn', { props: false }],
      'no-useless-catch': 'warn',
      radix: 'error',
      'no-implicit-coercion': 'warn',
      // 'no-loop-func' is handled by '@typescript-eslint/no-loop-func'

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
      // 'no-useless-constructor' is handled by '@typescript-eslint/no-useless-constructor'
      'prefer-destructuring': ['warn', { object: true, array: false }],

      // --- TypeScript ---
      // Configure TypeScript-specific versions of rules previously defined with base ESLint
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-shadow': ['error', { hoist: 'all' }], // Consider TS-specific options like ignoreTypeValueShadow if needed
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/no-useless-constructor': 'warn',

      // Existing TypeScript rule configurations
      '@typescript-eslint/no-misused-promises': 0,
      '@typescript-eslint/no-unsafe-call': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-member-access': 0
    }
  }
);
