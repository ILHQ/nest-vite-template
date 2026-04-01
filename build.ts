const path = require('node:path');
const fs = require('node:fs');
const shell = require('shelljs');

const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const serviceDir = path.join(rootDir, 'service');
const outDir = path.join(rootDir, 'out');
const outFrontendDir = path.join(outDir, 'frontend');
const outServiceDir = path.join(outDir, 'service');
const outBinDir = path.join(outDir, 'bin');
const rootPackagePath = path.join(rootDir, 'package.json');

// 执行 frontend 构建命令。
function buildFrontend() {
  const result = shell.exec('npm run build', { cwd: frontendDir });
  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

// 执行 service 构建命令，生成 dist 产物。
function buildService() {
  const result = shell.exec('npm run build', { cwd: serviceDir });
  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

// 删除根目录 out 文件夹。
function cleanOutDir() {
  shell.rm('-rf', outDir);
}

// 复制 dist 到根目录 out/frontend。
function copyDistToOut() {
  const distCandidates = [path.join(frontendDir, 'dist'), path.join(rootDir, 'assets', 'dist')];
  const distDir = distCandidates.find((candidate) => shell.test('-d', candidate));

  if (!distDir) {
    shell.echo('未找到 dist 目录，请确认 frontend 构建输出路径。');
    shell.exit(1);
    return;
  }

  shell.mkdir('-p', outFrontendDir);
  shell.cp('-R', path.join(distDir, '.'), outFrontendDir);
}

// 复制 service 下除 dist 外的文件到 out/service 目录。
function copyServiceFilesToOut() {
  const entries = shell.ls('-A', serviceDir);
  shell.mkdir('-p', outServiceDir);

  for (const entry of entries) {
    if (entry === 'dist') {
      continue;
    }

    shell.cp('-R', path.join(serviceDir, entry), outServiceDir);
  }
}

// 复制 service/dist 到 out/service/dist，供 start:prod 运行。
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

// 仅递增 patch 版本号（+0.0.1），保持前两位不变。
function increasePatchVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);

  if (!match) {
    return version;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]) + 1;
  const suffix = match[4] ?? '';
  return `${major}.${minor}.${patch}${suffix}`;
}

// 写入 out/package.json，version 自动 +0.0.1。
function writeOutPackageJson(rootPkg, releaseVersion) {
  const outPkgPath = path.join(outDir, 'package.json');
  const outPkg = { ...rootPkg, version: releaseVersion };
  fs.writeFileSync(outPkgPath, `${JSON.stringify(outPkg, null, 2)}\n`);
}

// 回写根目录 package.json，保持版本与打包产物一致。
function writeRootPackageJson(rootPkg, releaseVersion) {
  const nextRootPkg = { ...rootPkg, version: releaseVersion };
  fs.writeFileSync(rootPackagePath, `${JSON.stringify(nextRootPkg, null, 2)}\n`);
}

// 在 out/bin 下生成生产启动脚本。
function createOutStartScript() {
  shell.mkdir('-p', outBinDir);
  const scriptPath = path.join(outBinDir, 'start.sh');
  const scriptContent = `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/../service"
npm run start:prod
`;
  fs.writeFileSync(scriptPath, scriptContent);
  shell.chmod('+x', scriptPath);
}

// 打包 out 为 zip，命名为 root package 的 name_version。
function zipOutDirectory(rootPkg, releaseVersion) {
  const zipName = `${rootPkg.name}_${releaseVersion}.zip`;
  const zipPath = path.join(rootDir, zipName);
  shell.rm('-f', zipPath);

  const result = shell.exec(`zip -rq "${zipPath}" "out"`, { cwd: rootDir });
  if (result.code !== 0) {
    shell.exit(result.code);
  }

  return zipName;
}

// 删除 out 目录，只保留打包后的 zip。
function removeOutDirectory() {
  shell.rm('-rf', outDir);
}

// 在根目录生成 Dockerfile，用于解压 zip 并启动服务。
function createDockerfile(zipName) {
  const dockerfilePath = path.join(rootDir, 'Dockerfile');
  const dockerfileContent = `FROM node:22-slim

ENV ARRANGE_PATH=/home/admin/source
WORKDIR $ARRANGE_PATH

COPY ${zipName} ./

RUN apt-get update \\
  && apt-get install -y --no-install-recommends unzip \\
  && unzip ${zipName} \\
  && rm -f ${zipName} \\
  && npm install pm2@latest -g \\
  && rm -rf /var/lib/apt/lists/*

WORKDIR $ARRANGE_PATH/out/bin

EXPOSE 3000

CMD ["./start.sh"]
`;

  fs.writeFileSync(dockerfilePath, dockerfileContent);
}

function main() {
  const rootPkg = readRootPackageJson();
  const releaseVersion = increasePatchVersion(rootPkg.version ?? '0.0.0');
  buildFrontend();
  buildService();
  cleanOutDir();
  copyDistToOut();
  copyServiceFilesToOut();
  copyServiceDistToOut();
  writeOutPackageJson(rootPkg, releaseVersion);
  createOutStartScript();
  const zipName = zipOutDirectory(rootPkg, releaseVersion);
  removeOutDirectory();
  createDockerfile(zipName);
  writeRootPackageJson(rootPkg, releaseVersion);
  shell.echo(`已完成打包，产物：${zipName}`);
}

main();
