# CFOne · 单文件 Cloudflare 代理面板

> 融合 CFPilot / CFAPEX / cfnew / Cloudflare-vless-trojan 四个上游项目的设计，
> 目标：**最方便部署、最稳定、安全性最高**。

## 特性

| 维度 | 实现 |
| --- | --- |
| **部署** | 单文件双形态：Worker 粘贴 / Pages Advanced Mode，必填仅 `A` 一个变量 |
| **稳定** | 无关请求零 KV 读取、10 秒窗口合并缓存、配置版本号失效；出站候选竞速 + 假活检测（无首字节即换路）；WS close reason 123 字节截断；连接/流量上限保护 |
| **安全** | PBKDF2 口令散列 + HttpOnly 会话 + 常量时间比较 + IP 限速；订阅签名令牌与面板密码分离；SSRF 防护（拒绝内网/回环/保留段）；构建时静态脱敏（中文/品牌名零明文残留） |
| **订阅** | UA 自动识别：Clash/Mihomo → YAML · sing-box → JSON · v2rayN/NekoBox → Base64 · 浏览器 → 明文；也支持 `?format=` 显式指定 |
| **出站** | 直连 / ProxyIP 竞速、SOCKS5 / HTTP / HTTPS 代理、出站方式三选一（竞速/直连优先/只走代理）；Path 级 `pyip` / `s` / `qj` 单节点覆盖 |
| **面板** | 图形化管理：UUID、WS 路径、Trojan 开关、ProxyIP、出站代理、优选 IP 列表（KV 持久化）、伪装页 |

## API Token 权限清单

exe 工具通过 Cloudflare REST API 部署，需要创建一个 **Account 级（账号作用域）API Token**。
本节把**作用域、创建入口、模板选择、权限项位置**全部写明，照着做即可。

### 一、作用域：必须选 Account（账号级）

创建 Token 时，控制台会让你选 **作用域（Scope）**，这一步最关键，**选错后面全找不到权限**：

| 作用域 | 能管什么 | 能不能用本工具 |
| --- | --- | --- |
| **Account（账号级）** ✅ | 整个 Cloudflare 账号：所有域名、Workers、Pages、KV、DNS…… | **能**。本工具调的是账号级 API（`/accounts/...`），必须用 Account 级 |
| **Zone（域名级）** ❌ | 只能管某一个已接入的域名（DNS、WAF、SSL 等） | **不能**。Zone 级 Token 看不到 Account Settings / Workers / Pages 这些账号级权限，用它会报「权限不足」 |

**结论：作用域选 `Account`，不是 `Zone`。** 选 Zone 的话，下面表格里的 Account Settings、Workers、Pages 这些权限项根本不会出现，工具会一直报权限错误。

### 二、创建入口（控制台路径）

两条路，任选其一：

1. **直达链接**：https://dash.cloudflare.com/profile/api-tokens
2. **菜单路径**：Cloudflare 控制台 → 右上角**头像** → **Profile & Preferences** → 左侧 **API Tokens**

进入后点 **Create Token**，进入创建向导。

### 三、模板选择：推荐用官方模板，最省事

创建向导里会让你选权限来源，有三种，推荐第一种：

**方式 A：用官方模板（推荐，一键勾好，不用自己找权限项）**

创建向导里选 **Use template**，然后挑：

| 模板名 | 包含的权限 | 适合 |
| --- | --- | --- |
| **Edit Cloudflare Workers** | Account Settings: Read + Workers: Admin（含 KV、脚本创建/编辑/部署） | **Workers 模式**，勾这个就够，无需再改 |
| **Edit Cloudflare Pages** | Account Settings: Read + Pages: Edit | **Pages 模式**，勾这个就够 |
| **Edit Cloudflare Workers + Pages**（若存在） | 两者合并 | 想两种模式都能用 |

> 如果向导里没有「Edit Cloudflare Pages」模板，或想一次覆盖两种模式，用下面的**自定义 Token**，勾选「推荐四项」即可。

