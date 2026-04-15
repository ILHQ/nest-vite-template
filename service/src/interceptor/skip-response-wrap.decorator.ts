import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_RESPONSE_WRAP_METADATA = 'skipResponseWrap';

// 标记控制器方法跳过统一响应包装。
export function SkipResponseWrap(): MethodDecorator {
  return SetMetadata(SKIP_RESPONSE_WRAP_METADATA, true);
}

// 统一读取方法上的跳过包装标记，避免重复定义元数据 key。
export function shouldSkipResponseWrap(reflector: Reflector, handler?: any): boolean {
  if (!handler) {
    return false;
  }

  return reflector.get<boolean>(SKIP_RESPONSE_WRAP_METADATA, handler);
}
