import envConfig from '@services/env';

type LogPolicy = {
  requestLogAllowlist: string[];
  log4xxAsError: boolean;
};

function escapeForRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function compilePathMatcher(pattern: string): RegExp {
  const escapedPattern = pattern
    .split('*')
    .map((segment) => escapeForRegex(segment))
    .join('.*');

  return new RegExp(`^${escapedPattern}$`);
}

// 在此集中维护日志策略配置。
export const logPolicy: Readonly<LogPolicy> = Object.freeze({
  requestLogAllowlist: [`${envConfig.routerPrefix}/proxy/api/*`],
  log4xxAsError: false,
});

const requestLogMatchers = logPolicy.requestLogAllowlist.map((pattern) =>
  compilePathMatcher(pattern),
);

export function normalizeRequestPath(rawPath: string): string {
  return rawPath.split('?')[0]?.split('#')[0] || '/';
}

export function shouldLogHttpRequest(rawPath: string): boolean {
  const requestPath = normalizeRequestPath(rawPath);
  return requestLogMatchers.some((matcher) => matcher.test(requestPath));
}

export function shouldLogHttpError(statusCode: number): boolean {
  return statusCode >= 500 || logPolicy.log4xxAsError;
}
