import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  // 1. Define ignored files and directories FIRST
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
      'test/**'
    ]
  },

  // 2. Apply ESLint recommended rules
  js.configs.recommended,

  // 3. Apply Prettier recommended rules (disables stylistic rules)
  prettierConfig,

  // 4. Custom configuration for the project
  {
    languageOptions: {
      ecmaVersion: 'latest', // Use the latest ECMAScript features
      sourceType: 'module', // Use ES modules
      globals: {
        ...globals.node, // Add Node.js global variables (like process, require)
        ...globals.es2021 // Add ES2021 globals
      }
    },

    // Apply rules to all JavaScript files (ESLint will skip ignored files)
    files: ['**/*.js'],

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
  }
];
