import { HttpException } from '@nestjs/common';
import envConfig from '@services/env';

// 统一定义项目内部 HTTP 报文结构与构造工具。
export type ApiErrorType = 'BUSINESS' | 'HTTP' | 'SYSTEM';

export type ApiSuccessResponse<T = unknown> = {
  data: T | null;
  errorCode: null;
  errorDesc: null;
  errorType: null;
  exceptionType: null;
  success: true;
};

export type ApiErrorResponse = {
  data: null;
  errorCode: string;
  errorDesc: string;
  errorType: ApiErrorType;
  exceptionType: string;
  success: false;
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

type HttpExceptionResponseBody =
  | string
  | {
      message?: string | string[];
      errorCode?: string;
      errorDesc?: string;
      errorType?: ApiErrorType;
      exceptionType?: string;
    };

function normalizePathname(requestPath: string): string {
  return requestPath.split('?')[0] || requestPath;
}

// 仅对项目自有接口启用统一报文，避免影响前端页面和外部代理透传。
export function shouldUseStandardResponse(requestPath: string): boolean {
  const pathname = normalizePathname(requestPath);

  if (pathname === '/health') {
    return true;
  }

  return (
    pathname.startsWith(`${envConfig.proxyPrefix}/`) &&
    !pathname.startsWith(`${envConfig.proxyPrefix}/api/`)
  );
}

export function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    'data' in candidate &&
    'errorCode' in candidate &&
    'errorDesc' in candidate &&
    'errorType' in candidate &&
    'exceptionType' in candidate &&
    'success' in candidate
  );
}

// 将成功返回值包装为统一成功报文。
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    data: data === undefined ? null : data,
    errorCode: null,
    errorDesc: null,
    errorType: null,
    exceptionType: null,
    success: true,
  };
}

function resolveHttpExceptionResponse(exception: HttpException): HttpExceptionResponseBody {
  return exception.getResponse() as HttpExceptionResponseBody;
}

// 根据异常来源推断错误分类，便于前端和日志统一处理。
function resolveErrorType(status: number, exception: unknown): ApiErrorType {
  if (exception instanceof HttpException) {
    return status >= 500 ? 'HTTP' : 'BUSINESS';
  }

  return 'SYSTEM';
}

function resolveErrorCode(
  status: number,
  errorType: ApiErrorType,
  exceptionResponse?: HttpExceptionResponseBody,
): string {
  if (
    exceptionResponse &&
    typeof exceptionResponse === 'object' &&
    typeof exceptionResponse.errorCode === 'string' &&
    exceptionResponse.errorCode.trim()
  ) {
    return exceptionResponse.errorCode;
  }

  if (errorType === 'BUSINESS') {
    return `BUSINESS_${status}`;
  }

  if (errorType === 'HTTP') {
    return `HTTP_${status}`;
  }

  return 'SYSTEM_ERROR';
}

// 优先读取业务定义的错误描述，缺失时回退到框架异常或系统默认文案。
function resolveErrorDesc(
  exception: unknown,
  exceptionResponse?: HttpExceptionResponseBody,
): string {
  if (
    exceptionResponse &&
    typeof exceptionResponse === 'object' &&
    typeof exceptionResponse.errorDesc === 'string' &&
    exceptionResponse.errorDesc.trim()
  ) {
    return exceptionResponse.errorDesc;
  }

  if (exceptionResponse && typeof exceptionResponse === 'object') {
    if (typeof exceptionResponse.message === 'string' && exceptionResponse.message.trim()) {
      return exceptionResponse.message;
    }

    if (Array.isArray(exceptionResponse.message) && exceptionResponse.message.length > 0) {
      return exceptionResponse.message.join(', ');
    }
  }

  if (typeof exceptionResponse === 'string' && exceptionResponse.trim()) {
    return exceptionResponse;
  }

  if (exception instanceof Error && exception.message.trim()) {
    return exception.message;
  }

  return '系统错误';
}

// 统一提取异常类型名称，便于排查问题。
function resolveExceptionType(
  exception: unknown,
  exceptionResponse?: HttpExceptionResponseBody,
): string {
  if (
    exceptionResponse &&
    typeof exceptionResponse === 'object' &&
    typeof exceptionResponse.exceptionType === 'string' &&
    exceptionResponse.exceptionType.trim()
  ) {
    return exceptionResponse.exceptionType;
  }

  if (exception instanceof Error && exception.name.trim()) {
    return exception.name;
  }

  if (exception && typeof exception === 'object' && exception.constructor?.name) {
    return exception.constructor.name;
  }

  return 'UnknownError';
}

// 将异常转换为统一失败报文。
export function createErrorResponse(status: number, exception: unknown): ApiErrorResponse {
  const exceptionResponse =
    exception instanceof HttpException ? resolveHttpExceptionResponse(exception) : undefined;
  const errorType =
    exceptionResponse &&
    typeof exceptionResponse === 'object' &&
    typeof exceptionResponse.errorType === 'string'
      ? exceptionResponse.errorType
      : resolveErrorType(status, exception);

  return {
    data: null,
    errorCode: resolveErrorCode(status, errorType, exceptionResponse),
    errorDesc: resolveErrorDesc(exception, exceptionResponse),
    errorType,
    exceptionType: resolveExceptionType(exception, exceptionResponse),
    success: false,
  };
}
