import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createSuccessResponse, isApiResponse, shouldUseStandardResponse } from './http-response';
import { shouldSkipResponseWrap } from './skip-response-wrap.decorator';

// 全局成功响应拦截器：把控制器返回值统一包装为标准报文。
@Injectable()
export class HttpResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  // 仅处理需要统一协议的 HTTP 请求。
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    if (shouldSkipResponseWrap(this.reflector, context.getHandler())) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestPath = request.originalUrl ?? request.url;

    if (!shouldUseStandardResponse(requestPath)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 已经是标准报文时直接透传，避免重复包装。
        if (isApiResponse(data)) {
          return data;
        }

        return createSuccessResponse(data);
      }),
    );
  }
}
