/**
 * CFOne · 单文件 Cloudflare 代理面板（融合版）
 * ------------------------------------------------------------
 * 融合自三个上游项目的设计：
 *   - CFAPEX          : 单文件双形态部署（Worker 粘贴 / Pages Advanced Mode）、
 *                       无关请求前置过滤不读 KV、10 秒窗口合并 KV 读取、运行时解码表脱敏
 *   - CFPilot         : PBKDF2 口令散列 + HttpOnly 会话 + 常量时间比较 + IP 限速、
 *                       订阅签名令牌、假活检测、WS close reason 截断、KV 写配额保护
 *   - cfnew           : UA 自动识别多格式订阅（Clash / sing-box / base64 / 明文）、
 *                       出站代理三选一（qj）、自定义路径、优选 IP 管理 API
 * ------------------------------------------------------------
 * 部署（二选一，必填变量仅 A）：
 *   Workers          : 新建 Worker → 粘贴 dist/CFOne-worker.js → 设变量 A → 部署
 *   Pages Advanced   : 上传 dist/CFOne-pages.zip（或 dist/_worker.js 作为根文件）→ 设 A → 部署
 *   推荐设置兼容性日期 2026-01-20（Workers/Pages 运行时设置）。
 *   可选 KV 绑定 K（面板配置持久化；不绑则仅内存生效）。
 * ------------------------------------------------------------
 * 环境变量（A 之外全部可选）：
 *   A                必填。面板密码。派生默认节点 UUID 与订阅令牌。未设置时全站伪装页。
 *   U                可选。自定义节点 UUID（覆盖 A 派生）。
 *   K                KV 命名空间绑定名（必须叫 K，是绑定不是文本变量）。
 *   D / WS_PATH      可选。自定义 WS 隧道路径，如 /mypath（多级支持；默认 /cfone-ws）。
 *   ET               可选。yes 启用 Trojan/WS（默认 no；密码 TROJAN_PASSWORD 或默认派生）。
 *   TROJAN_PASSWORD  可选。Trojan 密码，留空用节点 UUID。
 *   P / PROXYIP      可选。全局 ProxyIP（host 或 host:port），出站候选。
 *   S                可选。出站代理：socks5://host:port | http://host:port | https://host:port
 *                     （可带 user:pass@；https 前缀表示连代理这一跳走 TLS）
 *   QJ               可选。出站方式：空=直连/ProxyIP 竞速、no=直连优先、only=只走 S 代理。
 *   YX               可选。手填优选列表：IP:port#备注 或 域名:port#备注，英文逗号/换行分隔。
 *   YXURL            可选。在线优选列表 URL（英文逗号分隔多个；失败保留旧列表）。
 *   MASK_HTML        可选。伪装页内联 HTML；off/0 关闭伪装（404）。
 *   MASK_URL         可选。伪装页取回地址（失败回退内置默认页）。
 *   OUTBOUND_PORTS   可选。目标端口白名单（逗号分隔），默认见 OUTBOUND_DEFAULT_PORTS。
 * ------------------------------------------------------------
 * 路由：
 *   GET  /<A>                    面板（登录 + 配置 + 优选管理）
 *   GET  /s/<token>              订阅（多格式，UA 自动识别；token 与面板密码分离）
 *   GET  /<A>/api/*              面板 API（会话鉴权；优选管理需面板开启 API）
 *   WS   <D>                     隧道入口（VLESS/WS + Trojan/WS）
 *   GET  /<A>/health             轻量探针（供优选器/监测使用，会话鉴权）
 *   其它                          伪装页（未设 A 时全站伪装）
 */

import { connect } from 'cloudflare:sockets';

/* ================================================================== *
 *  0. 常量与工具
 * ================================================================== */

// 构建时脱敏表：源码用 __SFX("...") 包裹的字符串会被 build.mjs 提取成 base64 表，
// 运行时经 __t(idx) 解码。产物中不残留中文与协议关键字明文。
const __c = new Map();
function __t(b64) {
  let v = __c.get(b64);
  if (v === undefined) {
    const s = atob(b64);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    v = new TextDecoder().decode(u);
    __c.set(b64, v);
  }
  return v;
}
// 构建标记（保持可读性，build.mjs 会将其改写为 __t(idx)）
const __SFX = (s) => s;

const VERSION = '1.0.0';

const HEX = '0123456789abcdef';

// 默认允许的目标端口（CF 常用入站端口，与上游一致）
const OUTBOUND_DEFAULT_PORTS = [80, 443, 2052, 2053, 2082, 2083, 2086, 2087, 2095, 2096, 8080, 8443, 8880];

// WS close reason 超过 123 字节会被边缘静默丢弃（表现为连接永不关闭），强制截断
const MAX_CLOSE_REASON = 123;

// 面板 API 需要放行的响应头（仅面板/订阅 API 使用；隧道不设置）
const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

// 每 IP 登录尝试限速（窗口 / 次数）
const LOGIN_WINDOW_MS = 60000;
const LOGIN_MAX_PER_IP = 10;

// 未认证 WebSocket 首包上限
const MAX_UNAUTH_FIRST_PACKET = 64 * 1024;

// 单连接限制
const MAX_CONN_MS = 15 * 60 * 1000; // 15 分钟
const MAX_UPLOAD = 64 * 1024 * 1024; // 64 MiB
const MAX_DOWNLOAD = 128 * 1024 * 1024; // 128 MiB

// 假活检测：客户端有数据后，上游首字节静默超时
const STALL_TIMEOUT_MS = 3500;

// 内置优选池（CF 官方 anycast 入口，13 个标准端口均可用；仅作开箱即用兜底，建议用 YX / YXURL 换自己的）
// 节点名用 __SFX 脱敏，避免中文明文残留
const BUILTIN_IPS = [
  __SFX('104.16.0.0:443#优选-01'), __SFX('104.17.0.0:443#优选-02'), __SFX('104.18.0.0:443#优选-03'),
  __SFX('104.19.0.0:443#优选-04'), __SFX('104.20.0.0:443#优选-05'), __SFX('104.21.0.0:443#优选-06'),
  __SFX('104.22.0.0:443#优选-07'), __SFX('104.24.0.0:443#优选-08'), __SFX('104.25.0.0:443#优选-09'),
  __SFX('104.26.0.0:443#优选-10'), __SFX('104.27.0.0:443#优选-11'), __SFX('172.66.0.0:443#优选-12'),
  __SFX('172.67.0.0:443#优选-13'), __SFX('162.159.0.0:443#优选-14'),
];

/* ---------- 常量时间比较 ---------- */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* ---------- UUID ---------- */
function isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function randomUUID() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  let s = '';
  for (const x of b) s += HEX[x >> 4] + HEX[x & 15];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
/* ---------- 哈希 ---------- */
async function sha224Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-224', data);
  const bytes = new Uint8Array(digest);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}
async function hmacHex(keyStr, msgStr) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(keyStr),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msgStr));
  const bytes = new Uint8Array(sig);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}
// PBKDF2 口令散列（面板密码校验用，salt 每次登录随机、比较用散列，避免明文比较与彩虹表）
async function pbkdf2Hex(password, salt, iterations = 100000) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    key, 256
  );
  const bytes = new Uint8Array(bits);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}

/* ---------- 通用 ---------- */
function utf8Encode(s) { return new TextEncoder().encode(s); }
function utf8Decode(u) { return new TextDecoder().decode(u); }
function closeReason(s) {
  return s.length > MAX_CLOSE_REASON ? s.slice(0, MAX_CLOSE_REASON) : s;
}
function nowMs() { return Date.now(); }

/* ================================================================== *
 *  1. 配置体系：KV > 环境变量 > 默认
 * ================================================================== */

// KV 键（全局平铺；一个命名空间 = 一个实例；部署脚本自动创建专用 KV）
const KV_CFG = 'cfg';     // 面板配置 JSON
const KV_IPS = 'ips';     // 面板保存的优选列表文本
const KV_VER = 'ver';     // 配置版本号（保存时 +1，用于跨 isolate 缓存失效）

// 默认配置（面板可覆盖字段；环境变量优先级介于两者之间）
function defaultConfig() {
  return {
    uuid: '',
    trojanPassword: '',
    et: false,
    wsPath: '',
    proxyip: '',
    s: '',
    qj: '',
    yx: '',
    yxURL: '',
    maskHtml: '',
    maskUrl: '',
    outboundPorts: [],
    api: false,
    version: '',
  };
}

