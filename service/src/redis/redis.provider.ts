import { Logger, type Provider } from '@nestjs/common';
import { createClient } from 'redis';
import envConfig from '@services/env';
import { REDIS_CLIENT } from './redis.constants';
import type { RedisClient } from './redis.types';

const redisLogger = new Logger('RedisClient');

// 根据运行时配置创建 Redis 客户端实例。
function createRedisClient(): RedisClient | null {
  const redisUrl = envConfig.redis.url.trim();

  // 未配置 Redis 时返回空实现，由业务调用时再感知配置缺失。
  if (!redisUrl) {
    return null;
  }

  const client = createClient({ url: redisUrl });
  client.on('error', (error) => {
    redisLogger.error(error.message, error.stack);
  });

  return client;
}

// 整个应用共享同一个 Redis 客户端，避免在业务层重复创建连接。
export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: createRedisClient,
};
