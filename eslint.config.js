import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const REACT_19_ONLY = 'React 19-only API; the packages must support React 18.'

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/.next/**',
    '**/node_modules/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next',
              message: 'Library code must not depend on Next.js.',
            },
            { name: 'nuqs', message: 'URL state belongs to the host app.' },
            {
              name: 'sonner',
              message: 'Notifications belong to the host app.',
            },
            {
              name: 'react',
              importNames: ['use', 'useActionState', 'useOptimistic'],
              message: REACT_19_ONLY,
            },
            {
              name: 'react-dom',
              importNames: ['useFormStatus'],
              message: REACT_19_ONLY,
            },
          ],
          patterns: [
            {
              group: ['next/*'],
              message: 'Library code must not depend on Next.js.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Library code must not read process.env; take configuration as arguments.',
        },
        {
          selector:
            'MemberExpression[object.name=/^React(DOM)?$/][property.name=/^(use|useActionState|useOptimistic|useFormStatus)$/]',
          message: REACT_19_ONLY,
        },
      ],
    },
  },
  {
    files: [
      'scripts/**/*.ts',
      '**/*.config.{ts,js}',
      'packages/*/test/**/*.{ts,tsx}',
    ],
    languageOptions: { globals: globals.node },
  },
])
