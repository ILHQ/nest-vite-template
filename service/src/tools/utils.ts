import process from 'node:process';

// IS_BUILD 仅表示当前是否运行构建产物（dist）。
export function isBuildRuntime(): boolean {
  return process.env.IS_BUILD === 'true';
}
