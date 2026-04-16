import type { LoggerService } from '@nestjs/common';
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import envConfig from '../../env';

type AppLogLevel = 'fatal' | 'error' | 'warn' | 'log' | 'debug' | 'verbose';

type LogMetadata = Record<string, unknown>;
type WriteOptions = {
  forceConsole?: boolean;
};

const SENSITIVE_KEYWORDS = ['authorization', 'cookie', 'token', 'password', 'set-cookie'];

const LOG_LEVEL_PRIORITY: Record<AppLogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  log: 3,
  debug: 4,
  verbose: 5,
};

function normalizeLogLevel(rawLevel: string): AppLogLevel {
  const normalized = rawLevel.toLowerCase();

  if (normalized === 'info') {
    return 'log';
  }

  if (normalized in LOG_LEVEL_PRIORITY) {
    return normalized as AppLogLevel;
  }

  return 'log';
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shouldMaskKey(key: string): boolean {
  const lowerCaseKey = key.toLowerCase();
  return SENSITIVE_KEYWORDS.some((keyword) => lowerCaseKey.includes(keyword));
}

function redactSensitiveData(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item));
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  const clonedRecord: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (shouldMaskKey(key)) {
      clonedRecord[key] = '[REDACTED]';
      continue;
    }

    clonedRecord[key] = redactSensitiveData(value);
  }

  return clonedRecord;
}

function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }

  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
}

function safeJsonStringify(input: unknown): string {
  try {
    return JSON.stringify(input);
  } catch {
    return JSON.stringify({ message: '日志序列化失败' });
  }
}

function parseBooleanFlag(rawValue: string | undefined, fallbackValue: boolean): boolean {
  if (!rawValue) {
    return fallbackValue;
  }

  const normalizedValue = rawValue.toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }
  return fallbackValue;
}

class AppLogger implements LoggerService {
  private stream: WriteStream | null = null;
  private activeDate: string | null = null;
  private readonly minLevel: AppLogLevel;
  private readonly logDir: string;
  private readonly logFilePrefix: string;
  private readonly logToFile: boolean;
  private readonly logToConsole: boolean;

  constructor() {
    // 是否是构建环境
    const isBuild = process.env.IS_BUILD === 'true';
    const defaultLogToFile = !isBuild;
    const defaultLogToConsole = isBuild ? true : envConfig.logToConsole;

    this.minLevel = normalizeLogLevel(envConfig.logLevel);
    this.logDir = path.resolve(envConfig.logDir);
    this.logFilePrefix = envConfig.logFilePrefix;
    this.logToFile = parseBooleanFlag(process.env.LOG_TO_FILE, defaultLogToFile);
    this.logToConsole = parseBooleanFlag(process.env.LOG_TO_CONSOLE, defaultLogToConsole);
  }

  log(message: unknown, context?: string): void {
    this.write('log', normalizeMessage(message), { context });
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const trace = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    const context = typeof optionalParams[1] === 'string' ? optionalParams[1] : undefined;
    this.write('error', normalizeMessage(message), { context, trace });
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', normalizeMessage(message), { context });
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', normalizeMessage(message), { context });
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', normalizeMessage(message), { context });
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', normalizeMessage(message), { context });
  }

  // 启动阶段日志在生产环境也输出到控制台，便于快速定位服务状态。
  logStartup(message: unknown, context = 'Bootstrap'): void {
    this.write('log', normalizeMessage(message), { context }, { forceConsole: true });
  }

  // 启动阶段告警在生产环境也输出到控制台。
  warnStartup(message: unknown, context = 'Bootstrap'): void {
    this.write('warn', normalizeMessage(message), { context }, { forceConsole: true });
  }

  // 统一记录 HTTP 请求日志。
  logHttpRequest(metadata: LogMetadata): void {
    this.write('log', 'HTTP_REQUEST', metadata);
  }

  // 统一记录 HTTP 异常日志。
  logHttpException(metadata: LogMetadata): void {
    this.write('error', 'HTTP_EXCEPTION', metadata);
  }

  private write(
    level: AppLogLevel,
    message: string,
    metadata: LogMetadata,
    options: WriteOptions = {},
  ): void {
    if (!this.shouldWrite(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const payload = redactSensitiveData({
      timestamp,
      level,
      message,
      ...metadata,
    });

    const line = `${safeJsonStringify(payload)}\n`;
    if (this.logToFile) {
      this.writeToFile(line);
    }

    if (this.logToConsole || options.forceConsole) {
      process.stdout.write(line);
    }
  }

  private shouldWrite(level: AppLogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private writeToFile(line: string): void {
    const stream = this.getOrCreateStream();
    stream.write(line);
  }

  private getOrCreateStream(): WriteStream {
    const today = formatDateYYYYMMDD(new Date());

    if (this.stream && this.activeDate === today) {
      return this.stream;
    }

    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }

    mkdirSync(this.logDir, { recursive: true });
    const logPath = path.join(this.logDir, `${this.logFilePrefix}-${today}.log`);
    this.stream = createWriteStream(logPath, { flags: 'a' });
    this.activeDate = today;
    return this.stream;
  }
}

export const appLogger = new AppLogger();

// 为请求链路生成 traceId。
export function createTraceId(): string {
  return randomUUID();
}
