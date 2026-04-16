import type { Provider } from '@nestjs/common';
import { Pool, type PoolConfig } from 'pg';
import type { DatabaseConfig } from '@services/env';
import envConfig from '@services/env';
import { POSTGRES_POOL } from './database.constants';

// pg 驱动要求的秒/毫秒字段与模板配置并不完全一致，这里做一次转换。
function createPostgresPoolOptions(config: DatabaseConfig): PoolConfig {
  const maxLifetimeSeconds =
    config.pool.maxLifetimeMs > 0 ? Math.ceil(config.pool.maxLifetimeMs / 1000) : undefined;

  return {
    connectionString: config.url || undefined,
    min: config.pool.min,
    max: config.pool.max,
    idleTimeoutMillis: config.pool.idleTimeoutMs,
    connectionTimeoutMillis: config.pool.connectionTimeoutMs,
    allowExitOnIdle: config.pool.allowExitOnIdle,
    maxLifetimeSeconds,
    ssl: config.ssl,
  };
}

// 整个应用共享同一个 pg 连接池，避免在业务层重复创建连接。
export const postgresPoolProvider: Provider = {
  provide: POSTGRES_POOL,
  useFactory: () => new Pool(createPostgresPoolOptions(envConfig.database)),
};