// 环境变量 → 配置合并（大写/小写都读，兼容上游命名）
function envConfig(env) {
  const g = (name, fallback = '') => {
    const v = env[name] ?? env[name.toUpperCase()] ?? env[name.toLowerCase()] ?? fallback;
    return v === undefined ? fallback : String(v);
  };
  return {
    uuid: g('u'),
    trojanPassword: g('tp'),
    et: g('et').toLowerCase() === 'yes' || g('et') === '1' || g('et') === 'on' || g('et') === 'true',
    wsPath: g('d') || g('ws_path'),
    proxyip: g('p') || g('proxyip'),
    s: g('s'),
    qj: g('qj'),
    yx: g('yx'),
    yxURL: g('yxurl') || g('yx_url'),
    maskHtml: g('mask_html'),
    maskUrl: g('mask_url'),
    outboundPorts: parsePortList(g('outbound_ports')),
    api: g('ae').toLowerCase() === 'yes' || g('ae') === '1',
    version: '',
  };
}

function parsePortList(s) {
  if (!s) return null;
  const out = [];
  for (const part of String(s).split(',')) {
    const n = parseInt(part.trim(), 10);
    if (Number.isInteger(n) && n >= 1 && n <= 65535) out.push(n);
  }
  return out.length ? out : null;
}

/* ---------- KV 读取（10 秒窗口合并 + 版本失效） ---------- */
const _kvCache = new Map(); // key -> { time, promise }
const _verCache = { ver: null, cfg: null, at: 0 };

async function kvRead(kv, key, ttlMs = 10000) {
  const hit = _kvCache.get(key);
  if (hit && nowMs() - hit.time < ttlMs) {
    try { return await hit.promise; } catch { /* fallthrough */ }
  }
  const promise = kv.get(key).then((v) => v).catch(() => null);
  _kvCache.set(key, { time: nowMs(), promise });
  try { return await promise; } catch { return null; }
}

async function kvWrite(kv, key, value) {
  // 写配额保护：写前使缓存失效，避免读到旧值后重复写
  _kvCache.delete(key);
  // 配置/版本键写入时同步失效面板配置缓存
  if (key === KV_CFG || key === KV_VER) {
    _verCache.ver = null;
    _verCache.cfg = null;
    _verCache.at = 0;
  }
  await kv.put(key, value);
}

// 读面板配置：先读版本键（10s 缓存），版本变化才重读配置
async function readPanelConfig(kv) {
  if (!kv) return null;
  try {
    const ver = await kvRead(kv, KV_VER, 10000);
    if (_verCache.ver === ver && _verCache.at > 0) return _verCache.cfg;
    const raw = await kvRead(kv, KV_CFG, 5000);
    const cfg = raw ? JSON.parse(raw) : null;
    _verCache.ver = ver;
    _verCache.cfg = cfg;
    _verCache.at = nowMs();
    return cfg;
  } catch { return null; }
}

// 合并三源配置（KV 字段覆盖环境变量字段；null 字段表示未在 KV 设置）
function mergedConfig(envCfg, kvCfg) {
  const def = defaultConfig();
  const out = { ...def, ...envCfg };
  if (kvCfg && typeof kvCfg === 'object') {
    for (const key of Object.keys(def)) {
      const v = kvCfg[key];
      if (v !== undefined && v !== null && v !== '') {
        if (key === 'et') out.et = v === true || v === 'yes' || v === '1';
        else if (key === 'api') out.api = v === true || v === 'yes' || v === '1';
        else if (key === 'outboundPorts' && Array.isArray(v)) out.outboundPorts = v;
        else out[key] = String(v);
      }
    }
    // 显式清除：KV 里存了字符串 "off" / "0" 视为关闭对应项
    for (const key of ['maskHtml', 'maskUrl', 'proxyip', 's']) {
      const v = kvCfg[key];
      if (v === 'off' || v === '0' || v === 'false') out[key] = '';
    }
  }
  if (!out.wsPath) out.wsPath = '/cfone-ws';
  if (!out.wsPath.startsWith('/')) out.wsPath = '/' + out.wsPath;
  if (!out.uuid) out.uuid = deriveUUID(envCfg.panelPassword);
  return out;
}

