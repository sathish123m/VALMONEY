import js from '@eslint/js';
import globals from 'globals';

/**
 * Flat config for the API.
 *
 * The server is CommonJS with no build step, so the source type stays `commonjs`
 * and only Node globals are exposed. `prisma.config.ts` is type-checked by the
 * Prisma CLI, not linted here.
 */
export default [
  { ignores: ['node_modules/**', 'coverage/**', 'uploads/**', 'src/generated/**'] },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off', // a server logs; that is what its stdout is for
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
