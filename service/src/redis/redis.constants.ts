// Redis 目录的共享常量定义。
// 使用 symbol 作为 Redis 客户端注入 token，避免与其他 provider 名称冲突。
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
