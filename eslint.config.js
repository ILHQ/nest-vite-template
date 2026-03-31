const path = require('node:path');
const { createFrontendConfig, createServiceConfig } = require('./eslint.shared.cjs');

const rootDir = __dirname;
const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');
const eslintConfigPrettier = require('eslint-config-prettier');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const tseslint = require('typescript-eslint');

function withScope(configs, scope, fallbackFiles) {
  return configs.map((config) => {
    if (!config.files && !config.plugins && !config.rules && !config.languageOptions) {
      return config;
    }

    const scopedFiles = config.files?.map((file) => path.posix.join(scope, file)) ?? fallbackFiles;

    return {
      ...config,
      files: scopedFiles,
    };
  });
}

const frontendConfig = createFrontendConfig({
  js,
  globals,
  reactHooks,
  reactRefresh,
  prettier: eslintConfigPrettier,
  pluginPrettier: eslintPluginPrettier,
  tseslint,
});

const serviceConfig = createServiceConfig({
  eslint: js,
  eslintPluginPrettierRecommended,
  globals,
  tsconfigRootDir: path.join(rootDir, 'service'),
  tseslint,
});

module.exports = [
  ...withScope(frontendConfig, 'frontend', ['frontend/**/*.{js,jsx,ts,tsx}']),
  ...withScope(serviceConfig, 'service', ['service/**/*.ts']),
];
