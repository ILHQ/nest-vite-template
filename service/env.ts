import lodash from 'lodash';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type PackageJson = {
  name: string;
  description?: string;
};

const { merge } = lodash;

// 定位仓库根目录，兼容 ts 运行和 dist 运行两种目录结构。
function resolveRepoRoot(): string {
  const candidates = [path.resolve(__dirname, '..'), path.resolve(__dirname, '../..')];

  const repoRoot = candidates.find((candidate) => {
    return (
      existsSync(path.join(candidate, 'package.json')) &&
      existsSync(path.join(candidate, 'frontend')) &&
      existsSync(path.join(candidate, 'service'))
    );
  });

  if (!repoRoot) {
    throw new Error('无法定位仓库根目录');
  }

  return repoRoot;
}

const repoRoot = resolveRepoRoot();
const serviceRoot = path.join(repoRoot, 'service');
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as PackageJson;
const routerPrefix = `/app/${pkg.name}`;

export default merge(
  {
    pkg,
    paths: {
      repoRoot,
      serviceRoot,
      serviceSrcRoot: path.join(serviceRoot, 'src'),
    },
    servicePort: 3000,
    frontendDevOrigin: 'http://127.0.0.1:3100',
    routerPrefix,
    proxyPrefix: `${routerPrefix}/proxy`,
  },
  // customConfig,
);
