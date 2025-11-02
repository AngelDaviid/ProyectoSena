// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs'],
  },

  // Configs base
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,

  // Opciones de lenguaje
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module', // NestJS usa ES Modules por default
      parserOptions: {
        project: './tsconfig.json', // apunta a tu tsconfig principal
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
  },

  // Reglas personalizadas
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off', // Nest usa a veces `any`
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'off',

      // Prettier
      'prettier/prettier': ['warn'],

      // NestJS friendly
      '@typescript-eslint/explicit-module-boundary-types': 'off', // permite no declarar tipos en controllers/services
      '@typescript-eslint/ban-ts-comment': 'off', // permite @ts-ignore si lo necesitas temporalmente
    },
  }
);
