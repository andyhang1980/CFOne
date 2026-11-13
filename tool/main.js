#!/usr/bin/env node
"use strict";

/**
 * CFOne 一键部署工具（exe）
 * ------------------------------------------------------------
 * 功能：部署 CFOne 到 Cloudflare Workers / Pages，并自动配置
 *       KV 绑定、面板密码变量、兼容性日期，最后校验面板可用性。
 *
 * 用法：
 *   CFOne.exe                                  # 交互菜单
 *   CFOne.exe --mode workers --token <T>       # 非交互
 *   CFOne.exe --mode pages --token <T> --account <ID> --password <pw>
 *   CFOne.exe --verify https://xxx.workers.dev --password <pw>
 *   CFOne.exe --check                          # 校验内置产物
 *   CFOne.exe --help
 * ------------------------------------------------------------
 */

const crypto = require("crypto");
const readline = require("readline");
const SRC = require("./worker-source");

const VERSION = "1.0.0";
const API = "https://api.cloudflare.com/client/v4";
const COMPAT_DATE = "2026-01-20";
const PW_RE = /^[A-Za-z0-9._-]{8,64}$/;

// Windows 控制台切到 UTF-8，避免中文乱码
if (process.platform === "win32") {
  try {
    require("child_process").execSync("chcp 65001 >nul 2>&1", {
      stdio: "ignore",
      windowsHide: true,
    });
  } catch (e) {
    /* ignore */
  }
}

// 屏蔽 Node 18 的 Fetch API ExperimentalWarning
try {
  process.removeAllListeners("warning");
  process.on("warning", function () {});
} catch (e) {
  /* ignore */
}

