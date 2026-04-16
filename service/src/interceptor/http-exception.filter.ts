import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { appLogger } from '@/logger/app-logger';
import { shouldLogHttpError } from '@/logger/log-policy';
import { createErrorResponse, shouldUseStandardResponse } from './http-response';
import { shouldSkipResponseWrap } from './skip-response-wrap.decorator';

type TraceableRequest = Request & {
  traceId?: string;
  errorLogged?: boolean;
};

// 全局异常过滤器：记录异常日志，并将失败响应统一为标准报文。
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly reflector: Reflector) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const request: TraceableRequest = ctx.getRequest<TraceableRequest>();
    const executionContext = host as ExecutionContext;
    const handler =
      typeof executionContext.getHandler === 'function' ? executionContext.getHandler() : undefined;
    const requestPath = request.originalUrl ?? request.url;
    const status: number =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const traceId = request.traceId ?? response.getHeader('x-trace-id');
    const shouldLogAsError = shouldLogHttpError(status);
    const errorResponse = createErrorResponse(status, exception);

    if (shouldLogAsError) {
      appLogger.logHttpException({
        traceId,
        method: request.method,
        path: requestPath,
        statusCode: status,
        message: errorResponse.errorDesc,
        errorName: exception instanceof Error ? exception.name : 'UnknownError',
        stack: exception instanceof Error ? exception.stack : undefined,
      });
      request.errorLogged = true;
    }

    if (shouldSkipResponseWrap(this.reflector, handler)) {
      this.replyRawError(response, status, exception);
      return;
    }

    // 非项目标准接口仍保持原有异常结构，避免影响 HTML 页面与代理透传。
    if (!shouldUseStandardResponse(requestPath)) {
      response.status(status).json({
        statusCode: status,
        message: errorResponse.errorDesc,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    response.status(status).json(errorResponse);
  }

  // 标记为跳过包装的接口，异常也保持原生输出。
  private replyRawError(response: Response, status: number, exception: unknown): void {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        response.status(status).send(exceptionResponse);
        return;
      }

      response.status(status).json(exceptionResponse);
      return;
    }

    response.status(status).json({
      statusCode: status,
      message:
        exception instanceof Error && exception.message.trim()
          ? exception.message
          : 'Internal server error',
    });
  }
}