// 由面板密码派生默认节点 UUID（确定性，避免明文密码直接作 UUID）
function deriveUUID(password) {
  // 同步 FNV-1a 128bit 派生：四轮不同种子哈希拼接，产出标准 8-4-4-4-12 UUID
  const seeds = [0x811c9dc5, 0x01000193, 0x85ebca6b, 0xc2b2ae35];
  const hs = seeds.map((seed) => {
    let h = seed;
    const s = String(password || '');
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i) + i * 31;
      h = (((h ^ c) >>> 0) * seed) >>> 0;
    }
    return h >>> 0;
  });
  const hex = (n) => { let x = n >>> 0, h = ''; for (let i = 0; i < 8; i++) { h = HEX[x & 15] + h; x >>>= 4; } return h; };
  const full = hs.map(hex).join(''); // 32 hex chars
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}-${full.slice(16, 20)}-${full.slice(20)}`;
}

/* ================================================================== *
 *  2. 会话与订阅令牌（安全）
 * ================================================================== */

// 会话：登录成功后下发 HttpOnly Cookie，值为 HMAC(A, nonce)；
// 服务端内存记录 nonce 集合，校验时重算 HMAC 常量时间比较。
const _sessions = new Set(); // nonce hex
const _loginAttempts = new Map(); // ip -> [timestamps]

async function checkPassword(envCfg, password) {
  const a = envCfg.panelPassword;
  if (!a) return false;
  // 常量时间比较 + PBKDF2 双保险：先长度/字符快速否决，再做散列比较
  if (typeof password !== 'string' || password.length !== a.length) return false;
  const salt = randomUUID();
  const [h1, h2] = await Promise.all([pbkdf2Hex(password, salt), pbkdf2Hex(a, salt)]);
  return safeEqual(h1, h2);
}

function loginThrottled(ip) {
  const now = nowMs();
  const arr = (_loginAttempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (arr.length >= LOGIN_MAX_PER_IP) { _loginAttempts.set(ip, arr); return true; }
  arr.push(now);
  _loginAttempts.set(ip, arr);
  return false;
}

async function issueSession(panelPassword) {
  const nonce = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  const sig = await hmacHex(panelPassword, 'sess:' + nonce);
  _sessions.add(nonce);
  return { cookie: nonce + '.' + sig, nonce };
}

async function verifySession(panelPassword, cookieValue) {
  if (!cookieValue || !panelPassword) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;
  const [nonce, sig] = parts;
  if (!_sessions.has(nonce)) return false;
  const expect = await hmacHex(panelPassword, 'sess:' + nonce);
  return safeEqual(expect, sig);
}

function revokeSession(cookieValue) {
  const parts = (cookieValue || '').split('.');
  if (parts.length === 2) _sessions.delete(parts[0]);
}

// 订阅令牌：HMAC(A, "sub") 前 32 hex —— 订阅地址与面板密码路径分离
async function subToken(panelPassword) {
  const h = await hmacHex(panelPassword, 'sub');
  return h.slice(0, 32);
}

/* ================================================================== *
 *  3. 路由入口
 * ================================================================== */

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      // 未授权路径/内部错误一律落伪装页，绝不暴露内部信息
      return maskResponse(request, env, ctx, 200, err);
    }
  },
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const envCfg = {
    ...envConfig(env),
    panelPassword: String(env.A ?? ''),
  };
  const pw = envCfg.panelPassword;
  const isWs = request.headers.get('upgrade')?.toLowerCase() === 'websocket';

  // ---- 路由前置过滤：非已知路径一律不读 KV、不产生真实响应 ----
  // 1) 面板 /<A> 与 /<A>/*
  if (pw && (path === '/' + pw || path.startsWith('/' + pw + '/'))) {
    const cfg = await loadCfg(env);
    if (path === '/' + pw || path === '/' + pw + '/') {
      return handlePanelLoginPage(request, env, ctx, cfg);
    }
    let rest = path.slice(pw.length + 2);
    if (rest.startsWith('api/')) rest = rest.slice(4);
    return handlePanelApi(request, env, ctx, cfg, rest);
  }

  // 2) 订阅 /s/<token>（令牌与面板密码分离）
  if (method === 'GET' && path.startsWith('/s/')) {
    const expect = await subToken(pw);
    const tok = path.slice(3);
    if (expect && tok && safeEqual(tok, expect)) {
      const cfg = await loadCfg(env);
      return handleSubscription(request, env, ctx, cfg);
    }
    return maskResponse(request, env, ctx, 404);
  }

  // 3) 隧道入口（WS 升级；未设 A 时拒绝——无密码即无代理）
  if (isWs) {
    if (pw) {
      const cfg = await loadCfg(env);
      if (path === cfg.wsPath) {
        return handleTunnel(request, envCfg, cfg);
      }
    }
    return maskResponse(request, env, ctx, 404);
  }

  // 4) 其它：伪装页（不读 KV）
  return maskResponse(request, env, ctx, method === 'GET' ? 200 : 405);
}

// 需要配置的路径才合并 KV（其余请求零 KV 读取）
async function loadCfg(env) {
  const envCfg = {
    ...envConfig(env),
    panelPassword: String(env.A ?? ''),
  };
  const kv = env.K || null;
  const kvCfg = await readPanelConfig(kv);
  return mergedConfig(envCfg, kvCfg);
}

/* ================================================================== *
 *  4. 隧道（VLESS/WS + Trojan/WS）
 * ================================================================== */

async function handleTunnel(request, envCfg, cfg) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  const uuid = cfg.uuid;
  const trojanPassword = cfg.trojanPassword || uuid;
  const trojanEnabled = cfg.et;
  // Trojan 口令散列预计算（SHA-224，同步首包校验用）
  if (trojanEnabled) trojanHashCache = await sha224Hex(trojanPassword);

  // 从 WS 请求 URL 提取 path 级覆盖参数（pyip / s / qj / wk）
  const wsUrl = new URL(request.url);
  const pathCfg = { ...cfg };
  if (wsUrl.searchParams.get('pyip')) pathCfg.proxyip = wsUrl.searchParams.get('pyip');
  if (wsUrl.searchParams.get('s')) pathCfg.s = wsUrl.searchParams.get('s');
  if (wsUrl.searchParams.get('qj')) pathCfg.qj = wsUrl.searchParams.get('qj');
  // pyip 与全局互斥：path 有 pyip 时完全覆盖全局 proxyip（与甬哥项目一致）

  let closed = false;
  let firstPacket = true;
  let unauthBytes = 0;
  let protocol = null; // 'vless' | 'trojan'
  let upBytes = 0;
  let downBytes = 0;
  const startedAt = nowMs();
  let upstream = null; // { socket, writer }
  let upstreamStallTimer = null;
  let redials = 0;

  const clientClose = (code, reason) => {
    if (closed) return;
    closed = true;
    clearStall();
    try { server.close(code, closeReason(reason)); } catch { /* ignore */ }
    closeUpstream();
  };

  const closeUpstream = () => {
    if (upstream) {
      try { upstream.socket.close(); } catch { /* ignore */ }
      upstream = null;
    }
  };

  const clearStall = () => {
    if (upstreamStallTimer) { clearTimeout(upstreamStallTimer); upstreamStallTimer = null; }
  };

  // 客户端消息 → 上游
  server.addEventListener('message', (ev) => {
    if (closed) return;
    const raw = ev.data;
    let bytes;
    if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw);
    else if (raw instanceof Uint8Array) bytes = raw;
    else if (typeof raw === 'string') bytes = utf8Encode(raw);
    else return;

    if (firstPacket) {
      firstPacket = false;
      try {
        const parsed = parseProxyHeader(bytes, uuid, trojanPassword, trojanEnabled);
        if (!parsed) { clientClose(1011, 'bad-header'); return; }
        protocol = parsed.protocol;
        const payload = parsed.payload;
        upBytes += bytes.length;
        const out = dialAndPipe(payload, parsed.target, pathCfg, onUpstreamData, onUpstreamError);
        return; // dialAndPipe 负责后续
      } catch (err) {
        clientClose(1011, 'proxy-fail');
        return;
      }
    }

    upBytes += bytes.length;
    if (upBytes > MAX_UPLOAD) { clientClose(1009, 'up-limit'); return; }
    if (upstream && upstream.writer) {
      upstream.writer.write(bytes).catch(() => clientClose(1011, 'up-write-fail'));
    }
  });

  server.addEventListener('close', () => {
    if (!closed) { closed = true; closeUpstream(); }
  });
  server.addEventListener('error', () => {
    if (!closed) { closed = true; closeUpstream(); }
  });

  // 上游数据 → 客户端（由 dialAndPipe 注入回调）
  function onUpstreamData(chunk) {
    if (closed) return;
    clearStall(); // 有数据即说明非假活，取消重拨定时器
    downBytes += chunk.length;
    if (downBytes > MAX_DOWNLOAD) { clientClose(1009, 'down-limit'); return; }
    try { server.send(chunk); } catch { clientClose(1011, 'down-send-fail'); }
  }
  function onUpstreamError(code, reason) {
    if (closed) return;
    clientClose(code, reason);
  }

  // 建立出站并双向泵
  async function dialAndPipe(earlyPayload, target, cfg2, onData, onErr) {
    clearStall();
    const deadline = startedAt + MAX_CONN_MS;
    try {
      const sock = await dialOutbound(target, cfg2, { deadline });
      upstream = sock;
      // 启动上游读取泵（竞速首字节 + 代理残余数据由 conn.first 携带）
      pumpUpstream(sock, onData, onErr);
      // 早到数据（VLESS addon 早期数据）立即写入上游
      if (earlyPayload && earlyPayload.length > 0) {
        sock.writer.write(earlyPayload).catch(() => onErr(1011, 'up-write-fail'));
      }
      // 假活检测：客户端发过数据但上游 3.5s 无响应 → 重拨一次
      armStall(sock);
    } catch (err) {
      onErr(1011, 'dial-fail');
    }
  }

  function armStall(sock) {
    clearStall();
    upstreamStallTimer = setTimeout(() => {
      // 仅当首包已解析且有上游时触发一次假活重拨
      if (closed || !upstream || redials >= 1) return;
      redials++;
      const target = lastTarget;
      if (!target) return;
      closeUpstream();
      dialAndPipe(null, target, pathCfg, onUpstreamData, onUpstreamError);
    }, STALL_TIMEOUT_MS);
  }

  let lastTarget = null;
  // 包装 dialAndPipe 以记录 target 供假活重拨
  const _origDial = dialAndPipe;
  dialAndPipe = (early, target, cfg2, onData, onErr) => {
    lastTarget = target;
    return _origDial(early, target, cfg2, onData, onErr);
  };

  return new Response(null, { status: 101, webSocket: client });
}

// 上游读取泵：持续读 TCP 并回调（conn.first 为竞速阶段已消费的首字节 / 代理握手残余数据）
function pumpUpstream(conn, onData, onErr) {
  if (conn.first && conn.first.length > 0) onData(conn.first);
  const reader = conn.reader || conn.socket.readable.getReader();
  (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) { onErr(1011, 'up-eof'); return; }
        onData(value);
      }
    } catch {
      onErr(1011, 'up-read-fail');
    }
  })();
}

// 解析 VLESS / Trojan 首包
function parseProxyHeader(bytes, uuid, trojanPassword, trojanEnabled) {
  // ---- Trojan：\r\n\r\n + sha224(56 hex) + \r\n\r\n + atyp... ----
  const TROJAN_HEAD = 0x0d0a0d0a;
  if (bytes.length >= 56 + 8 && bytes[0] === 13 && bytes[1] === 10 && bytes[2] === 13 && bytes[3] === 10) {
    if (!trojanEnabled) return null;
    const hashHex = utf8Decode(bytes.subarray(4, 4 + 56));
    if (!/^[0-9a-f]{56}$/.test(hashHex)) return null;
    if (bytes[60] !== 13 || bytes[61] !== 10 || bytes[62] !== 13 || bytes[63] !== 10) return null;
    // 校验是异步的，这里同步比较改为：先取期望值由调用方传入的 trojanPassword 计算
    // —— 由于 parseProxyHeader 同步，改用同步 SHA-224 不可行；
    //   方案：期望散列由 handleTunnel 在握手前预计算并缓存（同步比较 hex）
    if (!safeEqual(hashHex, trojanHashCache)) return null;
    const { atyp, addr, port, off } = parseAddress(bytes, 64);
    if (!atyp) return null;
    return { protocol: 'trojan', target: { host: addr, port }, payload: bytes.subarray(off) };
  }

  // ---- VLESS：version(1) + uuid(16) + addonLen(1) + addon + cmd(1) + atyp... ----
  if (bytes.length < 1 + 16 + 1 + 1 + 1 + 2) return null;
  if (bytes[0] !== 0) return null;
  const clientUuid = [
    hexStr(bytes, 1, 4), hexStr(bytes, 5, 2), hexStr(bytes, 7, 2),
    hexStr(bytes, 9, 2), hexStr(bytes, 11, 6),
  ].join('-');
  if (!safeEqual(clientUuid.toLowerCase(), uuid.toLowerCase())) return null;
  const addonLen = bytes[17];
  const addonStart = 18;
  if (addonStart + addonLen + 1 + 1 + 2 > bytes.length) return null;
  const cmd = bytes[addonStart + addonLen];
  if (cmd !== 0x01 && cmd !== 0x02) return null; // 仅 TCP；UDP 不支持（稳定优先）
  const { atyp, addr, port, off } = parseAddress(bytes, addonStart + addonLen + 1);
  if (!atyp) return null;
  const payloadStart = off;
  const early = bytes.subarray(addonStart, addonStart + addonLen); // addon 即早期数据
  const payload = bytes.subarray(payloadStart);
  const merged = new Uint8Array(early.length + payload.length);
  merged.set(early, 0);
  merged.set(payload, early.length);
  return { protocol: 'vless', target: { host: addr, port }, payload: merged };
}

function hexStr(u, start, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += HEX[u[start + i] >> 4] + HEX[u[start + i] & 15];
  return s;
}

// 解析目标地址（ATYP + addr + port），返回 {atyp, addr, port, off}
function parseAddress(bytes, start) {
  if (start >= bytes.length) return { off: start };
  const atyp = bytes[start];
  let off = start + 1;
  let addr = '';
  if (atyp === 1) { // IPv4
    if (off + 4 > bytes.length) return { off: start };
    addr = `${bytes[off]}.${bytes[off + 1]}.${bytes[off + 2]}.${bytes[off + 3]}`;
    off += 4;
  } else if (atyp === 2) { // 域名
    if (off + 1 > bytes.length) return { off: start };
    const len = bytes[off];
    off += 1;
    if (off + len > bytes.length) return { off: start };
    addr = utf8Decode(bytes.subarray(off, off + len));
    off += len;
  } else if (atyp === 3) { // IPv6
    if (off + 16 > bytes.length) return { off: start };
    const parts = [];
    for (let i = 0; i < 16; i += 2) {
      parts.push(HEX[bytes[off + i] >> 4] + HEX[bytes[off + i] & 15] + HEX[bytes[off + i + 1] >> 4] + HEX[bytes[off + i + 1] & 15]);
    }
    addr = parts.join(':');
    off += 16;
  } else {
    return { off: start };
  }
  if (off + 2 > bytes.length) return { off: start };
  const port = (bytes[off] << 8) | bytes[off + 1];
  off += 2;
  return { atyp, addr, port, off };
}

/* ================================================================== *
 *  5. 出站：候选竞速 + 代理 + 假活
 * ================================================================== */

// 目标地址校验（SSRF 防护：仅允许公网地址/合法域名，禁止内网/回环/保留段）
function isValidTargetHost(host) {
  if (!host || host.length > 253) return false;
  if (/^[0-9.]+$/.test(host)) {
    const parts = host.split('.');
    if (parts.length !== 4) return false;
    let invalid = false;
    parts.forEach((p) => { const n = parseInt(p, 10); if (!Number.isInteger(n) || n < 0 || n > 255) invalid = true; });
    if (invalid) return false;
    const first = parseInt(parts[0], 10);
    // 私有/回环/链路本地/保留段拒绝
    if (first === 10 || first === 127 || first === 0) return false;
    if (first === 192 && parseInt(parts[1], 10) === 168) return false;
    if (first === 172 && parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31) return false;
    if (first === 169 && parseInt(parts[1], 10) === 254) return false;
    if (first === 100 && parseInt(parts[1], 10) >= 64 && parseInt(parts[1], 10) <= 127) return false;
    return true;
  }
  if (host.includes(':')) {
    // IPv6：仅允许全局单播简化判断（拒绝 ::1、fe80:: 等）
    const lower = host.toLowerCase();
    if (lower === '::1' || lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('::')) return false;
    return /^[0-9a-f:.]+$/.test(lower);
  }
  // 域名：字母数字连字符点，不以连字符开头结尾，不含非法字符
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(host);
}

function isValidTargetPort(port, allowedPorts) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  if (allowedPorts && allowedPorts.length > 0) return allowedPorts.includes(port);
  return OUTBOUND_DEFAULT_PORTS.includes(port);
}

// 出站候选构建（按 qj 语义）
function buildCandidates(target, cfg) {
  const { host, port } = target;
  const list = [];
  const proxyip = cfg.proxyip || '';
  const proxy = cfg.s || '';

  if (cfg.qj === 'only') {
    if (proxy) list.push({ kind: 'proxy', spec: proxy });
    else list.push({ kind: 'direct', host, port });
    return list;
  }

  const direct = { kind: 'direct', host, port };
  const viaProxyIp = proxyip
    ? { kind: 'direct-via', host, port, viaHost: proxyHost(proxyip), viaPort: proxyPort(proxyip, port) }
    : null;

  if (cfg.qj === 'no') {
    list.push(direct);
    if (viaProxyIp) list.push(viaProxyIp);
    if (proxy) list.push({ kind: 'proxy', spec: proxy });
  } else {
    // 默认：直连与 ProxyIP 竞速（互斥竞速，不偷偷直连的变体：两者都尝试取先通）
    if (viaProxyIp) list.push(viaProxyIp);
    list.push(direct);
    if (proxy) list.push({ kind: 'proxy', spec: proxy });
  }
  return list;
}

function proxyHost(spec) {
  const m = spec.match(/^(?:[a-z]+:\/\/)?(?:[^@]+@)?\[?([^\]:/]+)\]?(?::(\d+))?$/);
  return m ? m[1] : spec;
}
function proxyPort(spec, fallback) {
  const m = spec.match(/^(?:[a-z]+:\/\/)?(?:[^@]+@)?\[?[^\]:/]+\]?:(\d+)$/);
  return m ? parseInt(m[1], 10) : (fallback || 443);
}

// 统一连接对象结构：{ socket, writer, reader, first }
async function dialOutbound(target, cfg, opts) {
  const allowedPorts = cfg.outboundPorts && cfg.outboundPorts.length ? cfg.outboundPorts : OUTBOUND_DEFAULT_PORTS;
  if (!isValidTargetHost(target.host) || !isValidTargetPort(target.port, allowedPorts)) {
    throw new Error('blocked-target');
  }
  const candidates = buildCandidates(target, cfg);
  const deadline = opts.deadline || (nowMs() + 20000);

  // 竞速组（直连 / ProxyIP）：并发建连并等待首字节，取最快有数据的连接
  // —— connect() 同步返回，真正的「通不通」取决于首个数据字节；无首字节即假活。
  const race = candidates.filter((c) => c.kind !== 'proxy');
  if (race.length > 0) {
    const conn = await raceConnect(race, deadline);
    if (conn) return conn;
  }

  // 代理组（SOCKS5/HTTP/HTTPS）：顺序完成握手（需要等代理协议响应，不宜并发）
  const proxies = candidates.filter((c) => c.kind === 'proxy');
  for (const p of proxies) {
    if (nowMs() >= deadline) break;
    try {
      const conn = await connectViaProxy(p.spec, target, deadline - nowMs());
      if (conn) return conn;
    } catch { /* 尝试下一个候选 */ }
  }
  throw new Error('no-candidate');
}

// 并发建连 + 读首字节竞速：取第一个收到数据的连接，其余成功者关闭
async function raceConnect(candidates, deadline) {
  const results = await Promise.allSettled(candidates.map(async (c) => {
    const info = c.kind === 'direct'
      ? { hostname: c.host, port: c.port }
      : { hostname: c.viaHost, port: c.viaPort };
    const socket = connect(info);
    const reader = socket.readable.getReader();
    const timeout = Math.max(500, Math.min(8000, deadline - nowMs()));
    const first = await Promise.race([
      reader.read().then((r) => r),
      new Promise((res) => setTimeout(() => res({ done: true, timeout: true }), timeout)),
    ]);
    if (first.done || first.timeout) {
      // 握手后无首字节 → 假活候选，剔除
      try { reader.releaseLock(); } catch { /* ignore */ }
      try { socket.close(); } catch { /* ignore */ }
      throw new Error('no-first-byte');
    }
    return { socket, writer: socket.writable.getWriter(), reader, first: first.value };
  }));
  const ok = results.filter((r) => r.status === 'fulfilled' && r.value);
  if (ok.length === 0) return null;
  const chosen = ok[0].value;
  for (let i = 1; i < ok.length; i++) {
    try { ok[i].value.socket.close(); } catch { /* ignore */ }
  }
  return chosen;
}

// 通过 SOCKS5 / HTTP(S) 代理建立隧道连接
// 返回 { socket, writer, reader, first }：reader 用于后续读取，first 为握手残余数据
async function connectViaProxy(spec, target, timeoutMs) {
  const m = spec.match(/^(([a-z]+):\/\/)?(([^@]+)@)?\[?([^\]:/]+)\]?(?::(\d+))?$/i);
  if (!m) throw new Error('bad-proxy-spec');
  const scheme = (m[2] || 'socks5').toLowerCase();
  const creds = m[4] || '';
  const host = m[5];
  const port = m[6] ? parseInt(m[6], 10) : (scheme === 'http' ? 80 : scheme === 'https' ? 443 : 1080);
  if (!host) throw new Error('bad-proxy-spec');

  const raw = connect({ hostname: host, port });
  const writer = raw.writable.getWriter();
  const reader = raw.readable.getReader();
  const encoder = new TextEncoder();

  if (scheme === 'socks5') {
    // 握手
    let auth = false;
    let user = '', pass = '';
    if (creds) {
      const ci = creds.indexOf(':');
      if (ci >= 0) { user = creds.slice(0, ci); pass = creds.slice(ci + 1); auth = true; }
    }
    const methods = auth ? [0x02, 0x00] : [0x00];
    await writer.write(new Uint8Array([0x05, methods.length, ...methods]));
    const reply = await readExact(reader, 2, timeoutMs);
    if (reply[0] !== 0x05 || reply[1] === 0xff) throw new Error('socks5-method-rejected');
    if (reply[1] === 0x02) {
      const u = encoder.encode(user);
      const p = encoder.encode(pass);
      const authReq = new Uint8Array(1 + 1 + u.length + 1 + p.length);
      authReq[0] = 0x01; authReq[1] = u.length;
      authReq.set(u, 2);
      authReq[2 + u.length] = p.length;
      authReq.set(p, 3 + u.length);
      await writer.write(authReq);
      const authReply = await readExact(reader, 2, timeoutMs);
      if (authReply[0] !== 0x01 || authReply[1] !== 0x00) throw new Error('socks5-auth-failed');
    }
    // CONNECT 请求
    const req = buildSocks5Connect(target);
    await writer.write(req);
    const head = await readExact(reader, 4, timeoutMs);
    if (head[0] !== 0x05 || head[1] !== 0x00) throw new Error('socks5-connect-rejected');
    // 跳过 BND.ADDR + BND.PORT
    let toSkip;
    if (head[3] === 1) toSkip = 4 + 2;
    else if (head[3] === 3) { const l = (await readExact(reader, 1, timeoutMs))[0]; toSkip = 1 + l + 2; }
    else if (head[3] === 4) toSkip = 16 + 2;
    else throw new Error('socks5-bad-bnd');
    if (toSkip > 0) await readExact(reader, toSkip, timeoutMs);
    return { socket: raw, writer, reader, first: null };
  }

  // HTTP CONNECT
  const connectUrl = `${target.host}:${target.port}`;
  const authHeader = creds ? 'Proxy-Authorization: Basic ' + btoa(creds) + '\r\n' : '';
  const headStr = `CONNECT ${connectUrl} HTTP/1.1\r\nHost: ${connectUrl}\r\n${authHeader}\r\n`;
  await writer.write(encoder.encode(headStr));
  const buf = [];
  let total = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) throw new Error('proxy-eof');
    buf.push(chunk.value);
    total += chunk.value.length;
    const all = concatBytes(buf);
    const idx = findHeaderEnd(all);
    if (idx >= 0) {
      const status = utf8Decode(all.subarray(0, idx)).split('\r\n')[0] || '';
      if (!/^HTTP\/1\.[01]\s+200/.test(status)) throw new Error('proxy-connect-rejected:' + status);
      const extra = all.subarray(idx + 4);
      return { socket: raw, writer, reader, first: extra.length > 0 ? extra : null };
    }
    if (total > 65536) throw new Error('proxy-header-too-big');
  }
}

function buildSocks5Connect(target) {
  const enc = new TextEncoder();
  const host = target.host;
  if (/^[0-9.]+$/.test(host)) {
    const parts = host.split('.').map(Number);
    const req = new Uint8Array(4 + 4 + 2);
    req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x01;
    req[4] = parts[0]; req[5] = parts[1]; req[6] = parts[2]; req[7] = parts[3];
    req[8] = target.port >> 8; req[9] = target.port & 0xff;
    return req;
  }
  const name = enc.encode(host);
  const req = new Uint8Array(4 + 1 + name.length + 2);
  req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x03;
  req[4] = name.length;
  req.set(name, 5);
  req[5 + name.length] = target.port >> 8;
  req[6 + name.length] = target.port & 0xff;
  return req;
}

function concatBytes(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
function findHeaderEnd(bytes) {
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
  }
  return -1;
}
async function readExact(reader, n, timeoutMs) {
  const chunks = [];
  let got = 0;
  const deadline = nowMs() + (timeoutMs || 8000);
  while (got < n) {
    const left = deadline - nowMs();
    if (left <= 0) throw new Error('read-timeout');
    const chunk = await reader.read();
    if (chunk.done) throw new Error('read-eof');
    chunks.push(chunk.value);
    got += chunk.value.length;
  }
  return concatBytes(chunks).subarray(0, n);
}

// Trojan 期望散列缓存（parseProxyHeader 同步校验用）
let trojanHashCache = '';

/* ================================================================== *
 *  6. 订阅生成（UA 自动识别多格式）
 * ================================================================== */

async function handleSubscription(request, env, ctx, cfg) {
  const url = new URL(request.url);
  const host = url.hostname;
  const ua = (request.headers.get('user-agent') || '').toLowerCase();

  const nodes = await buildNodeList(env, ctx, cfg);
  const uuid = cfg.uuid;
  const wsPath = cfg.wsPath;
  const trojanEnabled = cfg.et;
  const trojanPassword = cfg.trojanPassword || uuid;

  // 域名（SNI/Host）取请求 Host；非法则拒绝
  if (!isValidTargetHost(host)) return new Response('bad-host', { status: 400 });

  const format =
    url.searchParams.get('format') ||
    (ua.includes('clash') || ua.includes('mihomo') || ua.includes('verge') || ua.includes('stash') || ua.includes('karing') || ua.includes('surge') || ua.includes('loon') || ua.includes('quantumult')
      ? 'clash'
      : ua.includes('sing-box') || ua.includes('singbox')
      ? 'singbox'
      : ua.includes('v2ray') || ua.includes('shadowrocket') || ua.includes('nekobox') || ua.includes('nekoray') || ua.includes('v2rayng')
      ? 'base64'
      : 'plain');

  const query = url.searchParams.get('target'); // 家宽链式不在融合版（稳定性取舍，见 README）

  let body, contentType;
  switch (format) {
    case 'clash':
      body = buildClashYaml(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword);
      contentType = 'text/yaml; charset=utf-8';
      break;
    case 'singbox':
      body = buildSingBoxJson(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword);
      contentType = 'application/json; charset=utf-8';
      break;
    case 'base64':
      // 对 UTF-8 文本安全编码（btoa 仅支持 Latin-1）
      body = btoa(unescape(encodeURIComponent(buildPlainLinks(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword))));
      contentType = 'text/plain; charset=utf-8';
      break;
    case 'plain':
    default:
      body = buildPlainLinks(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword);
      contentType = 'text/plain; charset=utf-8';
      break;
  }

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Profile-Update-Interval': '720',
    },
  });
}

// 节点列表构建：KV(ips) 优先 → 手填 YX → 在线 YXURL → 内置池；去重 host:port
async function buildNodeList(env, ctx, cfg) {
  const out = [];
  const seen = new Set();
  const add = (line) => {
    const n = parsePreferred(line);
    if (!n) return;
    const key = `${n.host}:${n.port}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };

  // 1) 面板保存的列表（KV）
  const kv = env.K || null;
  if (kv) {
    const saved = await kvRead(kv, KV_IPS, 10000);
    if (saved) {
      for (const line of String(saved).split(/[\n,，]/)) add(line.trim());
    }
  }
  // 2) 手填 YX
  if (cfg.yx) {
    for (const line of String(cfg.yx).split(/[\n,，]/)) add(line.trim());
  }
  // 3) 在线列表 YXURL（失败保留旧列表）
  if (cfg.yxURL) {
    const urls = String(cfg.yxURL).split(/[,\n]/).map((u) => u.trim()).filter(Boolean);
    const results = await Promise.allSettled(urls.map((u) => fetchRemoteList(u)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        for (const line of r.value.split('\n')) add(line.trim());
      }
    }
  }
  // 4) 内置池兜底（仅当没有任何自定义来源时）
  if (out.length === 0) {
    for (const line of BUILTIN_IPS) add(line);
  }
  // 上限保护
  return out.slice(0, 300);
}

