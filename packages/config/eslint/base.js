import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Regras compartilhadas por todos os pacotes TypeScript.
 * Lint com informação de tipos: pega promessas soltas e `any` implícito,
 * que o compilador sozinho não barra.
 *
 * @param {{ tsconfigRootDir: string }} options
 */
export function createBaseConfig({ tsconfigRootDir }) {
  return tseslint.config(
    { ignores: ['dist/**', 'coverage/**', '.next/**', '**/*.config.{js,mjs,ts}'] },
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
    prettier,
  );
}