const TTY = !!process.stdout.isTTY;
const C = TTY
  ? { g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", b: "\x1b[36m", d: "\x1b[2m", x: "\x1b[0m", w: "\x1b[1m" }
  : { g: "", y: "", r: "", b: "", d: "", x: "", w: "" };

function say(s) { console.log(s); }
function ok(s) { console.log("  " + C.g + "[OK]" + C.x + " " + s); }
function info(s) { console.log("  " + C.b + "[..]" + C.x + " " + s); }
function warn(s) { console.log("  " + C.y + "[!!]" + C.x + " " + s); }
function bad(s) { console.log("  " + C.r + "[XX]" + C.x + " " + s); }

function banner() {
  say("");
  say(C.w + "  ============================================" + C.x);
  say(C.w + "     CFOne 一键部署工具   v" + VERSION + C.x);
  say(C.w + "  ============================================" + C.x);
  say("");
}

function printHelp() {
  say("");
  say("CFOne 一键部署工具 v" + VERSION);
  say("");
  say("用法:");
  say("  CFOne.exe                                   交互菜单（推荐）");
  say("  CFOne.exe --mode workers --token <TOKEN>    非交互部署到 Workers");
  say("  CFOne.exe --mode pages   --token <TOKEN>    非交互部署到 Pages");
  say("  CFOne.exe --verify <URL> --password <PW>    校验面板是否可用");
  say("  CFOne.exe --check                           校验内置部署产物");
  say("  CFOne.exe --help                            显示本帮助");
  say("");
  say("参数:");
  say("  --mode workers|pages    部署目标（默认 workers）");
  say("  --token <TOKEN>         Cloudflare API Token（或环境变量 CF_API_TOKEN）");
  say("  --account <ID>          账号 ID（或环境变量 CF_ACCOUNT_ID；留空自动检测）");
  say("  --password <PW>         面板密码，8-64 位字母数字 . _ -（留空自动生成）");
  say("  --yes                   跳过确认提示");
  say("");
  say("Token 创建（控制台 → 头像 → Profile & Preferences → API Tokens）:");
  say("  ① 作用域必须选 [Account 账号级]，别选 Zone 域名级（Zone 看不到下面权限）");
  say("  ② 推荐用官方模板: Edit Cloudflare Workers（Workers 模式）");
  say("                  或 Edit Cloudflare Pages（Pages 模式）");
  say("  ③ 或自定义 Token，勾以下四项（Account 作用域下）:");
  say("    Account Settings      Read");
  say("    Workers KV Storage    Edit");
  say("    Workers               Admin（Workers 模式）");
  say("    Pages                 Edit（Pages 模式）");
  say("");
  say("  明确不需要: DNS / Workers Routes / Access / WAF（工具不碰自定义域名）");
  say("  创建页: https://dash.cloudflare.com/profile/api-tokens");
  say("  详细步骤见 README「API Token 权限清单」");
  say("");
}

function genPassword() {
  return crypto.randomBytes(12).toString("hex");
}

function stamp() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ask(promptText, def) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(def === undefined ? "" : def);
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      try { rl.close(); } catch (e) { /* ignore */ }
      resolve(v);
    };
    rl.question(promptText, (a) => finish(String(a).trim()));
    rl.on("close", () => finish(def === undefined ? "" : def));
  });
}

function pauseEnd() {
  if (!process.stdin.isTTY) return Promise.resolve();
  return ask(C.d + "  按回车键退出..." + C.x, "").catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Cloudflare API                                                      */
/* ------------------------------------------------------------------ */

async function cf(token, method, path, body) {
  const headers = { Authorization: "Bearer " + token };
  let payload;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body === undefined || body === null) {
    payload = undefined;
  } else if (isForm) {
    payload = body;
  } else {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(API + path, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }

  if (!res.ok || !data || data.success === false) {
    let msg;
    if (data && data.errors && data.errors.length) {
      msg = data.errors.map((e) => (e.code ? e.code + ": " : "") + e.message).join("; ");
    } else {
      msg = "HTTP " + res.status;
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data.result;
}

async function pickAccount(token, forced) {
  if (forced) return forced;
  const accounts = await cf(token, "GET", "/accounts");
  if (!accounts || accounts.length === 0) {
    throw new Error("该 Token 下看不到任何账号，请检查 Token 权限（Account Settings: Read）");
  }
  if (accounts.length === 1) {
    info("账号: " + accounts[0].name + "  (" + accounts[0].id + ")");
    return accounts[0].id;
  }
  say("  检测到多个账号:");
  accounts.forEach((a, i) => say("    " + (i + 1) + ". " + a.name + "   " + a.id));
  const ans = await ask("  选择序号 [1]: ", "1");
  const idx = Math.max(1, Math.min(accounts.length, parseInt(ans, 10) || 1));
  return accounts[idx - 1].id;
}

/* ------------------------------------------------------------------ */
/* 产物：手写 multipart 序列化（构造 _worker.bundle 嵌套表单）            */
/* ------------------------------------------------------------------ */

function multipartBytes(parts) {
  const boundary = "----CFOne" + Date.now().toString(16) + Math.random().toString(16).slice(2, 8);
  const enc = new TextEncoder();
  const chunks = [];
  let total = 0;
  const push = (x) => {
    const u = typeof x === "string" ? enc.encode(x) : x;
    chunks.push(u);
    total += u.length;
  };
  for (const p of parts) {
    push("--" + boundary + "\r\n");
    if (p.filename !== undefined) {
      push('Content-Disposition: form-data; name="' + p.name + '"; filename="' + p.filename + '"\r\n');
      push("Content-Type: " + (p.type || "application/octet-stream") + "\r\n\r\n");
    } else {
      push('Content-Disposition: form-data; name="' + p.name + '"\r\n\r\n');
    }
    push(typeof p.value === "string" ? p.value : p.value);
    push("\r\n");
  }
  push("--" + boundary + "--\r\n");
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return { bytes: out, contentType: "multipart/form-data; boundary=" + boundary };
}

function buildWorkerBundle() {
  const meta = JSON.stringify({
    main_module: "worker.js",
    compatibility_date: COMPAT_DATE,
  });
  const { bytes, contentType } = multipartBytes([
    { name: "metadata", value: meta },
    { name: "worker.js", value: SRC.workerCode, filename: "worker.js", type: "application/javascript+module" },
  ]);
  return new Blob([bytes], { type: contentType });
}

/* ------------------------------------------------------------------ */
/* 部署：Workers                                                       */
/* ------------------------------------------------------------------ */

async function deployWorkers(token, accountId, password) {
  info("创建 KV 命名空间...");
  const kv = await cf(token, "POST", "/accounts/" + accountId + "/storage/kv/namespaces", {
    title: "CFOne-" + stamp(),
  });
  ok("KV: " + kv.id);

  const scriptName = "cfone-" + stamp();
  info("上传 Worker 代码并绑定 KV / 变量 A ...");

  const fd = new FormData();
  fd.append(
    "metadata",
    JSON.stringify({
      main_module: "worker.js",
      compatibility_date: COMPAT_DATE,
      bindings: [
        { type: "kv_namespace", name: "K", namespace_id: kv.id },
        { type: "plain_text", name: "A", text: password },
      ],
    })
  );
  fd.append(
    "worker.js",
    new Blob([SRC.workerCode], { type: "application/javascript+module" }),
    "worker.js"
  );

  await cf(token, "PUT", "/accounts/" + accountId + "/workers/scripts/" + scriptName + "/content", fd);
  ok("Worker 已部署: " + scriptName);

  return {
    url: "https://" + scriptName + ".workers.dev",
    kvId: kv.id,
    name: scriptName,
    kind: "workers",
  };
}

/* ------------------------------------------------------------------ */
/* 部署：Pages                                                         */
/* ------------------------------------------------------------------ */

async function deployPages(token, accountId, password) {
  info("创建 KV 命名空间...");
  const kv = await cf(token, "POST", "/accounts/" + accountId + "/storage/kv/namespaces", {
    title: "CFOne-" + stamp(),
  });
  ok("KV: " + kv.id);

  const projectName = "cfone-" + stamp();
  info("创建 Pages 项目: " + projectName);
  await cf(token, "POST", "/accounts/" + accountId + "/pages/projects", {
    name: projectName,
    production_branch: "main",
  });
  ok("Pages 项目已创建");

  // 读取项目，拿到 wrangler_config_hash（PATCH 需要回传）
  const proj = await cf(token, "GET", "/accounts/" + accountId + "/pages/projects/" + projectName);
  const prodCfg = proj && proj.deployment_configs ? proj.deployment_configs.production : null;

  info("配置 变量 A / KV 绑定 K / 兼容日期 ...");
  const patch = {
    deployment_configs: {
      production: {
        env_vars: { A: { value: password, type: "plain_text" } },
        kv_namespaces: { K: { namespace_id: kv.id } },
        compatibility_date: COMPAT_DATE,
      },
    },
  };
  if (prodCfg && prodCfg.wrangler_config_hash) {
    patch.deployment_configs.production.wrangler_config_hash = prodCfg.wrangler_config_hash;
  }
  await cf(token, "PATCH", "/accounts/" + accountId + "/pages/projects/" + projectName, patch);
  ok("配置已写入");

  // 上传占位静态资源（Pages 要求部署至少带一个 asset；哈希在构建期算好）
  const manifest = {};
  if (SRC.indexHash && SRC.indexHtml) {
    const manifestKey = "/index.html";
    manifest[manifestKey] = SRC.indexHash;

    info("获取上传令牌...");
    const tok = await cf(
      token,
      "GET",
      "/accounts/" + accountId + "/pages/projects/" + projectName + "/upload-token"
    );
    const jwt = tok.jwt;
    const hashes = [SRC.indexHash];

    const jheaders = { Authorization: "Bearer " + jwt, "Content-Type": "application/json" };

    // 1) 查缺失
    let missing = hashes;
    try {
      const r1 = await fetch(API + "/pages/assets/check-missing", {
        method: "POST",
        headers: jheaders,
        body: JSON.stringify({ hashes }),
      });
      const d1 = await r1.json();
      if (d1 && d1.success && Array.isArray(d1.result)) missing = d1.result;
    } catch (e) {
      /* 忽略，按全量上传处理 */
    }

    // 2) 上传缺失文件
    if (!missing || missing.indexOf(SRC.indexHash) >= 0) {
      const payload = [
        {
          key: SRC.indexHash,
          value: Buffer.from(SRC.indexHtml, "utf8").toString("base64"),
          metadata: { contentType: "text/html" },
          base64: true,
        },
      ];
      const r2 = await fetch(API + "/pages/assets/upload", {
        method: "POST",
        headers: jheaders,
        body: JSON.stringify(payload),
      });
      const d2 = await r2.json();
      if (!d2 || d2.success === false) {
        throw new Error("资源上传失败: " + JSON.stringify((d2 && d2.errors) || "unknown"));
      }
      ok("占位资源已上传");
    } else {
      ok("占位资源已存在（跳过上传）");
    }

    // 3) 登记哈希
    try {
      await fetch(API + "/pages/assets/upsert-hashes", {
        method: "POST",
        headers: jheaders,
        body: JSON.stringify({ hashes }),
      });
    } catch (e) {
      warn("upsert-hashes 失败（不影响本次部署）");
    }
  } else {
    warn("构建期未生成占位资源哈希，改用空清单部署");
  }

  info("创建部署 ...");
  const bundle = buildWorkerBundle();
  const outer = new FormData();
  outer.append("manifest", JSON.stringify(manifest));
  outer.append("_worker.bundle", bundle, "_worker.bundle");

  const dep = await cf(
    token,
    "POST",
    "/accounts/" + accountId + "/pages/projects/" + projectName + "/deployments",
    outer
  );
  ok("Pages 部署已创建");

  return {
    url: "https://" + projectName + ".pages.dev",
    kvId: kv.id,
    name: projectName,
    kind: "pages",
    deploymentId: dep && dep.id,
  };
}

/* ------------------------------------------------------------------ */
/* 校验                                                                */
/* ------------------------------------------------------------------ */

function doCheck() {
  say("");
  if (!SRC || !SRC.workerCode || SRC.workerCode.length < 1000) {
    bad("内置 Worker 源码缺失或过短");
    return false;
  }
  ok("内置 Worker 源码: " + (SRC.workerCode.length / 1024).toFixed(1) + " KiB");
  if (SRC.workerCode.indexOf("import{connect}") >= 0 || SRC.workerCode.indexOf('from"cloudflare:sockets"') >= 0) {
    ok("入口模块格式正确（cloudflare:sockets）");
  } else {
    warn("未发现 cloudflare:sockets 导入，请确认产物完整性");
  }
  const cjk = /[\u4e00-\u9fff]/.test(SRC.workerCode);
  if (cjk) warn("产物含中文明文（脱敏可能未生效）");
  else ok("脱敏自检通过（无中文明文）");

  if (SRC.indexHash) {
    ok("占位资源哈希: " + SRC.indexHash);
  } else {
    warn("无占位资源哈希（Pages 将用空清单）");
  }
  return true;
}

async function doVerify(baseUrl, password) {
  if (!baseUrl || !password) {
    bad("--verify 需要同时提供 --password");
    return false;
  }
  const target = String(baseUrl).replace(/\/+$/, "") + "/" + password;
  info("检查面板: " + target);
  try {
    const res = await fetch(target, { redirect: "manual" });
    const text = await res.text();
    if (text.indexOf("btn-login") >= 0) {
      ok("面板可用，变量 A 已生效");
      return true;
    }
    if (text.indexOf("Welcome to Cloudflare") >= 0) {
      bad("返回伪装页 —— 变量 A 未生效，请在控制台确认变量名是 A 并重新部署");
      return false;
    }
    bad("响应异常 HTTP " + res.status);
    return false;
  } catch (e) {
    bad("无法访问: " + (e && e.message ? e.message : e));
    warn("若为 Workers 模式，*.workers.dev 可能被网络阻断，请绑定自定义域名后重试");
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.slice(0, 2) === "--") {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.slice(0, 2) === "--") out[k] = true;
      else out[k] = argv[++i];
    } else if (a === "-h") out.help = true;
  }
  return out;
}

async function runDeploy(mode, token, account, password, assumeYes) {
  banner();
  say(C.d + "  目标: " + mode + "   兼容日期: " + COMPAT_DATE + C.x);
  say("");

  if (!password) password = genPassword();
  if (!PW_RE.test(password)) {
    warn("密码含不支持的字符，已改用随机密码（面板路径不允许 / ? # 等字符）");
    password = genPassword();
  }

  info("校验 Token 权限...");
  let accountId;
  try {
    accountId = await pickAccount(token, account);
  } catch (e) {
    bad("Token 校验失败: " + e.message);
    say("");
    say("  常见原因与排查:");
    say("   - 权限不足: 需勾 Account Settings:Read / Workers KV Storage:Edit");
    say("               Workers 模式另需 Workers:Admin，Pages 模式另需 Pages:Edit");
    say("               完整清单见 README「API Token 权限清单」");
    say("   - Token 是 GitHub 的(ghp_ 开头) 或粘贴错误: 需 Cloudflare API Token");
    say("   - 网络无法访问 api.cloudflare.com: 可先开代理再试");
    return null;
  }

  if (!assumeYes) {
    const ans = await ask("  确认部署到账号 " + accountId + " ? [Y/n]: ", "Y");
    if (/^n/i.test(ans)) {
      warn("已取消");
      return null;
    }
  }

  let result;
  try {
    if (mode === "pages") result = await deployPages(token, accountId, password);
    else result = await deployWorkers(token, accountId, password);
  } catch (e) {
    bad("部署失败: " + e.message);
    say("");
    say("  排查建议:");
    say("   - 10404 No route for that URI = API 路径或版本不对（旧版 exe 常见），请更新 CFOne.exe");
    say("   - 确认 Token 有 Pages / Workers 的 Edit 或 Admin 权限（见 README「API Token 权限清单」）");
    say("   - 确认账号未超出免费版 KV / Workers 数量限制");
    say("   - 网络问题可开代理后重试");
    return null;
  }

  say("");
  info("校验面板可达性...");
  const v = await doVerify(result.url, password);
  say("");

  say(C.w + "  ================= 部署完成 =================" + C.x);
  say("  部署地址:  " + result.url);
  say("  面板地址:  " + C.g + result.url + "/" + password + C.x);
  say("  面板密码:  " + C.g + password + C.x);
  say("  KV 命名空间: " + result.kvId);
  say("  订阅地址:  登录面板后在「概览」页复制");
  say(C.w + "  ============================================" + C.x);
  say("");
  say(C.y + "  注意:" + C.x);
  say("   - 立即保存面板密码，云端变量加密后无法读回");
  say("   - 打开面板 → 配置优选 IP → 复制订阅地址 → 导入客户端");
  if (result.kind === "workers") {
    say("   - Workers 模式建议绑定自定义域名（*.workers.dev 在部分网络不可达）");
  }
  if (!v.ok) {
    say("   - 面板校验未通过: " + v.reason);
  }
  say("");
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    printHelp();
    return;
  }
  if (args.version) {
    say("CFOne tool v" + VERSION);
    return;
  }
  if (args.check) {
    banner();
    if (!doCheck()) process.exitCode = 1;
    return;
  }
  if (args.verify) {
    banner();
    const good = await doVerify(String(args.verify), args.password === true ? "" : args.password);
    if (!good) process.exitCode = 1;
    return;
  }

  const token0 = typeof args.token === "string" ? args.token : process.env.CF_API_TOKEN || "";
  const account0 = typeof args.account === "string" ? args.account : process.env.CF_ACCOUNT_ID || "";
  const password0 = typeof args.password === "string" ? args.password : "";
  let mode = typeof args.mode === "string" ? args.mode.toLowerCase() : "";

  if (args.mode === true) mode = "";

  if (mode && mode !== "workers" && mode !== "pages") {
    bad("未知模式: " + mode + "（只支持 workers / pages）");
    return;
  }

  if (mode) {
    // 非交互部署
    if (!token0) {
      bad("缺少 --token（或环境变量 CF_API_TOKEN）");
      return;
    }
    const deployed = await runDeploy(mode, token0, account0, password0, !!args.yes);
    if (!deployed) process.exitCode = 1;
    await pauseEnd();
    return;
  }

  // 交互菜单
  if (!process.stdin.isTTY) {
    bad("当前不是交互终端，无法使用菜单。");
    say("");
    say("  请改用非交互参数：");
    say("    CFOne.exe --mode workers --token <TOKEN>");
    say("    CFOne.exe --mode pages   --token <TOKEN> --password <PW>");
    say("");
    printHelp();
    process.exitCode = 1;
    return;
  }

  for (;;) {
    banner();
    say("  1. 部署到 Workers（推荐：单请求上传，最稳定）");
    say("  2. 部署到 Pages（*.pages.dev 可直接测试）");
    say("  3. 生成随机面板密码");
    say("  4. 校验内置部署产物");
    say("  5. 校验已部署的面板");
    say("  0. 退出");
    say("");
    const raw = await ask("  请选择 [1]: ", "1");
    const c = raw === "" ? "1" : raw;

    if (c === "0") break;

    if (c === "3") {
      say("");
      ok("随机面板密码: " + genPassword());
      await ask("  按回车继续...", "");
      continue;
    }
    if (c === "4") {
      doCheck();
      await ask("  按回车继续...", "");
      continue;
    }
    if (c === "5") {
      const u = await ask("  部署地址 (如 https://xxx.workers.dev): ");
      const p = await ask("  面板密码: ");
      if (u && p) await doVerify(u, p);
      else bad("地址和密码都不能为空");
      await ask("  按回车继续...", "");
      continue;
    }

    const m = c === "2" ? "pages" : c === "1" ? "workers" : "";
    if (!m) {
      warn("无效选择");
      await ask("  按回车继续...", "");
      continue;
    }

    const token = await ask("  Cloudflare API Token: ", token0);
    if (!token) {
      bad("未输入 Token");
      await ask("  按回车继续...", "");
      continue;
    }
    const password = await ask("  面板密码（留空自动生成）: ", password0);
    const res = await runDeploy(m, token, account0, password, false);
    if (res) {
      await pauseEnd();
      break;
    }
    await ask("  按回车返回菜单...", "");
  }
}

main().catch((e) => {
  bad("程序异常: " + (e && e.stack ? e.stack : e));
  process.exitCode = 1;
});
