import lodash from 'lodash';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

type PackageJson = {
  name: string;
  description?: string;
};

const { merge } = lodash;

type RuntimePaths = {
  // 仓库根目录，用于定位 frontend、service 等顶层目录。
  repoRoot: string;
  // service 项目根目录，兼容 service 独立目录与平铺目录两种布局。
  serviceRoot: string;
  // service 源码目录，主要用于模板、模块和静态资源路径拼接。
  serviceSrcRoot: string;
  // service/public 本地静态资源目录。
  servicePublicRoot: string;
  // service 构建产物目录。
  serviceDistRoot: string;
  // frontend 构建产物目录，生产环境下用于托管前端静态文件。
  frontendDistRoot: string;
};

export type DatabasePoolConfig = {
  // 连接池最小保活连接数，用于降低低频请求场景下的建连抖动。
  min: number;
  // 连接池最大连接数，用于限制服务占用 PostgreSQL 的并发连接规模。
  max: number;
  // 单个空闲连接允许保留的最长时间，超过后会被连接池回收。
  idleTimeoutMs: number;
  // 获取连接时的超时时间，避免连接池耗尽时请求无限等待。
  connectionTimeoutMs: number;
  // 单个连接的最大生命周期，超过后会被轮换；`0` 表示不主动轮换。
  maxLifetimeMs: number;
  // 允许连接池在全部连接空闲时不阻塞 Node 进程退出。
  allowExitOnIdle: boolean;
};

export type DatabaseConfig = {
  // 当前模板固定使用 PostgreSQL，保留 provider 字段便于后续扩展。
  provider: 'postgresql';
  // PostgreSQL 连接串，对 Prisma 和原生 pg 都是唯一数据源入口。
  url: string;
  // 是否开启数据库 SSL，通常生产环境托管数据库需要打开。
  ssl: boolean;
  // 原生 pg 连接池参数，统一供健康检查和复杂 SQL 场景复用。
  pool: DatabasePoolConfig;
};

type EnvConfig = {
  // 仓库 package.json 中读取到的基础信息，主要用于拼接路由前缀和页面标题。
  pkg: PackageJson;
  // 运行时目录集合，集中管理所有需要动态推导的路径。
  paths: RuntimePaths;
  // Nest HTTP 服务监听端口，对应环境变量 `SERVICE_PORT`。
  servicePort: number;
  // Vite 开发服务端口，仅开发环境代理前端资源时使用。
  frontendPort: number;
  // 日志文件输出目录，对应环境变量 `LOG_DIR`。
  logDir: string;
  // 最低日志级别，对应环境变量 `LOG_LEVEL`。
  logLevel: string;
  // 日志文件名前缀，用于区分不同服务或运行实例。
  logFilePrefix: string;
  // 是否在控制台输出日志；生产环境默认关闭，开发环境通常打开。
  logToConsole: boolean;
  // 当前模板的前端根路由前缀，默认格式为 `/app/<package-name>`。
  routerPrefix: string;
  // 进入后端代理逻辑的统一前缀，默认在 routerPrefix 下继续挂 `/proxy`。
  proxyPrefix: string;
  // 生产环境前端构建资源对外暴露的公共路径前缀。
  frontendAssetsPublicPath: string;
  // 后端 `/api` 代理目标地址，用于将请求转发到真实业务 API 服务。
  proxyApi: string;
  // 数据库总配置，统一提供给 Prisma、pg 连接池和健康检查使用。
  database: DatabaseConfig;
};

type EnvFileEntry = {
  key: string;
  value: string;
};

// 加载 service 目录下的环境变量文件，允许 mode 文件覆盖基础 .env。
// 优先尊重外部注入的 process.env，避免覆盖容器或启动命令显式传入的值。
function loadEnvironmentFiles(): void {
  const initialEnvKeys = new Set(Object.keys(process.env));
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const candidateDirs = [__dirname, path.resolve(__dirname, '..')];
  const envFiles = candidateDirs.flatMap((dirPath) => [
    path.join(dirPath, '.env'),
    path.join(dirPath, `.env.${nodeEnv}`),
  ]);

  for (const envFile of Array.from(new Set(envFiles))) {
    if (!existsSync(envFile)) {
      continue;
    }

    const fileContent = readFileSync(envFile, 'utf-8');
    const entries = fileContent
      .split(/\r?\n/)
      .map((line) => parseEnvLine(line))
      .filter((entry): entry is EnvFileEntry => entry !== null);

    for (const entry of entries) {
      if (!initialEnvKeys.has(entry.key) || process.env[entry.key] === undefined) {
        process.env[entry.key] = entry.value;
      }
    }
  }
}

function parseEnvLine(line: string): EnvFileEntry | null {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const normalizedLine = trimmedLine.startsWith('export ')
    ? trimmedLine.slice('export '.length)
    : trimmedLine;
  const separatorIndex = normalizedLine.indexOf('=');

  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalizedLine.slice(0, separatorIndex).trim();
  let value = normalizedLine.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return key ? { key, value } : null;
}

