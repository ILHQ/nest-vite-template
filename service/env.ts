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

type EnvConfig = {
  pkg: PackageJson;
  paths: RuntimePaths;
  servicePort: number;
  frontendPort: number;
  logDir: string;
  logLevel: string;
  logFilePrefix: string;
  logToConsole: boolean;
  routerPrefix: string;
  proxyPrefix: string;
  frontendAssetsPublicPath: string;
  proxyApi: string;
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

// 将字符串端口转换为 number；非法值回退默认值。
function parsePort(rawPort: string | undefined, fallbackPort: number): number {
  if (!rawPort) {
    return fallbackPort;
  }

  const parsedPort = Number(rawPort);
  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : fallbackPort;
}

// 将字符串布尔值转换为 boolean；非法值回退默认值。
function parseBoolean(rawValue: string | undefined, fallbackValue: boolean): boolean {
  if (!rawValue) {
    return fallbackValue;
  }

  const normalizedValue = rawValue.toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return fallbackValue;
}

// 解析容器环境变量中的 JSON 配置，非法 JSON 时忽略。
function parseServiceEnvConfig(): Partial<EnvConfig> {
  const rawConfig = process.env.SERVICE_ENV_CONFIG;

  if (!rawConfig) {
    return {};
  }

  try {
    return JSON.parse(rawConfig) as Partial<EnvConfig>;
  } catch {
    return {};
  }
}

// 从 process.env 中提取覆盖项，并保持 router/proxy 的默认推导关系。
function resolveEnvOverrides(baseConfig: EnvConfig): Partial<EnvConfig> {
  const routerPrefix = process.env.ROUTER_PREFIX ?? baseConfig.routerPrefix;
  const proxyPrefix = process.env.PROXY_PREFIX ?? `${routerPrefix}/proxy`;
  const frontendAssetsPublicPath =
    process.env.FRONTEND_ASSETS_PUBLIC_PATH ?? `${routerPrefix}/frontend/dist/`;

  return {
    servicePort: parsePort(process.env.SERVICE_PORT, baseConfig.servicePort),
    frontendPort: parsePort(process.env.FRONTEND_PORT, baseConfig.frontendPort),
    logDir: process.env.LOG_DIR ?? baseConfig.logDir,
    logLevel: process.env.LOG_LEVEL ?? baseConfig.logLevel,
    logFilePrefix: process.env.LOG_FILE_PREFIX ?? baseConfig.logFilePrefix,
    logToConsole: parseBoolean(process.env.LOG_TO_CONSOLE, baseConfig.logToConsole),
    routerPrefix,
    proxyPrefix,
    frontendAssetsPublicPath,
  };
}

const repoRoot = resolveRepoRoot();
const runtimePaths = resolveRuntimePaths(repoRoot);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as PackageJson;
const routerPrefix = `/app/${pkg.name}`;

const baseConfig: EnvConfig = {
  pkg,
  paths: runtimePaths,
  servicePort: 3000,
  frontendPort: 3100,
  logDir: path.join(runtimePaths.serviceRoot, 'logs'),
  logLevel: 'log',
  logFilePrefix: 'service',
  logToConsole: false,
  routerPrefix, // 路由前缀
  proxyPrefix: `${routerPrefix}/proxy`, // 代理前缀 该前缀表明是从前端进入 再根据路径进行分发
  frontendAssetsPublicPath: `${routerPrefix}/frontend/dist/`,
  proxyApi: 'http://localhost:4000/test', // /api 代理地址
};

export default merge({}, baseConfig, resolveEnvOverrides(baseConfig), parseServiceEnvConfig());
