#!/usr/bin/env node
/**
 * CFOne 构建脚本
 * ------------------------------------------------------------
 * 1. 提取 src/worker.js 中所有 __SFX("...") / __SFX(`...`) 字面字符串 → base64 解码表
 * 2. 安全删除注释（保留字符串内文本），避免中文/协议关键字明文残留
 * 3. 产物：
 *    dist/CFOne-worker.js   —— Workers 粘贴 / Pages Advanced Mode 根文件
 *    dist/_worker.js        —— Pages Advanced Mode 同名根文件（与上面内容一致）
 *    dist/CFOne-pages.zip   —— Pages 上传包（内含 _worker.js）
 * ------------------------------------------------------------
 * 用法：node scripts/build.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src', 'worker.js');
const DIST = join(ROOT, 'dist');

/* ---------- 1. 提取 __SFX 字符串 ---------- */
// 手写扫描器：匹配 __SFX( 后跟字符串字面量（双引号/单引号/模板字面量），
// 模板字面量需处理转义与内嵌反引号，正则无法可靠处理。
function extractSfx(src) {
  const table = [];
  const placeholders = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const idx = src.indexOf('__SFX(', i);
    if (idx < 0) break;
    let j = idx + 6; // 跳过 __SFX(
    while (j < n && /\s/.test(src[j])) j++;
    const q = src[j];
    let content, end;
    if (q === '`') {
      let k = j + 1;
      let buf = '';
      while (k < n) {
        const c = src[k];
        if (c === '\\') { buf += src.substr(k, 2); k += 2; continue; }
        if (c === '`') { end = k; break; }
        buf += c;
        k++;
      }
      content = buf.replace(/\\(`|\$|\\)/g, (_, m) => m);
    } else if (q === '"' || q === "'") {
      let k = j + 1;
      let buf = '';
      while (k < n) {
        const c = src[k];
        if (c === '\\') { buf += src.substr(k, 2); k += 2; continue; }
        if (c === q) { end = k; break; }
        buf += c;
        k++;
      }
      if (q === '"') content = JSON.parse(`"${buf}"`);
      else content = buf.replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    } else {
      i = j;
      continue;
    }
    const fullMatch = src.slice(idx, end + 2);
    const b64 = Buffer.from(content, 'utf8').toString('base64');
    const idx2 = table.indexOf(b64);
    if (idx2 < 0) {
      table.push(b64);
      placeholders.push({ full: fullMatch, ref: `__D(${table.length - 1})` });
    } else {
      placeholders.push({ full: fullMatch, ref: `__D(${idx2})` });
    }
    i = end + 2;
  }
  return { table, placeholders };
}

/* ---------- 2. 安全删除注释（跟踪字符串状态） ---------- */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let state = 'code'; // code | sq | dq | tq | line | block
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === "'") { state = 'sq'; out += c; i++; }
      else if (c === '"') { state = 'dq'; out += c; i++; }
      else if (c === '`') { state = 'tq'; out += c; i++; }
      else if (c === '/' && c2 === '/') { state = 'line'; i += 2; }
      else if (c === '/' && c2 === '*') { state = 'block'; i += 2; }
      else { out += c; i++; }
    } else if (state === 'sq') {
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i += 2; }
      else if (c === "'") { state = 'code'; out += c; i++; }
      else { out += c; i++; }
    } else if (state === 'dq') {
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i += 2; }
      else if (c === '"') { state = 'code'; out += c; i++; }
      else { out += c; i++; }
    } else if (state === 'tq') {
      if (c === '\\') { out += c + (src[i + 1] ?? ''); i += 2; }
      else if (c === '`') { state = 'code'; out += c; i++; }
      else if (c === '$' && c2 === '{') {
        // 模板插值：整段跳过（含内部字符串），花括号计数
        let depth = 1;
        let j = i + 2;
        while (j < n && depth > 0) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}') depth--;
          j++;
        }
        out += src.slice(i, j);
        i = j;
      } else { out += c; i++; }
    } else if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; i++; } else i++;
    } else if (state === 'block') {
      if (c === '*' && c2 === '/') { state = 'code'; i += 2; } else i++;
    }
  }
  return out;
}

/* ---------- 3. 组装产物 ---------- */
function build() {
  const src = readFileSync(SRC, 'utf8');
  const { table, placeholders } = extractSfx(src);

  // 先脱敏字符串，再做注释清理（顺序重要：__SFX 块先被替换为 __D(n)）
  let body = src;
  for (const p of placeholders) body = body.replace(p.full, p.ref);
  body = stripComments(body);
  // 移除源码自带的 import 行（header 已提供）
  body = body.replace(/^import\s*\{?\s*connect\s*\}?\s*from\s*['"]cloudflare:sockets['"];?\s*$/m, '');

  const header = [
    `import{connect}from"cloudflare:sockets";`,
    `const __T=${JSON.stringify(table)};`,
    `const __D=(()=>{const d=new TextDecoder(),m=new Map();return i=>{let v=m.get(i);if(v===undefined){const s=atob(__T[i]),u=new Uint8Array(s.length);for(let j=0;j<s.length;j++)u[j]=s.charCodeAt(j);v=d.decode(u);m.set(i,v);}return v;};})();`,
  ].join('\n');

  // 清理源码中的辅助定义（产物改用 __D/__T）
  body = body
    .replace(/const __c = new Map\(\);[\s\S]*?const __SFX = \(s\) => s;/, '')
    .replace(/\n{3,}/g, '\n\n');

  const out = header + '\n' + body.trim() + '\n';

  // 脱敏自检：产物不应含中文字符（base64 表不包含中文）
  const cjk = /[\u4e00-\u9fff]/.test(out);
  if (cjk) {
    console.error('[build] 产物仍含中文字符，脱敏失败，中止。');
    process.exit(1);
  }

  if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  writeFileSync(join(DIST, 'CFOne-worker.js'), out);
  writeFileSync(join(DIST, '_worker.js'), out);

  // Pages 上传包（zip 内含 _worker.js）
  const zip = join(DIST, 'CFOne-pages.zip');
  const tar = spawnSync('tar', ['-a', '-c', '-f', zip, '_worker.js'], { cwd: DIST, encoding: 'utf8' });
  if (tar.status !== 0 || !existsSync(zip)) {
    console.warn('[build] tar 打 zip 失败（Windows 无 bsdtar?），改用 PowerShell 压缩。');
    const ps = spawnSync('powershell', ['-NoProfile', '-Command',
      `Compress-Archive -Path '${join(DIST, '_worker.js')}' -DestinationPath '${zip}' -Force`], { encoding: 'utf8' });
    if (ps.status !== 0 || !existsSync(zip)) {
      console.error('[build] zip 生成失败：' + (ps.stderr || ps.stdout));
      process.exit(1);
    }
  }

  const size = Buffer.byteLength(out);
  console.log(`[build] 完成：dist/CFOne-worker.js（${(size / 1024).toFixed(1)} KiB）、dist/_worker.js、dist/CFOne-pages.zip`);
  console.log(`[build] 解码表条目：${table.length}`);
}

build();
