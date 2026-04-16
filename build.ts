const path = require('node:path');
const fs = require('node:fs');
const shell = require('shelljs');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const serviceDir = path.join(rootDir, 'service');
const distRootDir = path.join(rootDir, 'dist');
const outDir = path.join(distRootDir, 'out');
const outFrontendDir = path.join(outDir, 'frontend');
const outServiceDir = path.join(outDir, 'service');
const outBinDir = path.join(outDir, 'bin');
const rootPackagePath = path.join(rootDir, 'package.json');

// 执行 frontend 构建命令。
function buildFrontend(NODE_ENV: string): any {
  const result = shell.exec(`npm run build:${NODE_ENV}`, { cwd: frontendDir, env: process.env });
  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

// 执行 service 构建命令，生成 dist 产物。
function buildService(NODE_ENV: string): any {
  const result = shell.exec(`npm run build:${NODE_ENV}`, { cwd: serviceDir, env: process.env });
  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

// 删除根目录 dist 文件夹，并重新创建。
function cleanDistDir() {
  shell.rm('-rf', distRootDir);
  shell.mkdir('-p', distRootDir);
}

// 复制 dist 到根目录 dist/out/frontend。
function copyDistToOut() {
  const distCandidates = [path.join(frontendDir, 'dist'), path.join(rootDir, 'assets', 'dist')];
  const frontendDistDir = distCandidates.find((candidate) => shell.test('-d', candidate));

  if (!frontendDistDir) {
    shell.echo('未找到 dist 目录，请确认 frontend 构建输出路径。');
    shell.exit(1);
    return;
  }

  shell.mkdir('-p', outFrontendDir);
  shell.cp('-R', path.join(frontendDistDir, '.'), outFrontendDir);
}

// 复制 service 下除 dist 外的文件到 dist/out/service 目录。
function copyServiceFilesToOut() {
  const entries = shell.ls('-A', serviceDir);
  const excludedEntries = new Set(['dist', 'node_modules', '.DS_Store']);
  shell.mkdir('-p', outServiceDir);

  for (const entry of entries) {
    if (excludedEntries.has(entry) || entry.startsWith('npm-debug.log')) {
      continue;
    }

    shell.cp('-R', path.join(serviceDir, entry), outServiceDir);
  }
}

// 复制 service/dist 到 dist/out/service/dist
function copyServiceDistToOut() {
  const serviceDistDir = path.join(serviceDir, 'dist');

  if (!shell.test('-d', serviceDistDir)) {
    shell.echo('未找到 service/dist 目录，请确认 service 构建是否成功。');
    shell.exit(1);
    return;
  }

  shell.mkdir('-p', outServiceDir);
  shell.cp('-R', serviceDistDir, outServiceDir);
}

// 读取根目录 package.json。
function readRootPackageJson() {
  return JSON.parse(fs.readFileSync(rootPackagePath, 'utf-8'));
}

function padTimeUnit(value) {
  return String(value).padStart(2, '0');
}

// 生成发布时间后缀，格式为 YYYY-MM-DD_HH-mm-ss。
function createReleaseSuffix(date = new Date()) {
  const year = date.getFullYear();
  const month = padTimeUnit(date.getMonth() + 1);
  const day = padTimeUnit(date.getDate());
  const hour = padTimeUnit(date.getHours());
  const minute = padTimeUnit(date.getMinutes());
  const second = padTimeUnit(date.getSeconds());
  return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
}

// 写入 dist/out/package.json，保持根目录 package.json 原始内容。
function writeOutPackageJson(rootPkg) {
  const outPkgPath = path.join(outDir, 'package.json');
  fs.writeFileSync(outPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`);
}

// 在 dist/out/bin 下生成生产启动脚本。
function createOutStartScript(NODE_ENV:string): void {
  shell.mkdir('-p', outBinDir);
  const scriptPath = path.join(outBinDir, 'start.sh');
  const scriptContent = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../service"
npm run start:${NODE_ENV}
`;
  fs.writeFileSync(scriptPath, scriptContent);
  shell.chmod('+x', scriptPath);
}

// 在 dist 目录下打包 out 为 tar.gz，命名为 root package 的 name_时间后缀。
function archiveOutDirectory(rootPkg, releaseSuffix) {
  const archiveName = `${rootPkg.name}_${releaseSuffix}.tar.gz`;
  const archivePath = path.join(distRootDir, archiveName);
  shell.rm('-f', archivePath);

  const result = shell.exec(`tar -czf "${archivePath}" "out"`, { cwd: distRootDir });
  if (result.code !== 0) {
    shell.exit(result.code);
  }

  return archiveName;
}

// 打包完成后删除 dist/out，只保留归档与其他产物。
function removeOutDirectory() {
  shell.rm('-rf', outDir);
}

// 在 dist 目录生成 Dockerfile，用于解压 tar.gz 并启动服务。
function createDockerfile(archiveName) {
  const dockerfilePath = path.join(distRootDir, 'Dockerfile');
  const dockerfileContent = `FROM node:22-slim

ENV ARRANGE_PATH=/home/admin/source
WORKDIR $ARRANGE_PATH

COPY ${archiveName} ./

RUN tar -xzf ${archiveName} \\
  && rm -f ${archiveName} \\
  && corepack enable \\
  && corepack prepare pnpm@latest --activate \\
  && pnpm config set registry https://registry.npmmirror.com \\
  && npm config set registry https://registry.npmmirror.com \\
  && cd $ARRANGE_PATH/out/service \\
  && pnpm install --prod --frozen-lockfile \\
  && npm install pm2@latest -g

WORKDIR $ARRANGE_PATH/out/bin

EXPOSE 3000

CMD ["./start.sh"]
`;

  fs.writeFileSync(dockerfilePath, dockerfileContent);
}

// 在 dist 目录生成 docker-compose.yml，用于按固定镜像标签启动服务。
function createDockerComposeFile(rootPkg, releaseSuffix) {
  const composePath = path.join(distRootDir, 'docker-compose.yml');
  const composeContent = `name: ${rootPkg.name}

services:
  service:
    image: ${rootPkg.name}:${releaseSuffix}
    container_name: ${rootPkg.name}
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      SERVICE_PORT: "3000"
      LOG_DIR: "/home/admin/source/out/service/logs"
      LOG_LEVEL: "log"
      LOG_FILE_PREFIX: "service"
      LOG_TO_CONSOLE: "false"
    volumes:
      - "./docker-data/logs:/home/admin/source/out/service/logs"
`;

  fs.writeFileSync(composePath, composeContent);
}

// 执行 dockerBuild.ts，构建并导出镜像。
function runDockerBuildScript(releaseSuffix) {
  const dockerBuildScriptPath = path.join(rootDir, 'dockerBuild.ts');

  if (!shell.test('-f', dockerBuildScriptPath)) {
    shell.echo('未找到 dockerBuild.ts，跳过镜像构建。');
    return;
  }

  const result = shell.exec(`node "./dockerBuild.ts" "${releaseSuffix}"`, { cwd: rootDir });
  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

function main() {
  const rootPkg = readRootPackageJson();
  const releaseSuffix = createReleaseSuffix();
  shell.echo(
    `开始执行构建：NODE_ENV=${process.env.NODE_ENV}`,
  );
  cleanDistDir();
  buildFrontend(process.env.NODE_ENV);
  buildService(process.env.NODE_ENV);
  copyDistToOut();
  copyServiceFilesToOut();
  copyServiceDistToOut();
  writeOutPackageJson(rootPkg);
  createOutStartScript(process.env.NODE_ENV);
  const archiveName = archiveOutDirectory(rootPkg, releaseSuffix);
  removeOutDirectory();
  createDockerfile(archiveName);
  createDockerComposeFile(rootPkg, releaseSuffix);
  runDockerBuildScript(releaseSuffix);
  shell.echo(`已完成打包，产物目录：${distRootDir}`);
}

main();
