const path = require('node:path');
const { spawnSync } = require('node:child_process');

const serviceRoot = path.resolve(__dirname, '..');
const shouldForceGenerate = process.argv.includes('--force');

if (!shouldForceGenerate && process.env.SKIP_PRISMA_GENERATE === 'true') {
  console.log('SKIP_PRISMA_GENERATE=true，跳过 Prisma Client 生成。');
  process.exit(0);
}

let prismaCliPath;

try {
  prismaCliPath = require.resolve('prisma/build/index.js');
} catch (error) {
  console.error('未找到 prisma CLI，请先安装完整依赖后再生成 Prisma Client。');
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaCliPath, 'generate'], {
  cwd: serviceRoot,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
