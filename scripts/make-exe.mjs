#!/usr/bin/env node
/**
 * CFOne exe 构建脚本
 * ------------------------------------------------------------
 * 1. 确保 dist/CFOne-worker.js 已构建（缺失则先跑 build.mjs）
 * 2. 尽力安装 @noble/hashes，计算 Pages 占位资源的 blake3 哈希
 *    （Cloudflare Pages 资产键 = blake3(base64(内容) + 扩展名).hex 前 32 位）
 * 3. 生成 tool/worker-source.js（内嵌 Worker 源码 + 占位页 + 哈希）
 * 4. 用 pkg 打包成单文件 exe
 * ------------------------------------------------------------
 * 用法：node scripts/make-exe.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// 屏蔽 spawnSync(shell:true) 触发的 DEP0190 弃用警告
try {
  process.removeAllListeners("warning");
  process.on("warning", function () {});
} catch (e) {
  /* ignore */
}

const WORKER = join(ROOT, "dist", "CFOne-worker.js");
const OUT_EXE = join(ROOT, "dist", "CFOne.exe");
const SRC_OUT = join(ROOT, "tool", "worker-source.js");
const DEPS = join(ROOT, "scripts", ".deps");

// 占位静态页：Pages 部署至少需要一个 asset
const INDEX_HTML =
  "<!DOCTYPE html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\">" +
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
  "<title>Welcome</title></head><body>" +
  "<h1>Welcome to Cloudflare</h1>" +
  "<p>This site is running on Cloudflare.</p></body></html>";

function log(s) { console.log(s); }
function fail(s) { console.error("[make-exe] " + s); process.exit(1); }

/* 1. 确保 worker 产物存在 */
if (!existsSync(WORKER)) {
  log("[1/4] 未找到 dist/CFOne-worker.js，先执行 build.mjs ...");
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", "build.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r.status !== 0) fail("build.mjs 失败");
} else {
  log("[1/4] Worker 产物已存在");
}
const workerCode = readFileSync(WORKER, "utf8");
log("       长度 " + (workerCode.length / 1024).toFixed(1) + " KiB");

/* 2. 尽力计算 blake3 占位哈希 */
let indexHash = "";
log("[2/4] 计算 Pages 占位资源哈希（blake3）...");
try {
  mkdirSync(DEPS, { recursive: true });
  const depPkg = join(DEPS, "package.json");
  if (!existsSync(join(DEPS, "node_modules", "@noble", "hashes"))) {
    writeFileSync(depPkg, JSON.stringify({ name: "cfone-deps", private: true }, null, 2));
    log("       安装 @noble/hashes ...");
    const r = spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error", "@noble/hashes"], {
      cwd: DEPS,
      stdio: ["ignore", "inherit", "inherit"],
      shell: process.platform === "win32",
    });
    if (r.status !== 0) throw new Error("npm install 失败");
  }
  const nobleReq = createRequire(join(DEPS, "package.json"));
  // @noble/hashes v1 用 ./blake3，v2 用 ./blake3.js —— 两种都试
  let blake3 = null;
  for (const sub of ["@noble/hashes/blake3.js", "@noble/hashes/blake3"]) {
    try {
      const m = nobleReq(sub);
      blake3 = m.blake3 || m.default;
      if (blake3) break;
    } catch (e) { /* 试下一个 */ }
  }
  if (!blake3) throw new Error("无法加载 blake3 实现");
  const b64 = Buffer.from(INDEX_HTML, "utf8").toString("base64");
  const digest = blake3(Buffer.from(b64 + "html", "utf8"));
  indexHash = Buffer.from(digest).toString("hex").slice(0, 32);
  log("       OK  " + indexHash);
} catch (e) {
  log("       跳过（" + (e && e.message ? e.message : e) + "）—— Pages 将改用空清单部署");
  indexHash = "";
}

/* 3. 生成内嵌源码模块 */
log("[3/4] 生成 tool/worker-source.js ...");
const payload = {
  workerCode,
  indexHtml: INDEX_HTML,
  indexHash,
  manifest: indexHash ? { "/index.html": indexHash } : {},
  builtAt: new Date().toISOString(),
  sourceSha256: require("crypto").createHash("sha256").update(workerCode).digest("hex"),
};
writeFileSync(
  SRC_OUT,
  "/* 自动生成：node scripts/make-exe.mjs */\nmodule.exports = " +
    JSON.stringify(payload, null, 0) +
    ";\n",
  "utf8"
);
log("       OK  " + (readFileSync(SRC_OUT, "utf8").length / 1024).toFixed(1) + " KiB");

/* 4. pkg 打包 */
log("[4/4] 打包 exe ...");

// 输出到临时名再改名，避免目标文件被占用时 pkg 直接失败（Windows 上 exe 可能正被运行）
const tmpOut = OUT_EXE.replace(/\.exe$/, ".exe.tmp" + Date.now().toString(36));

const attempts = [
  // 优先用 pkg + node18（PKG_CACHE_PATH 通常已有缓存，最快最稳）
  {
    name: "pkg",
    args: [
      join(ROOT, "tool", "package.json"),
      "--targets", "node18-win-x64",
      "--output", tmpOut,
    ],
  },
  {
    // node20 常需从源码构建（环境缺 patch 工具会失败），作为兜底
    name: "@yao-pkg/pkg",
    args: [
      join(ROOT, "tool", "package.json"),
      "--targets", "node20-win-x64",
      "--output", tmpOut,
    ],
  },
];

let packed = false;
let builtFile = null;
for (const a of attempts) {
  log("       尝试 " + a.name + " ...");
  const r = spawnSync("npx", ["-y", a.name, ...a.args], {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    shell: process.platform === "win32",
    timeout: 600000,
  });
  // pkg 对 --output 的 .tmp 后缀可能追加 .exe，两种候选都查
  const candidates = [tmpOut, tmpOut + ".exe"];
  builtFile = candidates.find((p) => existsSync(p));
  if (r.status === 0 && builtFile) {
    packed = true;
    break;
  }
  log("       " + a.name + " 未成功（status=" + r.status + "），换下一个");
}

if (!packed || !builtFile) {
  fail(
    "exe 打包失败。可改用 Node 直接运行：node tool/main.js\n" +
      "或手动执行：npx -y pkg tool/package.json -t node18-win-x64 -o dist/CFOne.exe.tmp"
  );
}

// 用临时产物覆盖目标（若目标被占用则提示）
try {
  rmSync(OUT_EXE, { force: true });
} catch (e) {
  fail("无法覆盖 dist/CFOne.exe（文件可能正被运行）。请关闭所有 CFOne.exe 窗口后重试。");
}
try {
  require("fs").renameSync(builtFile, OUT_EXE);
} catch (e) {
  try {
    require("fs").copyFileSync(builtFile, OUT_EXE);
    require("fs").rmSync(builtFile, { force: true });
  } catch (e2) {
    fail("复制产物失败: " + e2.message);
  }
}

const size = readFileSync(OUT_EXE).length;
log("");
log("[完成] dist/CFOne.exe  " + (size / 1024 / 1024).toFixed(1) + " MiB");
log("       双击运行，或在终端执行：dist\\CFOne.exe --help");