loadEnvironmentFiles();

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

// 环境变量统一按整数解析，不合法时回退默认值。
function parseInteger(rawValue: string | undefined, fallbackValue: number, minValue = 0): number {
  if (!rawValue) {
    return fallbackValue;
  }

  const parsedValue = Number(rawValue);
  return Number.isInteger(parsedValue) && parsedValue >= minValue ? parsedValue : fallbackValue;
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

// 将模板约定的数据库环境变量整理成统一配置对象。
// 这里负责把分散的环境变量收敛成应用内部统一使用的 database 配置。
function resolveDatabaseConfig(rawEnv: NodeJS.ProcessEnv): DatabaseConfig {
  const poolMax = parseInteger(rawEnv.DB_POOL_MAX, 10, 1);
  const poolMin = parseInteger(rawEnv.DB_POOL_MIN, 0, 0);

  return {
    // 当前模板固定使用 PostgreSQL，保留该字段用于标识数据库类型。
    provider: 'postgresql',
    // 数据库连接串，供 Prisma 和原生 pg 连接池共同使用。
    url: rawEnv.DATABASE_URL ?? '',
    // 是否通过 SSL 连接数据库，常用于生产环境托管数据库。
    ssl: parseBoolean(rawEnv.DB_SSL, false),
    pool: {
      // 连接池最小保活连接数，降低低频流量时的重复建连开销。
      min: Math.min(poolMin, poolMax),
      // 连接池最大连接数，用于限制服务对数据库的并发连接占用。
      max: poolMax,
      // 空闲连接的最长保留时间，超时后连接池会自动回收。
      idleTimeoutMs: parseInteger(rawEnv.DB_IDLE_TIMEOUT_MS, 10000, 0),
      // 获取连接时的超时时间，避免连接池耗尽后无限等待。
      connectionTimeoutMs: parseInteger(rawEnv.DB_CONNECTION_TIMEOUT_MS, 5000, 0),
      // 单个连接的最大生命周期，超过后会被轮换；0 表示不主动轮换。
      maxLifetimeMs: parseInteger(rawEnv.DB_MAX_LIFETIME_MS, 0, 0),
      // 允许全部连接空闲时不阻塞 Node 进程退出。
      allowExitOnIdle: parseBoolean(rawEnv.DB_ALLOW_EXIT_ON_IDLE, false),
    },
  };
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
// 这里的字段都是“可以被环境变量直接覆盖”的公开配置入口。
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
    proxyApi: process.env.PROXY_API ?? baseConfig.proxyApi,
    database: resolveDatabaseConfig(process.env),
  };
}

const repoRoot = resolveRepoRoot();
const runtimePaths = resolveRuntimePaths(repoRoot);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as PackageJson;
const routerPrefix = `/app/${pkg.name}`;

const baseConfig: EnvConfig = {
  // 读取仓库根 package.json，作为模板级默认元信息来源。
  pkg,
  // 所有运行时路径都通过推导得到，避免在代码里散落路径拼接。
  paths: runtimePaths,
  // 后端服务默认监听 3000，可用 `SERVICE_PORT` 覆盖。
  servicePort: 3000,
  // 前端开发服务默认监听 3100，可用 `FRONTEND_PORT` 覆盖。
  frontendPort: 3100,
  // 默认将日志写入 service/logs。
  logDir: path.join(runtimePaths.serviceRoot, 'logs'),
  // 默认记录到普通 `log` 级别；可通过 `LOG_LEVEL` 提高或降低输出量。
  logLevel: 'log',
  // 日志文件默认前缀为 service，便于按天滚动时识别来源。
  logFilePrefix: 'service',
  // 生产环境默认不输出到控制台，避免与文件日志重复。
  logToConsole: false,
  // 前端主路由前缀，默认形如 `/app/nest-vite-template`。
  routerPrefix,
  // 代理前缀，标识“从前端进入再由 service 分发”的请求。
  proxyPrefix: `${routerPrefix}/proxy`,
  // 前端打包资源对外暴露的 URL 前缀，生产环境模板渲染时会用到。
  frontendAssetsPublicPath: `${routerPrefix}/frontend/dist/`,
  // `/api` 的默认代理目标地址，通常需要按实际后端服务改写。
  proxyApi: 'http://localhost:4000/test',
  // 数据库默认读取当前 process.env；若未配置 DATABASE_URL，会得到空连接串。
  database: resolveDatabaseConfig(process.env),
};

// 最终配置合并顺序：
// 1. baseConfig 默认值
// 2. 常规环境变量覆盖
// 3. SERVICE_ENV_CONFIG JSON 覆盖
export default merge({}, baseConfig, resolveEnvOverrides(baseConfig), parseServiceEnvConfig());