**方式 B：自定义 Token（Create Custom Token）**

向导里选 **Create Custom Token → Get started**，然后**按作用域 Account** 勾选权限。
每个权限项在权限编辑器里的位置（左侧分类 → 权限项）：

| 权限项（控制台显示名） | 级别 | 分类位置 | 用途 |
| --- | --- | --- | --- |
| **Account Settings** | Read | Account（无子分类，直接列） | 读账号列表，工具自动选账号 |
| **Workers KV Storage** | Edit | Developer Platform | 创建 KV 命名空间 |
| **Workers** | Admin | Developer Platform | Workers 模式：建脚本、传代码、部署 |
| **Pages** | Edit | Developer Platform | Pages 模式：建项目、写配置、传资源、建部署 |

勾选位置示意（自定义 Token 的权限编辑器）：
```
[Account Settings]        → Read      ✅  ← 直接勾选，无分类
[Developer Platform] ▾
   ├─ [Workers KV Storage] → Edit   ✅  ← 勾这个
   ├─ [Workers]            → Admin  ✅  ← 勾这个（Workers 模式）
   └─ [Pages]              → Edit   ✅  ← 勾这个（Pages 模式）
```

**推荐四项全勾**（Account Settings: Read + Workers KV Storage: Edit + Workers: Admin + Pages: Edit），Workers 和 Pages 两种模式都能用，不会出现某个 API 没权限。

### 四、可选权限（不勾不影响部署）

| 权限项 | 级别 | 用途 |
| --- | --- | --- |
| **Account API Tokens** | Read | 只用于查看 Token 有效期，工具不读 |
| **Account Analytics** | Read | 只用于面板显示用量/额度，工具不读 |

### 五、明确不需要的权限

- **DNS** —— 工具不碰自定义域名的 DNS 记录，Workers 模式的自定义域名请在控制台手动绑定
- **Workers Routes** —— 工具用脚本内容上传 + 自动部署，不走 Routes
- **Cloudflare Access / WAF / Load Balancing 等** —— 完全无关

### 六、工具调用的 API 与对应权限

| 工具操作 | 调用的 API | 所需权限 |
| --- | --- | --- |
| 自动选账号 | `GET /accounts` | Account Settings: Read |
| 建 KV 命名空间 | `POST /accounts/{id}/kv/namespaces` | Workers KV Storage: Edit |
| Workers 部署 | `PUT /accounts/{id}/workers/scripts/{name}/content`（代码+绑定+变量一次） | Workers: Admin（或 Workers Script: Create+Edit） |
| Pages 建项目 | `POST /accounts/{id}/pages/projects` | Pages: Edit |
| Pages 写配置（A/KV/兼容日期） | `PATCH /accounts/{id}/pages/projects/{name}` | Pages: Edit |
| Pages 传占位资源 | `GET upload-token` / `POST /pages/assets/check-missing|upload|upsert-hashes` | Pages: Edit |
| Pages 建部署 | `POST /accounts/{id}/pages/projects/{name}/deployments` | Pages: Edit |
| 部署后校验面板 | 直接 GET `https://<地址>/<密码>`（普通 HTTP，无需 Token） | 无需权限 |

### 七、完整创建步骤（照着抄）

1. 打开 https://dash.cloudflare.com/profile/api-tokens
2. 点 **Create Token**
3. **作用域选 `Account`**（关键，别选 Zone）
4. 选权限来源：
   - 省事：选模板 **Edit Cloudflare Workers**（Workers 模式）或 **Edit Cloudflare Pages**（Pages 模式）
   - 或自定义：勾「推荐四项」（见上表）
5. 输入 Token 名称（如 `CFOne 部署`），点 **Continue to summary** → **Create Token**
6. **立即复制 Token** —— 只显示一次，云端无法再读
7. 在 exe 里粘贴：`CFOne.exe --mode workers --token <TOKEN>`

> 提示：Token 是账号级凭据，等同于账号访问权。别公开、别截图、别写进代码仓库。怀疑泄露就删掉重建。

