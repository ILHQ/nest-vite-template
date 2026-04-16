const path = require('node:path');
const { readFileSync } = require('node:fs');
const { pathsToModuleNameMapper } = require('ts-jest');

const serviceRoot = path.resolve(__dirname, '..');
const tsconfigPath = path.join(serviceRoot, 'tsconfig.json');
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
const compilerOptions = tsconfig.compilerOptions ?? {};

function createModuleNameMapper(prefix = '<rootDir>/../') {
  return pathsToModuleNameMapper(compilerOptions.paths ?? {}, { prefix });
}

module.exports = {
  createModuleNameMapper,
};
