const path = require('node:path');
const fs = require('node:fs');
const shell = require('shelljs');

const rootDir = __dirname;
const packageJsonPath = path.join(rootDir, 'package.json');
const dockerfilePath = path.join(rootDir, 'Dockerfile');
const defaultBaseImage = 'node:22-slim';

// 读取根目录 package.json，获取镜像名称等基础信息。
function readRootPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
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

// 确保基础镜像可用：本地不存在时自动拉取网络镜像。
function ensureBaseImageReady(baseImage) {
  const result = shell.exec(`docker image inspect "${baseImage}"`, { cwd: rootDir, silent: true });

  if (result.code === 0) {
    shell.echo(`已命中本地基础镜像：${baseImage}`);
    return;
  }

  const inspectOutput = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  const daemonErrorPattern = /(permission denied while trying to connect|cannot connect to the docker daemon|error during connect|docker\.sock)/i;

  if (daemonErrorPattern.test(inspectOutput)) {
    shell.echo('无法连接 Docker 守护进程，请先确认 Docker Desktop 已启动且当前账号有权限访问 docker.sock。');
    if (inspectOutput) {
      shell.echo(inspectOutput);
    }
    shell.exit(1);
    return;
  }

  shell.echo(`本地基础镜像不存在，开始拉取：${baseImage}`);
  const pullResult = shell.exec(`docker pull --platform linux/amd64 "${baseImage}"`, { cwd: rootDir });
  if (pullResult.code !== 0) {
    shell.echo(`拉取基础镜像失败：${baseImage}`);
    shell.echo(`可通过 BASE_IMAGE 覆盖，例如：BASE_IMAGE="node:22-slim" node "./dockerBuild.ts"`);
    if (inspectOutput) {
      shell.echo(`inspect 输出：\n${inspectOutput}`);
    }
    shell.exit(pullResult.code);
  }

  shell.echo(`基础镜像拉取完成：${baseImage}`);
}

// 基于根目录 Dockerfile 构建 linux/amd64 镜像。
function buildDockerImage(imageTag, baseImage) {
  const result = shell.exec(
    `docker build --platform linux/amd64 --pull=false --build-arg BASE_IMAGE="${baseImage}" -t "${imageTag}" -f "${dockerfilePath}" "${rootDir}"`,
    {
      cwd: rootDir,
    }
  );

  if (result.code !== 0) {
    shell.exit(result.code);
  }
}

// 将镜像导出并压缩为 tar.gz 文件，便于离线分发。
function saveDockerImage(imageTag, tarGzPath) {
  shell.rm('-f', tarGzPath);
  const result = shell.exec(`docker save "${imageTag}" | gzip > "${tarGzPath}"`, { cwd: rootDir });

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
  const releaseSuffix = process.argv[2] || createReleaseSuffix();
  const imageTag = `${pkg.name}:${releaseSuffix}`;
  const imageTarGzPath = path.join(rootDir, `docker_${pkg.name}_${releaseSuffix}.tar.gz`);
  const baseImage = process.env.BASE_IMAGE || defaultBaseImage;

  ensureBaseImageReady(baseImage);
  buildDockerImage(imageTag, baseImage);
  saveDockerImage(imageTag, imageTarGzPath);
  shell.echo(`镜像构建并导出完成：${imageTag}（基础镜像：${baseImage}） -> ${imageTarGzPath}`);
}

main();
