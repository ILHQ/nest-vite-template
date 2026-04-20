import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

type PackageJson = {
  name: string;
  description?: string;
};

function deepMerge<T extends Record<string, unknown>>(...sources: Array<Partial<T>>): T {
  const result: Record<string, unknown> = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [key, value] of Object.entries(source)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        result[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

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

export type RedisConfig = {
  // Redis 连接串；作为 Redis 客户端的唯一配置入口。
  url: string;
};

type EnvConfig = {
  // 仓库 package.json 中读取到的基础信息；固定由代码读取，不允许环境变量覆盖。
  pkg: PackageJson;
  // 运行时目录集合；固定由代码推导，不允许环境变量覆盖。
  paths: RuntimePaths;
  // Nest HTTP 服务监听端口，对应环境变量 `SERVICE_PORT`。
  servicePort: number;
  // Vite 开发服务端口，对应环境变量 `FRONTEND_PORT`。
  frontendPort: number;
  // 日志文件输出目录；固定按运行目录推导，不允许环境变量覆盖。
  logDir: string;
  // 最低日志级别，对应环境变量 `LOG_LEVEL`。
  logLevel: string;
  // 日志文件名前缀，对应环境变量 `LOG_FILE_PREFIX`。
  logFilePrefix: string;
  // 是否在控制台输出日志，对应环境变量 `LOG_TO_CONSOLE`。
  logToConsole: boolean;
  // 当前模板的前端根路由前缀；固定由包名推导，不允许环境变量覆盖。
  routerPrefix: string;
  // 进入后端代理逻辑的统一前缀；固定由 routerPrefix 推导，不允许环境变量覆盖。
  proxyPrefix: string;
  // 生产环境前端构建资源对外暴露的公共路径前缀；固定由 routerPrefix 推导，不允许环境变量覆盖。
  frontendAssetsPublicPath: string;
  // 后端 `/api` 代理目标地址，对应环境变量 `PROXY_API`。
  proxyApi: string;
  // 数据库总配置，对应环境变量 `DATABASE_URL`、`DB_SSL`、`DB_POOL_MAX`、`DB_POOL_MIN`、
  // `DB_IDLE_TIMEOUT_MS`、`DB_CONNECTION_TIMEOUT_MS`、`DB_MAX_LIFETIME_MS`、`DB_ALLOW_EXIT_ON_IDLE`。
  database: DatabaseConfig;
  // Redis 配置，对应环境变量 `REDIS_URL`。
  redis: RedisConfig;
  // 是否启用全局速率限制，对应环境变量 `ENABLE_THROTTLE`。
  enableThrottle: boolean;
};

type EnvFileEntry = {
  key: string;
  value: string;
};

// 加载 service 目录下的环境变量文件。
// 优先级为：启动前已注入的 process.env > `.env.${NODE_ENV}` > `.env`。
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
// 这里负责把 `DATABASE_URL`、`DB_SSL` 与各项 `DB_*` 连接池变量收敛为统一配置。
function resolveDatabaseConfig(rawEnv: NodeJS.ProcessEnv): DatabaseConfig {
  const poolMax = parseInteger(rawEnv.DB_POOL_MAX, 10, 1);
  const poolMin = parseInteger(rawEnv.DB_POOL_MIN, 0, 0);

  return {
    // 当前模板固定使用 PostgreSQL；不提供环境变量覆盖入口。
    provider: 'postgresql',
    // 数据库连接串，对应环境变量 `DATABASE_URL`。
    url: rawEnv.DATABASE_URL ?? '',
    // 是否通过 SSL 连接数据库，对应环境变量 `DB_SSL`。
    ssl: parseBoolean(rawEnv.DB_SSL, false),
    pool: {
      // 连接池最小保活连接数，对应环境变量 `DB_POOL_MIN`。
      min: Math.min(poolMin, poolMax),
      // 连接池最大连接数，对应环境变量 `DB_POOL_MAX`。
      max: poolMax,
      // 空闲连接的最长保留时间，对应环境变量 `DB_IDLE_TIMEOUT_MS`。
      idleTimeoutMs: parseInteger(rawEnv.DB_IDLE_TIMEOUT_MS, 10000, 0),
      // 获取连接时的超时时间，对应环境变量 `DB_CONNECTION_TIMEOUT_MS`。
      connectionTimeoutMs: parseInteger(rawEnv.DB_CONNECTION_TIMEOUT_MS, 5000, 0),
      // 单个连接的最大生命周期，对应环境变量 `DB_MAX_LIFETIME_MS`。
      maxLifetimeMs: parseInteger(rawEnv.DB_MAX_LIFETIME_MS, 0, 0),
      // 允许全部连接空闲时不阻塞 Node 进程退出，对应环境变量 `DB_ALLOW_EXIT_ON_IDLE`。
      allowExitOnIdle: parseBoolean(rawEnv.DB_ALLOW_EXIT_ON_IDLE, false),
    },
  };
}

// Redis 统一使用连接串作为唯一入口，避免 host/port/db 等多组变量分裂。
function resolveRedisConfig(rawEnv: NodeJS.ProcessEnv): RedisConfig {
  return {
    url: rawEnv.REDIS_URL ?? '',
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

// 从 process.env 中提取允许覆盖的字段。
// 这里的字段都是“可以被环境变量直接覆盖”的公开配置入口。
function resolveEnvOverrides(baseConfig: EnvConfig): Partial<EnvConfig> {
  return {
    servicePort: parsePort(process.env.SERVICE_PORT, baseConfig.servicePort),
    frontendPort: parsePort(process.env.FRONTEND_PORT, baseConfig.frontendPort),
    logLevel: process.env.LOG_LEVEL ?? baseConfig.logLevel,
    logFilePrefix: process.env.LOG_FILE_PREFIX ?? baseConfig.logFilePrefix,
    logToConsole: parseBoolean(process.env.LOG_TO_CONSOLE, baseConfig.logToConsole),
    proxyApi: process.env.PROXY_API ?? baseConfig.proxyApi,
    database: resolveDatabaseConfig(process.env),
    redis: resolveRedisConfig(process.env),
    enableThrottle: parseBoolean(process.env.ENABLE_THROTTLE, baseConfig.enableThrottle),
  };
}

const repoRoot = resolveRepoRoot();
const runtimePaths = resolveRuntimePaths(repoRoot);
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')) as PackageJson;
const routerPrefix = `/app/${pkg.name}`;

const baseConfig: EnvConfig = {
  // 读取仓库根 package.json，作为模板级默认元信息来源；不允许环境变量覆盖。
  pkg,
  // 所有运行时路径都通过推导得到；不允许环境变量覆盖。
  paths: runtimePaths,
  // 前端主路由前缀，默认形如 `/app/nest-vite-template`；不允许环境变量覆盖。
  routerPrefix,
  // 代理前缀，标识“从前端进入再由 service 分发”的请求；不允许环境变量覆盖。
  proxyPrefix: `${routerPrefix}/proxy`,
  // 前端打包资源对外暴露的 URL 前缀；不允许环境变量覆盖。
  frontendAssetsPublicPath: `${routerPrefix}/frontend/dist/`,
  // 默认将日志写入 service/logs；不允许环境变量覆盖。
  logDir: path.join(runtimePaths.serviceRoot, 'logs'),
  // 后端服务默认监听 3000，可用 `SERVICE_PORT` 覆盖。
  servicePort: 3000,
  // 前端开发服务默认监听 3100，可用 `FRONTEND_PORT` 覆盖。
  frontendPort: 3100,
  // 默认记录到普通 `log` 级别；可通过 `LOG_LEVEL` 提高或降低输出量。
  logLevel: 'log',
  // 日志文件默认前缀为 service；可通过 `LOG_FILE_PREFIX` 覆盖。
  logFilePrefix: 'service',
  // 生产环境默认不输出到控制台；可通过 `LOG_TO_CONSOLE` 覆盖。
  logToConsole: false,
  // `/api` 的默认代理目标地址；可通过 `PROXY_API` 覆盖。
  proxyApi: 'http://localhost:4000/test',
  // 数据库默认从 `DATABASE_URL`、`DB_SSL` 与各项 `DB_*` 变量组装；未配置时使用默认值。
  database: resolveDatabaseConfig(process.env),
  // Redis 默认从 `REDIS_URL` 读取；未配置时留空，由调用侧决定是否启用。
  redis: resolveRedisConfig(process.env),
  // 全局速率限制默认关闭，使用者按需通过 `ENABLE_THROTTLE` 开启。
  enableThrottle: false,
};

// 最终配置合并顺序：
// 1. baseConfig 默认值
// 2. 常规环境变量覆盖
// 3. SERVICE_ENV_CONFIG JSON 覆盖
export default deepMerge({}, baseConfig, resolveEnvOverrides(baseConfig), parseServiceEnvConfig());