## 快速部署

### 方式〇：exe 工具（最省事，推荐）

双击 `CFOne.exe` 或在终端运行，全程中文交互，不用记任何命令。

```bash
# 直接运行，出现菜单
dist\CFOne.exe

# 或非交互一键部署
dist\CFOne.exe --mode workers --token <CF_API_TOKEN>
dist\CFOne.exe --mode pages   --token <CF_API_TOKEN> --password <面板密码>

# 其它命令
dist\CFOne.exe --check                       # 校验内置产物
dist\CFOne.exe --verify <URL> --password <PW> # 校验面板是否可用
dist\CFOne.exe --help
```

菜单功能：部署到 Workers / 部署到 Pages / 生成随机密码 / 校验产物 / 校验已部署面板。

**exe 自带能力**（无需仓库其它文件）：
- 内嵌脱敏后的 Worker 源码（单请求上传：代码 + KV 绑定 + 面板密码变量 + 兼容日期一次完成）
- Pages 完整流程：建项目 → 写变量/KV/兼容日期 → 传占位资源（构建期算好 blake3 哈希）→ 建部署
- 部署后自动校验面板可达性（访问 `/<密码>` 检查是否返回面板而非伪装页）
- Token 权限不足 / 网络不通时给出明确排查提示，退出码可用于脚本判断

**从源码构建 exe**：

```bash
node scripts/build.mjs      # 先产出 dist/CFOne-worker.js
node scripts/make-exe.mjs   # 产出 dist/CFOne.exe（约 36 MiB）
```

> 打包用 `pkg`（首次运行会下载 Node 运行时，需能访问 GitHub）。产物通过 GitHub Release 分发，不入库。

**exe 菜单截图式流程**：

```
  1. 部署到 Workers（推荐：单请求上传，最稳定）
  2. 部署到 Pages（*.pages.dev 可直接测试）
  3. 生成随机面板密码
  4. 校验内置部署产物
  5. 校验已部署的面板
  0. 退出

  请选择 [1]:
  Cloudflare API Token: 
  面板密码（留空自动生成）: 

  [OK] KV: xxxxxxxxxxxx
  [OK] Worker 已部署: cfone-xxxxxx
  [OK] 面板可用，变量 A 已生效

  ================= 部署完成 =================
  面板地址:  https://xxx.workers.dev/<密码>
  面板密码:  <密码>
```

### 方式一：一键脚本（推荐）

```bash
# 1. 构建产物
node scripts/build.mjs

# 2. 一键部署（Worker 模式）
node scripts/deploy.mjs --token <CF_API_TOKEN> --account <ACCOUNT_ID> --mode worker

# 或 Pages 模式（无需自定义域名）
node scripts/deploy.mjs --token <CF_API_TOKEN> --account <ACCOUNT_ID> --mode pages
```

脚本自动完成：创建 KV → 部署 → 绑定变量 → 打印面板地址与密码。

### 方式二：控制台手动部署

**必填变量**：`A`（面板密码，建议长随机值）

**可选变量**：

| 变量 | 说明 |
| --- | --- |
| `U` | 自定义节点 UUID（留空由 `A` 派生） |
| `D` / `WS_PATH` | WS 隧道路径，默认 `/cfone-ws` |
| `ET` | `yes` 启用 Trojan/WS |
| `TROJAN_PASSWORD` | Trojan 密码，留空用节点 UUID |
| `P` / `PROXYIP` | 全局 ProxyIP（`host` 或 `host:port`） |
| `S` | 出站代理：`socks5://host:port` / `http://host:port` / `https://host:port` |
| `QJ` | 出站方式：空=竞速 / `no`=直连优先 / `only`=只走代理 |
| `YX` | 手填优选列表：`IP:port#备注`，逗号/换行分隔 |
| `YXURL` | 在线优选列表 URL（逗号分隔多个） |
| `MASK_HTML` | 伪装页内联 HTML；`off`/`0` 关闭伪装 |
| `MASK_URL` | 伪装页取回地址 |
| `OUTBOUND_PORTS` | 目标端口白名单，默认 13 个 CF 标准端口 |

