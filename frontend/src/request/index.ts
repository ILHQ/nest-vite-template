import { message } from 'antd';

type Primitive = string | number | boolean;
type QueryValue = Primitive | Primitive[] | null | undefined;

interface RequestConfig {
  url: string;
  method?: string;
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, QueryValue>;
  data?: unknown;
  body?: BodyInit | null;
  needCheckSuccess?: boolean;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

interface InternalRequestConfig extends Omit<RequestConfig, 'headers'> {
  method: string;
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
}

interface ResponsePayload<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  config: InternalRequestConfig;
  response: Response;
}

export interface StandardResponse<T = unknown> {
  data: T | null;
  errorCode: string | null;
  errorDesc: string | null;
  errorType: string | null;
  exceptionType: string | null;
  success: boolean;
}

interface InterceptorHandler<T> {
  fulfilled: (value: T) => T | Promise<T>;
  rejected?: (error: unknown) => unknown;
}

class InterceptorManager<T> {
  private handlers: InterceptorHandler<T>[] = [];

  use(fulfilled: InterceptorHandler<T>['fulfilled'], rejected?: InterceptorHandler<T>['rejected']) {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  forEach(callback: (handler: InterceptorHandler<T>) => void) {
    this.handlers.forEach(callback);
  }
}

interface RequestInstance {
  <T = unknown>(config: RequestConfig): Promise<T>;
  get<T = unknown>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<T>;
  delete<T = unknown>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<T>;
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, 'url' | 'method' | 'data'>,
  ): Promise<T>;
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, 'url' | 'method' | 'data'>,
  ): Promise<T>;
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<RequestConfig, 'url' | 'method' | 'data'>,
  ): Promise<T>;
  interceptors: {
    request: InterceptorManager<InternalRequestConfig>;
    response: InterceptorManager<ResponsePayload>;
  };
}

const DEFAULT_CONFIG = {
  baseURL: __APP_PROXY_PREFIX__,
  timeout: 60000, // 超时时间（毫秒）
};

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

const LOGIN_ERROR_CODES = ['110', 'account_not_login', 'account_login_expire'];

function isStandardResponse<T = unknown>(value: unknown): value is StandardResponse<T> {
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

function handleStandardResponseError(response: StandardResponse<unknown>): StandardResponse<unknown> {
  const errorDesc = response.errorDesc || '请求失败';
  message.error(errorDesc);

  if (response.errorCode && LOGIN_ERROR_CODES.includes(response.errorCode)) {
    localStorage.clear();
    location.href = '/login';
  }

  return response;
}

function extractStandardResponseFromError(error: unknown): StandardResponse<unknown> | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  if (isStandardResponse(error)) {
    return error;
  }

  const payload = error as ResponsePayload<unknown>;
  return isStandardResponse(payload.data) ? payload.data : null;
}

// 将 params 序列化为 query string，支持数组
const stringifyQueryParams = (params?: Record<string, QueryValue>) => {
  if (!params) {
    return '';
  }
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => {
        searchParams.append(key, String(item));
      });
      return;
    }
    searchParams.append(key, String(value));
  });
  return searchParams.toString();
};

// 统一拼接 baseURL、url 与 query 参数
const buildRequestUrl = (config: InternalRequestConfig) => {
  const queryString = stringifyQueryParams(config.params);
  const basePath = isAbsoluteUrl(config.url)
    ? config.url
    : `${config.baseURL.replace(/\/$/, '')}/${config.url.replace(/^\//, '')}`;
  if (!queryString) {
    return basePath;
  }
  return `${basePath}${basePath.includes('?') ? '&' : '?'}${queryString}`;
};

// 根据响应头优先按 JSON 解析，失败时回退到文本
const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

// 优先使用 body；否则根据 data 自动推断请求体
const resolveRequestBody = (
  config: InternalRequestConfig,
  headers: Record<string, string>,
): BodyInit | null | undefined => {
  if (config.body !== undefined) {
    return config.body;
  }
  if (config.data === undefined) {
    return undefined;
  }
  const method = config.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }
  if (
    typeof config.data === 'string' ||
    config.data instanceof Blob ||
    config.data instanceof FormData ||
    config.data instanceof URLSearchParams ||
    config.data instanceof ArrayBuffer ||
    ArrayBuffer.isView(config.data)
  ) {
    return config.data as BodyInit;
  }
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  return JSON.stringify(config.data);
};

