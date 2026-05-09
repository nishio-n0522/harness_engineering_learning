import path from 'node:path';
import tseslint from 'typescript-eslint';

const projectRoot = path.resolve(import.meta.dirname, '..');

export default tseslint.config(
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.fixtures.json'],
        tsconfigRootDir: projectRoot,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // recommendedTypeChecked には含まれないが、fixture 03/04 で検証したいので明示有効化
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
);
