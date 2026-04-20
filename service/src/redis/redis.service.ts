import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import type { RedisClient } from './redis.types';

// Redis 基础服务的统一错误文案。
const REDIS_MISCONFIGURED_MESSAGE = 'Redis 未配置，请设置 REDIS_URL 环境变量';

// 统一收敛 Redis 连接与只读查询入口，避免业务层直接操作原始客户端。
@Injectable()
export class RedisService implements OnApplicationShutdown {
  private connectionPromise: Promise<RedisClient> | null = null;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null) {}

  // 提供显式连接入口，便于需要提前建连的调用方主动触发。
  async connect(): Promise<void> {
    await this.getConnectedClient();
  }

  // 通过 ping 检查当前 Redis 连接是否可用。
  async ping(): Promise<void> {
    const client = await this.getConnectedClient();
    await client.ping();
  }

  // 按 key 查询字符串值；未命中时返回 null。
  async getString(key: string): Promise<string | null> {
    const client = await this.getConnectedClient();
    return client.get(key);
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.redisClient?.isOpen) {
      return;
    }

    await this.redisClient.close();
  }

  // 惰性建立 Redis 连接，并在并发连接场景下复用同一个连接 Promise。
  private async getConnectedClient(): Promise<RedisClient> {
    if (!this.redisClient) {
      throw new Error(REDIS_MISCONFIGURED_MESSAGE);
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.redisClient.isReady || this.redisClient.isOpen) {
      return this.redisClient;
    }

    this.connectionPromise = this.redisClient
      .connect()
      .then(() => this.redisClient as RedisClient)
      .finally(() => {
        this.connectionPromise = null;
      });

    return this.connectionPromise;
  }
}

export { REDIS_MISCONFIGURED_MESSAGE };
