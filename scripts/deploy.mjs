#!/usr/bin/env node
/**
 * CFOne 一键部署脚本
 * ------------------------------------------------------------
 * 通过 Cloudflare API 自动完成：创建 KV → 部署 Worker/Pages → 绑定变量 → 打印面板地址
 *
 * 前置：Cloudflare API Token，需以下权限（Account 级）：
 *   - Account Settings: Read
 *   - Workers KV Storage: Edit
 *   - Pages: Edit（Pages 模式）或 Workers: Admin（Worker 模式）
 *
 * 用法：
 *   node scripts/deploy.mjs --token <TOKEN> --account <ACCOUNT_ID> [--mode worker|pages] [--password <A>] [--domain <sub.example.com>]
 *
 *   # Worker 模式（推荐，需自定义域名才能直连）
 *   node scripts/deploy.mjs --token <TOKEN> --account <ACCOUNT_ID> --mode worker --password myPass123
 *
 *   # Pages 模式（无需自定义域名，*.pages.dev 可直接用）
 *   node scripts/deploy.mjs --token <TOKEN> --account <ACCOUNT_ID> --mode pages
 *
 * 不传 --password 时自动生成随机密码并打印。
 * ------------------------------------------------------------
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_FILE = join(ROOT, 'dist', 'CFOne-worker.js');

// ---- 参数解析 ----
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const val = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : 'true';
    args[key] = val;
  }
}

const TOKEN = args.token || process.env.CF_API_TOKEN;
const ACCOUNT = args.account || process.env.CF_ACCOUNT_ID;
const MODE = args.mode === 'pages' ? 'pages' : 'worker';
const PASSWORD = args.password || randomBytes(16).toString('hex');
const DOMAIN = args.domain || '';

if (!TOKEN || !ACCOUNT) {
  console.error('用法: node scripts/deploy.mjs --token <TOKEN> --account <ACCOUNT_ID> [--mode worker|pages] [--password <A>] [--domain <sub>]');
  console.error('或设置环境变量 CF_API_TOKEN 和 CF_ACCOUNT_ID');
  process.exit(1);
}

const CF_API = 'https://api.cloudflare.com/client/v4';
const authHeaders = { Authorization: `Bearer ${TOKEN}` };

async function cfApi(method, path, body) {
  const res = await fetch(CF_API + path, {
    method,
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    console.error(`CF API 错误 [${method} ${path}]:`, JSON.stringify(data.errors || data, null, 2));
    process.exit(1);
  }
  return data.result;
}

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---- 1. 创建 KV 命名空间 ----
console.log('[1/4] 创建 KV 命名空间...');
const kvTitle = `CFOne-${rand()}`;
const kv = await cfApi('POST', `/accounts/${ACCOUNT}/kv/namespaces`, { title: kvTitle });
const kvId = kv.id;
console.log(`  ✓ KV: ${kvTitle} (${kvId})`);

// ---- 2. 部署 ----
const workerCode = readFileSync(WORKER_FILE, 'utf8');
console.log(`[2/4] 部署 ${MODE.toUpperCase()}...`);

let deployUrl, projectName;

if (MODE === 'worker') {
  const scriptName = `cfone-${rand()}`;
  // 创建 Worker 脚本
  const script = await cfApi('POST', `/accounts/${ACCOUNT}/workers/scripts`, { name: scriptName });
  // 上传代码（multipart）
  const form = new FormData();
  form.append('script', new Blob([workerCode], { type: 'application/javascript' }));
  const putRes = await fetch(`${CF_API}/accounts/${ACCOUNT}/workers/scripts/${script.id}/content`, {
    method: 'PUT',
    headers: authHeaders,
    body: form,
  });
  const putData = await putRes.json();
  if (!putData.success) {
    console.error('Worker 代码上传失败:', JSON.stringify(putData.errors, null, 2));
    process.exit(1);
  }
  // 绑定 KV
  await cfApi('PUT', `/accounts/${ACCOUNT}/workers/scripts/${script.id}/bindings`, {
    bindings: [{ name: 'K', type: 'kv_namespace', namespace_id: kvId }],
  });
  // 设置变量 A
  await cfApi('PUT', `/accounts/${ACCOUNT}/workers/scripts/${script.id}/variables`, {
    variables: { A: PASSWORD },
  });
  // 部署
  await cfApi('POST', `/accounts/${ACCOUNT}/workers/scripts/${script.id}/deployments`, {});
  deployUrl = `https://${scriptName}.workers.dev`;
  console.log(`  ✓ Worker: ${scriptName}`);
} else {
  projectName = `cfone-${rand()}`;
  const project = await cfApi('POST', `/accounts/${ACCOUNT}/pages/projects`, { name: projectName });
  // 上传 _worker.js
  const form = new FormData();
  form.append('file', new Blob([workerCode], { type: 'application/javascript' }), '_worker.js');
  const uploadRes = await fetch(`${CF_API}/accounts/${ACCOUNT}/pages/projects/${project.id}/files`, {
    method: 'PUT',
    headers: authHeaders,
    body: form,
  });
  const uploadData = await uploadRes.json();
  if (!uploadData.success) {
    console.error('Pages 上传失败:', JSON.stringify(uploadData.errors, null, 2));
    process.exit(1);
  }
  // 创建部署
  const deploy = await cfApi('POST', `/accounts/${ACCOUNT}/pages/projects/${project.id}/deployments`, {});
  deployUrl = `https://${projectName}.pages.dev`;
  if (deploy.urls && deploy.urls.length > 0) deployUrl = deploy.urls[0];
  console.log(`  ✓ Pages: ${projectName}`);
}

// ---- 3. 自定义域名（可选） ----
if (DOMAIN) {
  console.log(`[3/4] 绑定自定义域名 ${DOMAIN}...`);
  try {
    if (MODE === 'worker') {
      // Workers 自定义域名需要先有 zone，这里仅记录提示
      console.log('  ⚠ Workers 自定义域名请在控制台手动绑定（需 Zone 已在本账号下）');
    } else {
      await cfApi('POST', `/accounts/${ACCOUNT}/pages/projects/${projectName}/domains`, { hostname: DOMAIN });
      console.log('  ✓ 域名绑定请求已提交（DNS 传播需几分钟）');
    }
  } catch (e) {
    console.warn(`  ⚠ 域名绑定失败（可稍后手动绑定）: ${e.message}`);
  }
} else {
  console.log('[3/4] 跳过自定义域名（使用默认域名）');
}

// ---- 4. 输出 ----
console.log('\n[4/4] 部署完成！');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  部署地址:  ${deployUrl}`);
console.log(`  面板地址:  ${deployUrl}/${PASSWORD}`);
console.log(`  面板密码:  ${PASSWORD}`);
console.log(`  订阅地址:  ${deployUrl}/s/<token>（登录面板后获取）`);
console.log(`  KV 命名空间: ${kvId}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n⚠ 重要：面板密码是访问凭证，请立即保存。');
console.log('  建议：登录面板 → 设置优选 IP → 开启 Trojan/WS → 复制订阅地址导入客户端。');
