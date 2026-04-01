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

// 复制根目录 package.json 到 out/package.json。
function copyRootPackageToOut() {
  shell.cp(path.join(rootDir, 'package.json'), outDir);
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

function main() {
  buildFrontend();
  buildService();
  cleanOutDir();
  copyDistToOut();
  copyServiceFilesToOut();
  copyServiceDistToOut();
  copyRootPackageToOut();
  createOutStartScript();
  shell.echo(`已完成构建，输出目录：${outFrontendDir}`);
}

main();
