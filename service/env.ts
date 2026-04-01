import lodash from 'lodash';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type PackageJson = {
  name: string;
  description?: string;
};

const { merge } = lodash;

type RuntimePaths = {
  repoRoot: string;
  serviceRoot: string;
  serviceSrcRoot: string;
  servicePublicRoot: string;
  serviceDistRoot: string;
  frontendDistRoot: string;
};

// 定位应用根目录，兼容仓库内运行与 out 包内运行。
function resolveRepoRoot(): string {
  const candidates = [path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')];

  const repoRoot = candidates.find((candidate) => {
    const hasServiceProject = existsSync(path.join(candidate, 'service'));
    const hasFlatServiceFiles =
      existsSync(path.join(candidate, 'src')) && existsSync(path.join(candidate, 'nest-cli.json'));

    return (
      existsSync(path.join(candidate, 'package.json')) &&
      existsSync(path.join(candidate, 'frontend')) &&
      (hasServiceProject || hasFlatServiceFiles)
    );
  });

  if (!repoRoot) {
    throw new Error('无法定位仓库根目录');
  }

  return repoRoot;
}

// 根据目录布局解析运行时路径。
function resolveRuntimePaths(repoRoot: string): RuntimePaths {
  const nestedServiceRoot = path.join(repoRoot, 'service');
  const hasNestedService = existsSync(path.join(nestedServiceRoot, 'src'));
  const serviceRoot = hasNestedService ? nestedServiceRoot : repoRoot;

  return {
    repoRoot,
    serviceRoot,
    serviceSrcRoot: path.join(serviceRoot, 'src'),
    servicePublicRoot: path.join(serviceRoot, 'public'),
    serviceDistRoot: path.join(serviceRoot, 'dist'),
    frontendDistRoot: path.join(repoRoot, 'frontend', 'dist'),
  };
}

const repoRoot = resolveRepoRoot();
const runtimePaths = resolveRuntimePaths(repoRoot);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as PackageJson;
const routerPrefix = `/app/${pkg.name}`;

export default merge(
  {
    pkg,
    paths: runtimePaths,
    servicePort: 3000,
    frontendDevOrigin: 'http://127.0.0.1:3100',
    routerPrefix,
    proxyPrefix: `${routerPrefix}/proxy`,
    frontendAssetsPublicPath: `${routerPrefix}/frontend/dist/`,
  },
  // customConfig,
);
