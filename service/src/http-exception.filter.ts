import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { appLogger } from './logger/app-logger';

type TraceableRequest = Request & {
  traceId?: string;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const request: TraceableRequest = ctx.getRequest<TraceableRequest>();
    const status: number =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const messageResponse: string =
      exception instanceof HttpException ? exception.message : '系统错误';
    const traceId = request.traceId ?? response.getHeader('x-trace-id');

    appLogger.logHttpException({
      traceId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: status,
      message: messageResponse,
      errorName: exception instanceof Error ? exception.name : 'UnknownError',
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message: messageResponse,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
