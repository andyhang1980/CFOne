// CFOne 冒烟测试：mock cloudflare:sockets + KV，验证核心路由/订阅/面板逻辑
// 用法：node scripts/smoke-test.mjs

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

// ---- mock cloudflare:sockets ----
const mockConnect = () => ({
  readable: new ReadableStream({ start(c) { c.close(); } }),
  writable: new WritableStream({ write() {} }),
  close() {},
});
globalThis.__CFONE_MOCK_CONNECT = { connect: mockConnect };

// ---- mock KV ----
class MockKV {
  constructor() { this.store = new Map(); this.reads = 0; }
  async get(key) { this.reads++; return this.store.has(key) ? this.store.get(key) : null; }
  async put(key, value) { this.store.set(key, String(value)); }
}

// ---- 加载产物 ----
const fs = await import('node:fs');
let code = fs.readFileSync('dist/CFOne-worker.js', 'utf8');
const MOCK = 'const{connect}=globalThis.__CFONE_MOCK_CONNECT||{connect:()=>({readable:new ReadableStream({start(c){c.close()}}),writable:new WritableStream(),close(){}})}';
code = code.split('import{connect}from"cloudflare:sockets";').join(MOCK);
code = code.split('import{connect}from"cloudflare:sockets"').join(MOCK);
const tmpFile = process.cwd() + '/dist/_smoke.mjs';
fs.writeFileSync(tmpFile, code);
const mod = await import(pathToFileURL(tmpFile).href);
const worker = mod.default;

// ---- 测试工具 ----
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name); }
}

const BASE = 'https://test.workers.dev';
const PASSWORD = 'test-pass-test-panel-pw-9f3a7c';

function makeEnv() {
  const kv = new MockKV();
  return { A: PASSWORD, K: kv };
}
function makeReq(path, opts = {}) {
  return new Request(BASE + path, opts);
}
// worker.fetch(request, env) —— env 直接传
async function call(path, env, opts = {}) {
  return worker.fetch(makeReq(path, opts.req), env);
}

console.log('=== CFOne 冒烟测试 ===\n');

// 1. 未设 A → 全站伪装页
{
  const env = { A: '', K: new MockKV() };
  const res = await call('/', env);
  check('未设 A 时根路径返回伪装页', res.status === 200 && (await res.text()).includes('Welcome'));
}

// 2. 面板登录页
{
  const env = makeEnv();
  const res = await call('/' + PASSWORD, env);
  const html = await res.text();
  check('面板登录页可访问', res.status === 200 && html.includes('登录'));
  check('面板页面含登录表单', html.includes('btn-login'));
}

// 3. 错误密码登录被拒
{
  const env = makeEnv();
  const res = await call('/' + PASSWORD + '/api/login', env, {
    req: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) },
  });
  check('错误密码登录被拒(401)', res.status === 401);
}

// 4. 正确密码登录成功
{
  const env = makeEnv();
  const res = await call('/' + PASSWORD + '/api/login', env, {
    req: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) },
  });
  const setCookie = res.headers.get('set-cookie');
  check('正确密码登录成功', res.status === 200 && setCookie && setCookie.includes('cfone_session'));
}

// 5. 订阅地址与面板密码分离
{
  const env = makeEnv();
  const loginRes = await call('/' + PASSWORD + '/api/login', env, {
    req: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) },
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  const ovRes = await call('/' + PASSWORD + '/api/overview', env, {
    req: { headers: { cookie } },
  });
  const ov = await ovRes.json();
  if (!ov.uuid || ov.uuid.length !== 36) console.log('  [debug] overview:', JSON.stringify(ov));
  check('概览接口返回 UUID', !!ov.uuid && ov.uuid.length === 36);
  check('概览接口返回订阅地址', ov.subUrl && ov.subUrl.includes('/s/'));
  check('订阅令牌与面板密码不同', !ov.subUrl.includes(PASSWORD));

  const subPath = ov.subUrl.replace(BASE, '');
  const subRes = await call(subPath, env, {
    req: { headers: { 'User-Agent': 'clash/verge' } },
  });
  const subText = await subRes.text();
  check('订阅返回 Clash YAML', subRes.status === 200 && subText.includes('proxies:'));
  check('订阅含 vless 节点', subText.includes('vless'));

  const subRes2 = await call(subPath + '?format=singbox', env, {
    req: { headers: { 'User-Agent': 'sing-box' } },
  });
  const subText2 = await subRes2.text();
  check('订阅返回 sing-box JSON', subRes2.status === 200 && subText2.includes('"outbounds"'));

  const subRes3 = await call(subPath + '?format=base64', env, {
    req: { headers: { 'User-Agent': 'v2rayN' } },
  });
  const subText3 = await subRes3.text();
  check('订阅返回 base64', subRes3.status === 200 && subText3.length > 0 && !subText3.includes('vless://'));
}

// 6. 错误订阅令牌 → 伪装页
{
  const env = makeEnv();
  const res = await call('/s/badtoken', env);
  check('错误订阅令牌返回伪装页', (res.status === 404 || res.status === 200) && (await res.text()).includes('Welcome'));
}

// 7. 无关路径不读 KV
{
  const env = makeEnv();
  await call('/random-path', env);
  check('无关路径不读 KV', env.K.reads === 0);
}

// 8. 配置保存（需 KV）
{
  const env = makeEnv();
  const loginRes = await call('/' + PASSWORD + '/api/login', env, {
    req: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) },
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  const putRes = await call('/' + PASSWORD + '/api/config', env, {
    req: { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ config: { wsPath: '/mypath', et: true } }) },
  });
  const putJson = await putRes.json();
  check('配置保存成功', putRes.status === 200 && putJson.ok);
  const getRes = await call('/' + PASSWORD + '/api/config', env, {
    req: { headers: { cookie } },
  });
  const getJson = await getRes.json();
  if (getJson.config.wsPath !== '/mypath' || getJson.config.et !== true) console.log('  [debug] get config:', JSON.stringify(getJson));
  check('配置读取一致', getJson.config.wsPath === '/mypath' && getJson.config.et === true);
}

// 9. 优选节点保存与去重
{
  const env = makeEnv();
  const loginRes = await call('/' + PASSWORD + '/api/login', env, {
    req: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) },
  });
  const cookie = loginRes.headers.get('set-cookie').split(';')[0];
  const putRes = await call('/' + PASSWORD + '/api/preferred-ips', env, {
    req: { method: 'PUT', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ list: '1.1.1.1:443#A,1.1.1.1:443#B,2.2.2.2:8443#C' }) },
  });
  const putJson = await putRes.json();
  check('优选节点保存去重(1.1.1.1 只留 1 条)', putJson.count === 2);
}

console.log(`\n=== 结果：${pass} 通过，${fail} 失败 ===`);
process.exit(fail > 0 ? 1 : 0);