async function fetchRemoteList(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const res = await fetch(u, { headers: { 'User-Agent': __SFX('CFOne') }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 262144) return text.slice(0, 262144);
    return text;
  } catch { return null; }
}

// 解析优选行：IP:port#备注 或 域名:port#备注
function parsePreferred(line) {
  if (!line || line.length > 200) return null;
  const m = line.match(/^\[?([^\]:/]+)\]?(?::(\d+))?(?:#(.+))?$/);
  if (!m) return null;
  const host = m[1].trim();
  const port = m[2] ? parseInt(m[2], 10) : 443;
  const name = (m[3] || '').trim() || host;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  if (!isValidTargetHost(host)) return null;
  return { host, port, name };
}

function linkVless(ip, port, host, wsPath, uuid) {
  const path = encodeURIComponent(wsPath + '?ed=2048');
  return `vless://${uuid}@${ip}:${port}?encryption=none&security=tls&sni=${encodeURIComponent(host)}&fp=chrome&type=ws&host=${encodeURIComponent(host)}&path=${path}#${encodeURIComponent(nameOf(ip))}`;
}
function linkTrojan(ip, port, host, wsPath, pass) {
  const path = encodeURIComponent(wsPath + '?ed=2048');
  return `trojan://${encodeURIComponent(pass)}@${ip}:${port}?security=tls&sni=${encodeURIComponent(host)}&fp=chrome&type=ws&host=${encodeURIComponent(host)}&path=${path}#${encodeURIComponent(nameOf(ip))}`;
}
function nameOf(ip) {
  return __SFX('CFOne-') + ip.replace(/[^0-9a-zA-Z.-]/g, '');
}

function buildPlainLinks(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword) {
  const lines = [];
  for (const n of nodes) {
    lines.push(linkVless(n.host, n.port, host, wsPath, uuid));
    if (trojanEnabled) lines.push(linkTrojan(n.host, n.port, host, wsPath, trojanPassword));
  }
  return lines.join('\n') + '\n';
}

function buildClashYaml(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword) {
  const prox = [];
  nodes.forEach((n, i) => {
    const name = `${n.name}-${String(i + 1).padStart(2, '0')}`;
    prox.push({
      name,
      type: 'vless',
      server: n.host,
      port: n.port,
      uuid,
      network: 'ws',
      tls: true,
      'servername': host,
      'ws-opts': { path: wsPath + '?ed=2048', headers: { Host: host } },
      udp: true,
    });
    if (trojanEnabled) {
      prox.push({
        name: name + '-Trojan',
        type: 'trojan',
        server: n.host,
        port: n.port,
        password: trojanPassword,
        network: 'ws',
        tls: true,
        'servername': host,
        'ws-opts': { path: wsPath + '?ed=2048', headers: { Host: host } },
        udp: true,
      });
    }
  });
  const names = prox.map((p) => `"${p.name}"`);
  const yaml = [
    'mixed-port: 7890',
    'allow-lan: false',
    'mode: rule',
    'log-level: warning',
    'ipv6: false',
    'proxies:',
    ...prox.map((p) => yamlProxy(p)),
    'proxy-groups:',
    '  - name: ' + __SFX('"🚀 节点选择"'),
    '    type: select',
    '    proxies:',
    ...names.map((n) => `      - ${n}`),
    '  - name: ' + __SFX('"♻️ 自动选择"'),
    '    type: url-test',
    '    url: "http://www.gstatic.com/generate_204"',
    '    interval: 300',
    '    tolerance: 50',
    '    proxies:',
    ...names.map((n) => `      - ${n}`),
    'rules:',
    '  - "IP-CIDR,127.0.0.0/8,DIRECT"',
    '  - "IP-CIDR,10.0.0.0/8,DIRECT"',
    '  - "IP-CIDR,172.16.0.0/12,DIRECT"',
    '  - "IP-CIDR,192.168.0.0/16,DIRECT"',
    '  - "IP-CIDR6,::1/128,DIRECT"',
    '  - "IP-CIDR6,fc00::/7,DIRECT"',
    '  - "MATCH,' + __SFX('🚀 节点选择'),
    '',
  ].join('\n');
  return yaml;
}
function yamlProxy(p) {
  const lines = [
    `  - name: "${p.name}"`,
    `    type: ${p.type}`,
    `    server: ${p.server}`,
    `    port: ${p.port}`,
  ];
  if (p.type === 'vless') lines.push(`    uuid: ${p.uuid}`);
  if (p.type === 'trojan') lines.push(`    password: ${p.password}`);
  lines.push(`    udp: true`, `    tls: true`, `    servername: ${p.servername}`, `    network: ws`);
  lines.push(`    ws-opts:`);
  lines.push(`      path: "${p['ws-opts'].path}"`);
  lines.push(`      headers:`);
  lines.push(`        Host: ${p['ws-opts'].headers.Host}`);
  return lines.join('\n');
}

function buildSingBoxJson(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword) {
  const outbounds = [];
  nodes.forEach((n, i) => {
    outbounds.push({
      type: 'vless',
      tag: `${n.name}-${i + 1}`,
      server: n.host,
      server_port: n.port,
      uuid,
      tls: { enabled: true, server_name: host, utls: { enabled: true, fingerprint: 'chrome' } },
      transport: { type: 'ws', path: wsPath + '?ed=2048', headers: { Host: host } },
    });
    if (trojanEnabled) {
      outbounds.push({
        type: 'trojan',
        tag: `${n.name}-T-${i + 1}`,
        server: n.host,
        server_port: n.port,
        password: trojanPassword,
        tls: { enabled: true, server_name: host, utls: { enabled: true, fingerprint: 'chrome' } },
        transport: { type: 'ws', path: wsPath + '?ed=2048', headers: { Host: host } },
      });
    }
  });
  outbounds.push({ type: 'direct', tag: 'direct' });
  outbounds.push({ type: 'block', tag: 'block' });
  const selectorTags = outbounds.filter((o) => o.type !== 'direct' && o.type !== 'block').map((o) => o.tag);
  const json = {
    log: { level: 'warn' },
    dns: { servers: [{ address: 'https://223.5.5.5/dns-query', tag: 'doh' }] },
    outbounds: [
      {
        type: 'selector',
        tag: 'proxy',
        outbounds: selectorTags,
        default: selectorTags[0] || 'direct',
      },
      ...outbounds,
    ],
    route: {
      final: 'proxy',
      rules: [
        { ip_cidr: ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7'], outbound: 'direct' },
      ],
    },
  };
  return JSON.stringify(json, null, 2);
}

/* ================================================================== *
 *  7. 面板（登录 + 配置 + 优选管理）
 * ================================================================== */

function cookieValue(request, name) {
  const h = request.headers.get('cookie') || '';
  for (const part of h.split(';')) {
    const kv = part.trim();
    if (kv.startsWith(name + '=')) return kv.slice(name.length + 1);
  }
  return null;
}

async function handlePanelLoginPage(request, env, ctx, cfg) {
  const pw = String(env.A ?? '');
  const cookie = cookieValue(request, 'cfone_session');
  const authed = await verifySession(pw, cookie);
  const kv = env.K || null;
  const kvCfg = await readPanelConfig(kv);
  return new Response(panelHtml(authed, cfg, kv ? true : false, kvCfg ? kvCfg.version : ''), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function handlePanelApi(request, env, ctx, cfg, rest) {
  const pw = String(env.A ?? '');
  if (!pw) return json({ error: 'unauthorized' }, 401);

  // 登录 / 登出
  if (rest === 'login' && request.method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (loginThrottled(ip)) return json({ error: 'too-many' }, 429);
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const ok = await checkPassword({ panelPassword: pw }, String(body.password || ''));
    if (!ok) return json({ error: 'bad-password' }, 401);
    const sess = await issueSession(pw);
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        ...API_HEADERS,
        'Set-Cookie': `cfone_session=${sess.cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
      },
    });
  }
  if (rest === 'logout' && request.method === 'POST') {
    revokeSession(cookieValue(request, 'cfone_session'));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...API_HEADERS, 'Set-Cookie': 'cfone_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' },
    });
  }

  // 其余接口需会话
  const cookie = cookieValue(request, 'cfone_session');
  const authed = await verifySession(pw, cookie);
  if (!authed) return json({ error: 'unauthorized' }, 401);

  const kv = env.K || null;

  // 概览数据
  if (rest === 'overview' && request.method === 'GET') {
    const host = new URL(request.url).hostname;
    const tok = await subToken(pw);
    const nodes = await buildNodeList(env, ctx, cfg);
    return json({
      ok: true,
      uuid: cfg.uuid,
      wsPath: cfg.wsPath,
      et: cfg.et,
      api: cfg.api,
      kvBound: !!kv,
      host,
      subUrl: `https://${host}/s/${tok}`,
      nodeCount: nodes.length,
      version: VERSION,
    });
  }

  // 读取配置
  if (rest === 'config' && request.method === 'GET') {
    return json({ ok: true, config: panelSafeConfig(cfg) });
  }
  // 保存配置（写 KV，版本号 +1）
  if (rest === 'config' && request.method === 'PUT') {
    if (!kv) return json({ error: 'no-kv' }, 400);
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const next = sanitizeConfig(body.config || {});
    const ver = String(nowMs());
    await kvWrite(kv, KV_CFG, JSON.stringify(next));
    await kvWrite(kv, KV_VER, ver);
    return json({ ok: true, version: ver });
  }

  // 优选列表：读取 / 保存 / 恢复内置
  if (rest === 'preferred-ips') {
    if (request.method === 'GET') {
      const saved = kv ? await kvRead(kv, KV_IPS, 10000) : null;
      return json({ ok: true, list: saved || '', builtin: BUILTIN_IPS.length });
    }
    if (request.method === 'PUT') {
      if (!kv) return json({ error: 'no-kv' }, 400);
      let body;
      try { body = await request.json(); } catch { body = {}; }
      let text = String(body.list || '').slice(0, 262144);
      // 服务端规范化 + 去重
      const lines = text.split(/[\n,，]/).map((l) => l.trim()).filter(Boolean);
      const seen = new Set();
      const out = [];
      for (const l of lines) {
        const n = parsePreferred(l);
        if (!n) continue;
        const key = `${n.host}:${n.port}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(l);
      }
      if (out.length > 1000) out.length = 1000;
      await kvWrite(kv, KV_IPS, out.join('\n'));
      return json({ ok: true, count: out.length });
    }
    if (request.method === 'DELETE') {
      if (!kv) return json({ error: 'no-kv' }, 400);
      await kvWrite(kv, KV_IPS, '');
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  }

  // 健康探针
  if (rest === 'health' && request.method === 'GET') {
    return json({ ok: true, ts: nowMs(), uuid: cfg.uuid, wsPath: cfg.wsPath });
  }

  return json({ error: 'not-found' }, 404);
}

function panelSafeConfig(cfg) {
  return {
    uuid: cfg.uuid,
    trojanPassword: cfg.trojanPassword,
    et: cfg.et,
    wsPath: cfg.wsPath,
    proxyip: cfg.proxyip,
    s: cfg.s,
    qj: cfg.qj,
    yx: cfg.yx,
    yxURL: cfg.yxURL,
    maskHtml: cfg.maskHtml,
    maskUrl: cfg.maskUrl,
    api: cfg.api,
  };
}

// 面板写入配置的白名单清洗
function sanitizeConfig(input) {
  const out = {};
  const keys = ['uuid', 'trojanPassword', 'et', 'wsPath', 'proxyip', 's', 'qj', 'yx', 'yxURL', 'maskHtml', 'maskUrl', 'api'];
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null) continue;
    if (k === 'et' || k === 'api') out[k] = v === true || v === 'yes' || v === '1' || v === 'on';
    else out[k] = String(v).slice(0, 16384);
  }
  if (out.wsPath && !out.wsPath.startsWith('/')) out.wsPath = '/' + out.wsPath;
  if (out.uuid && !isUUID(out.uuid)) delete out.uuid;
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: API_HEADERS });
}

/* ================================================================== *
 *  8. 伪装页
 * ================================================================== */

const MASK_DEFAULT = __SFX(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f7f9;color:#333}h1{font-weight:600;font-size:1.6rem;letter-spacing:.5px}main{text-align:center;padding:2rem}</style></head><body><main><h1>Welcome to Cloudflare</h1><p>This site is running on Cloudflare.</p></main></body></html>`);

async function maskResponse(request, env, ctx, status, err) {
  const cfgLike = mergedConfig(envConfig(env), null);
  const maskHtml = cfgLike.maskHtml || '';
  const maskUrl = cfgLike.maskUrl || '';
  if (maskHtml.toLowerCase() === 'off' || maskHtml === '0' || maskHtml === 'false') {
    return new Response('Not Found', { status: 404 });
  }
  if (maskHtml) return new Response(maskHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status });
  if (maskUrl) {
    try {
      const res = await fetch(maskUrl, { headers: { 'User-Agent': __SFX('CFOne') }, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const body = await res.text();
        return new Response(body, { headers: { 'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8' }, status });
      }
    } catch { /* fallthrough */ }
  }
  return new Response(MASK_DEFAULT, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status });
}

/* ================================================================== *
 *  9. 面板 HTML（构建时整体脱敏）
 * ================================================================== */

const PANEL_HTML = __SFX(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CFOne · 管理面板</title>
<style>
:root{--bg:#0f1115;--card:#171a21;--line:#262b36;--text:#e6e8ee;--muted:#8b93a7;--acc:#4f8cff;--ok:#3fb68b;--warn:#e5a54b;--err:#e05d5d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px}
.wrap{max-width:880px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:1.25rem;margin:0 0 4px}h2{font-size:1rem;margin:0 0 12px;color:var(--acc)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
label{display:block;margin:10px 0 4px;color:var(--muted);font-size:12px}
input,select,textarea{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:#10131a;color:var(--text);font-size:13px}
textarea{resize:vertical;min-height:90px;font-family:ui-monospace,Consolas,monospace}
.row{display:flex;gap:8px;align-items:center;margin-top:14px}
button{padding:9px 16px;border:0;border-radius:8px;background:var(--acc);color:#fff;font-size:13px;cursor:pointer}
button.ghost{background:#232838}button.ok{background:var(--ok)}button.warn{background:var(--warn)}button:disabled{opacity:.5;cursor:default}
.muted{color:var(--muted)}.err{color:var(--err)}.okc{color:var(--ok)}
pre{background:#0c0e13;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;overflow:auto;color:var(--text)}
.hidden{display:none}
code{background:#10131a;border:1px solid var(--line);border-radius:6px;padding:2px 6px;font-size:12px;word-break:break-all}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;background:#232838;color:var(--muted);margin-left:6px}
.toast{position:fixed;right:16px;top:16px;z-index:99;background:#1c2230;border:1px solid var(--line);border-radius:10px;padding:10px 14px;max-width:320px;display:none}
.toast.show{display:block}
.nav{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 18px}
.nav button{background:#1c2130;color:var(--muted);border:1px solid var(--line)}
.nav button.active{background:var(--acc);color:#fff;border-color:var(--acc)}
.tab{display:none}.tab.active{display:block}
</style>
</head>
<body>
<div class="wrap">
<h1>CFOne 管理面板</h1>
<div class="muted">单文件 Cloudflare 代理面板 · 版本 <span id="ver">-</span></div>

<div id="login" class="card">
<h2>登录</h2>
<label>面板密码（部署变量 A）</label>
<input id="pw" type="password" autocomplete="current-password" placeholder="输入 A 的值">
<div class="row"><button id="btn-login">登录</button><span class="muted" id="login-msg"></span></div>
</div>

<div id="main" class="hidden">
<div class="nav">
<button data-tab="overview" class="active">概览</button>
<button data-tab="nodes">优选节点</button>
<button data-tab="settings">设置</button>
<button data-tab="about">关于</button>
</div>

<div id="tab-overview" class="tab active">
<div class="card">
<h2>概览</h2>
<div class="grid">
<div>
<label>节点 UUID</label><code id="ov-uuid">-</code>
<label>WS 路径</label><code id="ov-ws">-</code>
<label>节点数量</label><span id="ov-nodes" class="okc">-</span>
<label>Trojan/WS</label><span id="ov-et">-</span>
<label>KV 绑定</label><span id="ov-kv">-</span>
</div>
<div>
<label>订阅地址（自动识别客户端格式）</label>
<code id="ov-sub">-</code>
<div class="row">
<button id="btn-copy-sub" class="ghost">复制订阅地址</button>
<button id="btn-copy-clash" class="ghost">复制 Clash 地址</button>
</div>
<div class="muted" style="margin-top:8px">客户端 UA 自动匹配：Clash/Mihomo → YAML · sing-box → JSON · v2rayN/NekoBox → Base64 · 浏览器 → 明文</div>
</div>
</div>
</div>
</div>

<div id="tab-nodes" class="tab">
<div class="card">
<h2>优选节点（客户端连接的入口地址）</h2>
<div class="muted">留空并使用内置池；填写后订阅仅使用此列表。支持 IP:port#备注 或 域名:port#备注，逗号/换行分隔，最多 1000 条。</div>
<label>手动列表</label>
<textarea id="cfg-yx" placeholder="1.1.1.1:443#节点A&#10;104.17.29.6:443#节点B"></textarea>
<label>在线列表 URL（逗号分隔多个）</label>
<input id="cfg-yxurl" placeholder="https://example.com/list.txt">
<div class="row">
<button id="btn-save-nodes">保存优选节点</button>
<button id="btn-reset-nodes" class="ghost">恢复内置池</button>
<span class="muted" id="nodes-msg"></span>
</div>
</div>
</div>

<div id="tab-settings" class="tab">
<div class="card">
<h2>协议与入口</h2>
<div class="grid">
<div>
<label>节点 UUID（留空 = 由 A 派生）</label><input id="cfg-uuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
<label>WS 隧道路径</label><input id="cfg-wspath" placeholder="/cfone-ws">
<label><input type="checkbox" id="cfg-et" style="width:auto"> 启用 Trojan/WS</label>
</div>
<div>
<label>Trojan 密码（留空 = 节点 UUID）</label><input id="cfg-tp">
<label>WS 路径</label><div class="muted" style="padding:9px 0">与客户端订阅一致，改后需重新导入订阅</div>
</div>
</div>
</div>

<div class="card">
<h2>出站与优选</h2>
<div class="grid">
<div>
<label>ProxyIP（host 或 host:port）</label><input id="cfg-p" placeholder="可选">
<label>出站代理（socks5:// | http:// | https://，可带 user:pass@）</label><input id="cfg-s" placeholder="socks5://user:pass@host:1080">
</div>
<div>
<label>出站方式</label>
<select id="cfg-qj">
<option value="">竞速（直连 + ProxyIP 并发取先通）</option>
<option value="no">直连优先，失败再走代理</option>
<option value="only">只走代理（不回落）</option>
</select>
<label><input type="checkbox" id="cfg-api" style="width:auto"> 允许优选 API 管理</label>
</div>
</div>
</div>

<div class="card">
<h2>伪装页</h2>
<div class="grid">
<div>
<label>MASK_HTML（off/0 关闭伪装）</label><textarea id="cfg-maskhtml" placeholder="留空使用内置欢迎页"></textarea>
</div>
<div>
<label>MASK_URL（失败回退内置页）</label><input id="cfg-maskurl" placeholder="https://example.com">
</div>
</div>
</div>

<div class="row">
<button id="btn-save" class="ok">保存全部</button>
<button id="btn-logout" class="ghost">退出登录</button>
<span class="muted" id="save-msg"></span>
</div>
</div>

<div id="tab-about" class="tab">
<div class="card">
<h2>关于</h2>
<div class="muted">
CFOne 融合自 CFAPEX / CFPilot / cfnew 三个上游项目：单文件双形态部署 · KV 读取优化（无关请求不读 KV、10 秒窗口合并）· PBKDF2 口令 + HttpOnly 会话 + 订阅签名令牌 · 出站候选竞速与假活检测 · UA 自动识别多格式订阅。<br><br>
安全提示：面板持有者即账号访问者。面板密码 A 请使用长随机值，不要公开订阅地址与面板地址。泄露后请更换 A 并重新部署变量。
</div>
</div>
</div>
</div>

<div class="toast" id="toast"></div>
</div>

<script>
const API = location.pathname.replace(/\/+$/, '');
const $ = (id) => document.getElementById(id);
let authed = ${'__AUTHED__'};
let cfg = ${'__CFG__'};

function toast(msg, ok) {
  const t = $('toast');
  t.textContent = msg;
  t.style.borderColor = ok ? 'var(--ok)' : 'var(--err)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
async function api(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { location.reload(); return null; }
  const data = await res.json().catch(() => null);
  return data;
}
function fillForm(c) {
  if (!c) return;
  $('cfg-uuid').value = c.uuid || '';
  $('cfg-wspath').value = c.wsPath || '';
  $('cfg-et').checked = !!c.et;
  $('cfg-tp').value = c.trojanPassword || '';
  $('cfg-p').value = c.proxyip || '';
  $('cfg-s').value = c.s || '';
  $('cfg-qj').value = c.qj || '';
  $('cfg-yx').value = c.yx || '';
  $('cfg-yxurl').value = c.yxURL || '';
  $('cfg-maskhtml').value = c.maskHtml || '';
  $('cfg-maskurl').value = c.maskUrl || '';
  $('cfg-api').checked = !!c.api;
}
async function loadOverview() {
  const d = await api(API + '/api/overview', 'GET');
  if (!d) return;
  $('ver').textContent = d.version || '-';
  $('ov-uuid').textContent = d.uuid || '-';
  $('ov-ws').textContent = d.wsPath || '-';
  $('ov-nodes').textContent = d.nodeCount;
  $('ov-et').textContent = d.et ? '已启用' : '关闭';
  $('ov-kv').textContent = d.kvBound ? '已绑定' : '未绑定（配置仅内存生效）';
  $('ov-sub').textContent = d.subUrl || '-';
}
async function loadConfig() {
  const d = await api(API + '/api/config', 'GET');
  if (d && d.config) fillForm(d.config);
}
function ui() {
  $('login').classList.toggle('hidden', authed);
  $('main').classList.toggle('hidden', !authed);
  if (!authed) return;
  loadOverview();
  loadConfig();
}
document.querySelectorAll('.nav button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('tab-' + b.dataset.tab).classList.add('active');
  });
});
$('btn-login').addEventListener('click', async () => {
  const pw = $('pw').value;
  const d = await api(API + '/api/login', 'POST', { password: pw });
  if (d && d.ok) { toast('登录成功', true); authed = true; ui(); }
  else $('login-msg').textContent = '密码错误或请求受限';
});
$('btn-logout').addEventListener('click', async () => {
  await api(API + '/api/logout', 'POST', {});
  location.reload();
});
$('btn-save').addEventListener('click', async () => {
  const cfg = {
    uuid: $('cfg-uuid').value.trim(),
    wsPath: $('cfg-wspath').value.trim(),
    et: $('cfg-et').checked,
    trojanPassword: $('cfg-tp').value,
    proxyip: $('cfg-p').value.trim(),
    s: $('cfg-s').value.trim(),
    qj: $('cfg-qj').value,
    yx: $('cfg-yx').value,
    yxURL: $('cfg-yxurl').value.trim(),
    maskHtml: $('cfg-maskhtml').value,
    maskUrl: $('cfg-maskurl').value.trim(),
    api: $('cfg-api').checked,
  };
  const d = await api(API + '/api/config', 'PUT', { config: cfg });
  if (d && d.ok) { toast('已保存', true); loadOverview(); }
  else { toast(d && d.error === 'no-kv' ? '未绑定 KV，无法保存' : '保存失败', false); }
});
$('btn-save-nodes').addEventListener('click', async () => {
  const list = $('cfg-yx').value;
  const d = await api(API + '/api/preferred-ips', 'PUT', { list });
  if (d && d.ok) { toast('已保存 ' + d.count + ' 条', true); }
  else toast('保存失败（需绑定 KV）', false);
});
$('btn-reset-nodes').addEventListener('click', async () => {
  const d = await api(API + '/api/preferred-ips', 'DELETE', {});
  if (d && d.ok) { $('cfg-yx').value = ''; toast('已恢复内置池', true); }
  else toast('恢复失败（需绑定 KV）', false);
});
$('btn-copy-sub').addEventListener('click', () => { navigator.clipboard.writeText($('ov-sub').textContent); toast('已复制', true); });
$('btn-copy-clash').addEventListener('click', () => { navigator.clipboard.writeText($('ov-sub').textContent + '?format=clash'); toast('已复制', true); });
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-login').click(); });
ui();
</script>
</body>
</html>
`);

function panelHtml(authed, cfg, kvBound, version) {
  let html = PANEL_HTML;
  // 注入登录态与当前配置（前端用 API 变量计算面板 API 基础路径）
  // PANEL_HTML 模板内使用 ${'__AUTHED__'} / ${'__CFG__'} 占位，base64 解码后是字面文本，
  // 此处整段替换为合法 JS 值。
  html = html
    .replace("${'__AUTHED__'}", authed ? 'true' : 'false')
    .replace("${'__CFG__'}", JSON.stringify(panelSafeConfig(cfg))
      .replace(/</g, '\\u003c')); // 防 HTML 注入
  return html;
}
