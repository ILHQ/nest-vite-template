import 'reflect-metadata';
import { ArgumentsHost, CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import envConfig from './../env';
import { BusinessController } from '../src/modules/business/business.controller';
import { BusinessService } from '../src/modules/business/business.service';
import { AllExceptionsFilter } from '../src/interceptor/http-exception.filter';
import { HttpResponseInterceptor } from '../src/interceptor/http-response.interceptor';
import { appLogger } from './../src/logger/app-logger';

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  getHeader: jest.Mock;
};

type TraceableRequest = {
  method: string;
  originalUrl: string;
  url: string;
  traceId?: string;
  errorLogged?: boolean;
};

function createExecutionContext(requestPath: string, handler: Function): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({
        originalUrl: requestPath,
        url: requestPath,
      }),
    }),
  } as unknown as ExecutionContext;
}

function createCallHandler(data: unknown): CallHandler {
  return {
    handle: () => of(data),
  };
}

function createMockResponse(): MockResponse {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    getHeader: jest.fn().mockReturnValue('trace-1'),
  } as MockResponse;

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  response.send.mockReturnValue(response);
  return response;
}

function createArgumentsHost(
  requestPath: string,
  handler: Function,
  response: MockResponse,
): ArgumentsHost {
  const request: TraceableRequest = {
    method: 'GET',
    originalUrl: requestPath,
    url: requestPath,
    traceId: 'trace-1',
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => handler,
  } as unknown as ArgumentsHost;
}

function captureException(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }

  throw new Error('预期抛出异常，但没有抛出');
}

describe('响应包装控制', () => {
  const reflector = new Reflector();
  const interceptor = new HttpResponseInterceptor(reflector);
  const filter = new AllExceptionsFilter(reflector);
  const controller = new BusinessController(new BusinessService());

  beforeEach(() => {
    jest.spyOn(appLogger, 'logHttpException').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('未标记装饰器的成功响应仍然包装', async () => {
    const context = createExecutionContext(
      `${envConfig.proxyPrefix}/business/test`,
      controller.proxyApi,
    );

    const result = await lastValueFrom(
      interceptor.intercept(context, createCallHandler(controller.proxyApi())),
    );

    expect(result).toEqual({
      data: 'test success',
      errorCode: null,
      errorDesc: null,
      errorType: null,
      exceptionType: null,
      success: true,
    });
  });

  it('未标记装饰器的异常响应仍然包装', () => {
    const response = createMockResponse();
    const exception = captureException(() => controller.businessError());
    const host = createArgumentsHost(
      `${envConfig.proxyPrefix}/business/error`,
      controller.businessError,
      response,
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      data: null,
      errorCode: 'BUSINESS_400',
      errorDesc: 'business error',
      errorType: 'BUSINESS',
      exceptionType: 'BadRequestException',
      success: false,
    });
  });

  it('标记装饰器的成功响应原样返回', async () => {
    const context = createExecutionContext(`${envConfig.proxyPrefix}/business/raw`, controller.rawResponse);

    const result = await lastValueFrom(
      interceptor.intercept(context, createCallHandler(controller.rawResponse())),
    );

    expect(result).toEqual({
      value: 'test success',
    });
  });

  it('标记装饰器的 HTTP 异常原样返回', () => {
    const response = createMockResponse();
    const exception = captureException(() => controller.rawHttpError());
    const host = createArgumentsHost(
      `${envConfig.proxyPrefix}/business/raw/http-error`,
      controller.rawHttpError,
      response,
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: 'raw http error',
      reason: 'INVALID_INPUT',
    });
  });

  it('标记装饰器的系统异常不进入标准报文', () => {
    const response = createMockResponse();
    const exception = captureException(() => controller.rawSystemError());
    const host = createArgumentsHost(
      `${envConfig.proxyPrefix}/business/raw/system-error`,
      controller.rawSystemError,
      response,
    );

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'raw system error',
    });
  });
});