const dispatchRequest = async (config: InternalRequestConfig): Promise<ResponsePayload> => {
  // 使用 AbortController 实现超时与外部取消的统一控制
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, config.timeout);
  const abortFromExternalSignal = () => controller.abort();
  if (config.signal) {
    if (config.signal.aborted) {
      controller.abort();
    } else {
      config.signal.addEventListener('abort', abortFromExternalSignal);
    }
  }
  const headers = { ...config.headers };
  const requestUrl = buildRequestUrl(config);
  const requestBody = resolveRequestBody(config, headers);

  try {
    const response = await fetch(requestUrl, {
      method: config.method.toUpperCase(),
      headers,
      body: requestBody,
      credentials: config.credentials,
      signal: controller.signal,
    });
    const data = await parseResponseBody(response);
    const payload: ResponsePayload = {
      data,
      status: response.status,
      headers: response.headers,
      config,
      response,
    };
    if (!response.ok) {
      return Promise.reject(payload);
    }
    return payload;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return Promise.reject(new Error('请求超时或已取消'));
    }
    return Promise.reject(error);
  } finally {
    window.clearTimeout(timeoutId);
    if (config.signal) {
      config.signal.removeEventListener('abort', abortFromExternalSignal);
    }
  }
};

const requestInterceptors = new InterceptorManager<InternalRequestConfig>();
const responseInterceptors = new InterceptorManager<ResponsePayload>();

const request = (async <T = unknown>(config: RequestConfig): Promise<T> => {
  // 合并默认配置，保持调用侧参数最小化
  const mergedConfig: InternalRequestConfig = {
    url: config.url,
    method: (config.method || 'GET').toUpperCase(),
    baseURL: config.baseURL || DEFAULT_CONFIG.baseURL,
    timeout: config.timeout || DEFAULT_CONFIG.timeout,
    headers: { ...(config.headers || {}) },
    params: config.params,
    data: config.data,
    body: config.body,
    needCheckSuccess: config.needCheckSuccess,
    credentials: config.credentials,
    signal: config.signal,
  };

  let requestChain: Promise<unknown> = Promise.resolve(mergedConfig);
  // 请求拦截器按注册顺序执行
  requestInterceptors.forEach((handler) => {
    requestChain = requestChain.then(handler.fulfilled, handler.rejected);
  });

  let responseChain: Promise<unknown> = requestChain.then(dispatchRequest);
  // 响应拦截器按注册顺序执行
  responseInterceptors.forEach((handler) => {
    responseChain = responseChain.then(handler.fulfilled, handler.rejected);
  });
  return responseChain as Promise<T>;
}) as RequestInstance;

request.get = (url, config = {}) => request({ ...config, url, method: 'GET' });
request.delete = (url, config = {}) => request({ ...config, url, method: 'DELETE' });
request.post = (url, data, config = {}) => request({ ...config, url, data, method: 'POST' });
request.put = (url, data, config = {}) => request({ ...config, url, data, method: 'PUT' });
request.patch = (url, data, config = {}) => request({ ...config, url, data, method: 'PATCH' });
request.interceptors = {
  request: requestInterceptors,
  response: responseInterceptors,
};

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.satoken = token;
    }
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['Tenant-Id'] = tenantId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器
request.interceptors.response.use(
  (response: ResponsePayload<unknown>) => {
    if (response?.config?.needCheckSuccess) {
      return response.data;
    }

    if (!isStandardResponse(response.data)) {
      return response.data;
    }

    if (response.data.success) {
      return response.data;
    }

    return Promise.reject(handleStandardResponseError(response.data));
  },
  (error) => {
    const standardResponse = extractStandardResponseFromError(error);

    if (standardResponse) {
      return Promise.reject(handleStandardResponseError(standardResponse));
    }

    const errorDesc = error instanceof Error ? error.message : '请求出错';
    message.error(errorDesc);
    console.error('请求出错：', error);
    return Promise.reject(error);
  },
);

export default request;
