const path = require('node:path');
const fs = require('node:fs');
const shell = require('shelljs');

const rootDir = __dirname;
const packageJsonPath = path.join(rootDir, 'package.json');
const dockerfilePath = path.join(rootDir, 'Dockerfile');

// 读取根目录 package.json，获取镜像名称和版本。
function readRootPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
}

// 基于根目录 Dockerfile 构建 linux/amd64 镜像。
function buildDockerImage(imageTag) {
  const result = shell.exec(`docker build --platform linux/amd64 -t "${imageTag}" -f "${dockerfilePath}" "${rootDir}"`, {
    cwd: rootDir,
  });

  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

// 将镜像导出为 tar 文件，便于离线分发。
function saveDockerImage(imageTag, tarPath) {
  const result = shell.exec(`docker save -o "${tarPath}" "${imageTag}"`, { cwd: rootDir });

  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

function main() {
  if (!shell.test('-f', dockerfilePath)) {
    shell.echo('未找到根目录 Dockerfile，请先执行构建脚本生成 Dockerfile。');
    shell.exit(1);
    return;
  }

  const pkg = readRootPackageJson();
  const imageTag = `${pkg.name}:${pkg.version}`;
  const imageTarPath = path.join(rootDir, `${pkg.name}_${pkg.version}.tar`);

  buildDockerImage(imageTag);
  saveDockerImage(imageTag, imageTarPath);
  shell.echo(`镜像构建并导出完成：${imageTag} -> ${imageTarPath}`);
}

main();