**KV 绑定**：创建 KV 命名空间，绑定名为 `K`（面板配置持久化；不绑则仅内存生效）。

**Worker 部署**：新建 Worker → 粘贴 `dist/CFOne-worker.js` 全部内容 → 设置变量 `A` → 绑定 KV `K` → 部署。
**Pages 部署**：新建 Pages → 上传 `dist/CFOne-pages.zip` → 设置变量 `A` → 绑定 KV `K` → 部署。

**推荐**：在 Workers/Pages 的「运行时设置」中将**兼容性日期**设为 `2026-01-20`。

## 使用

1. 浏览器打开 `https://<部署地址>/<A的值>`，输入面板密码登录
2. 在「优选节点」页填写优选 IP（或留空用内置池）
3. 在「设置」页配置 UUID、WS 路径、Trojan、出站等
4. 在「概览」页复制订阅地址，导入客户端

### Path 级覆盖（单节点）

在 VLESS/Trojan 分享链接的 `path` 查询参数中可覆盖全局配置：

```
/?ed=2048&pyip=1.2.3.4
/?ed=2048&pyip=proxy.example.com:443
/?ed=2048&s=socks5://user:pass@host:1080
/?ed=2048&qj=only
```

优先级：path 参数 > KV 配置 > 环境变量 > 默认值。

## 安全说明

- **面板密码 `A` 即访问凭证**：持有者可查看订阅、修改配置。请使用长随机值，不要公开。
- **订阅令牌与面板密码分离**：订阅地址 `/s/<token>` 的 token 是 `HMAC(A, "sub")` 派生，与面板路径 `/<A>` 不同，泄露订阅地址不会暴露面板。
- **SSRF 防护**：出站目标经过校验，拒绝内网、回环、链路本地、保留段地址。
- **构建脱敏**：产物中中文、品牌名零明文残留，字符串经 base64 解码表运行时还原。
- **会话**：登录后下发 HttpOnly + SameSite=Strict Cookie，服务端内存记录 nonce，常量时间比较校验。

## 构建与测试

```bash
node scripts/build.mjs        # 构建 dist/
node scripts/smoke-test.mjs   # 冒烟测试（17 项）
```

## 目录结构

```
CFOne/
├── src/worker.js            # 源码（可读，__SFX 标记待脱敏字符串）
├── tool/
│   ├── main.js              # exe 入口（交互菜单 + Cloudflare API 部署）
│   └── package.json         # pkg 打包配置
├── scripts/
│   ├── build.mjs            # 脱敏构建 → dist/
│   ├── make-exe.mjs         # 打包 dist/CFOne.exe
│   ├── deploy.mjs           # Node 版一键部署
│   └── smoke-test.mjs       # 冒烟测试（17 项）
└── dist/
    ├── CFOne-worker.js      # Workers 粘贴 / Pages 根文件
    ├── _worker.js           # Pages Advanced Mode 根文件
    ├── CFOne-pages.zip      # Pages 上传包
    └── CFOne.exe            # 一键部署工具（本地构建，不入库，经 Release 分发）
```

## 致谢

融合自以下上游项目的设计：
- [xmwengxing/CFPilot](https://github.com/xmwengxing/CFPilot) — 双项目拆分、真连接优选、PBKDF2 鉴权、静态脱敏
- [shitouxiaoge-commits/CFAPEX](https://github.com/shitouxiaoge-commits/CFAPEX) — 单文件双形态、KV 读量优化、运行时解码表
- [byjoey/cfnew](https://github.com/byjoey/cfnew) — UA 自动识别多格式订阅、出站代理三选一、API 管理
- [yonggekkk/Cloudflare-vless-trojan](https://github.com/yonggekkk/Cloudflare-vless-trojan) — Path 级 proxyip 覆盖、13 端口优选池

## License

AGPL-3.0
