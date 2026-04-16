const path = require('node:path');
const { spawn } = require('node:child_process');

const serviceRoot = path.resolve(__dirname, '..');
const nestCliPath = require.resolve('@nestjs/cli/bin/nest.js');
const nestArgs = process.argv.slice(2);

// 开发态源码运行仍需在 Node 入口预加载 tsconfig-paths。
const child = spawn(process.execPath, ['-r', 'tsconfig-paths/register', nestCliPath, ...nestArgs], {
  cwd: serviceRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
