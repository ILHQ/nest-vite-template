// 使用 symbol 作为注入 token，避免与其他 provider 名称冲突。
export const POSTGRES_POOL = Symbol('POSTGRES_POOL');
