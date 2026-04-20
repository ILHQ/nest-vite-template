// Redis 目录的共享类型定义。
import type { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;
