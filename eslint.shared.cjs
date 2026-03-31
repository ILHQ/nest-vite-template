const sharedIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.idea/**',
  '**/.vscode/**',
  '**/.github/**',
  '**/tsconfig.tsbuildinfo',
];

function createFrontendConfig({
  js,
  globals,
  reactHooks,
  reactRefresh,
  prettier,
  pluginPrettier,
  tseslint,
}) {
  return tseslint.config(
    {
      ignores: sharedIgnores,
    },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{js,jsx,ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
        prettier: pluginPrettier,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
        'prettier/prettier': 'error',
        'arrow-body-style': 'off',
        'prefer-arrow-callback': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'react-hooks/exhaustive-deps': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
      },
    },
    prettier,
  );
}

function createServiceConfig({
  eslint,
  eslintPluginPrettierRecommended,
  globals,
  tsconfigRootDir,
  tseslint,
}) {
  return tseslint.config(
    {
      ignores: sharedIgnores,
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.jest,
        },
        sourceType: 'commonjs',
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
    },
    {
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        'prettier/prettier': ['error', { endOfLine: 'auto' }],
      },
    },
  );
}

module.exports = {
  createFrontendConfig,
  createServiceConfig,
};
