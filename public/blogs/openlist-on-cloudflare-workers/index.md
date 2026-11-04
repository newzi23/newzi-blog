---
title: 把 OpenList 跑在 Cloudflare Workers 上：一次真实的部署与运维记录
date: 2026-11-04T22:08
tags:
  - OpenList
  - Cloudflare Workers
  - Serverless
  - 自建网盘
category: 自建服务
summary: 把 OpenList 部署到 Cloudflare Workers 的完整记录：为什么选它、架构长什么样、没有 Git 构建连接时怎么手工部署、KV 绑定和 JWT_SECRET 上的坑、免费额度的真实约束，以及一套能落地的巡检与备份办法。
cover: /blogs/openlist-on-cloudflare-workers/cover.webp
hidden: false
---

## 先说结论

我现在有一个跑在 Cloudflare Workers 上的文件列表站：<https://newzi.dpdns.org>。

它把几个网盘聚合在同一个界面里浏览，**没有服务器、没有月费**，全部跑在 Cloudflare 的免费额度内。前端是 OpenList 的 Web 界面，后端是一个 Worker，数据存在 KV 里。

这套东西搭起来不难，但**坑都在细节里**——尤其是 Cloudflare Workers 的绑定、密钥和免费额度这三块。这篇文章把我实际踩到的都记下来，包括那些"照文档做会翻车"的地方。

## OpenList 是什么，为什么要放 Workers

OpenList 是一个开源的文件列表程序（可以理解成 AList 的社区延续版本），核心能力是：把各种存储驱动（网盘、对象存储、本地目录……）挂载成统一的目录树，然后提供一个网页界面来浏览、预览、下载，还能对外提供 WebDAV。

传统的部署方式是跑在一台 VPS 或者 Docker 里。我不想为它单独养一台机器——纯粹为了看文件列表，一台常年在线的 VPS 不划算，还要自己管系统更新、证书、备份。

Cloudflare Workers 就合适得多：

- **没有服务器要维护**，只有代码和配置
- 自带 HTTPS 和全球边缘节点
- 免费额度对个人使用绰绰有余
- 可以直接绑自己的域名

代价是它**不是为这种应用设计的**：Workers 是无状态、短生命周期的边缘函数，CPU 时间有限，持久化只能靠 KV / D1 / R2 这类托管存储。OpenList 的 Worker 版本就是在这些约束下做的适配。

## 整体架构

```
浏览器
   │  https://newzi.dpdns.org
   ▼
Cloudflare Worker  ← Custom Domain（不是 *.workers.dev）
   │  ├── 静态前端资源（构建时打包进来）
   │  ├── API 路由 /api/*
   │  └── WebDAV /dav/
   ▼
Cloudflare KV
   └── 一个键存整库配置 + 若干键存目录树缓存
   │
   ▼
各个网盘（通过各自的驱动访问）
```

几个要点：

- **域名用的是 Custom Domain**，`*.workers.dev` 那个默认域名我关掉了。Custom Domain 由 Cloudflare 托管证书，比自己配 DNS + 源站省事。
- **存储层是 KV，而且是"整库一个 JSON"的形态**（`DB_FORMAT=map`）。也就是说不像传统数据库那样按表读写，而是整个配置读出来、改完再整体写回。这个设计对免费额度的影响很大，后面细说。
- **前端产物是构建时打进 Worker 的**，不是从 CDN 拉的独立静态站。所以改前端要重新构建、重新部署。

## 部署：没有 Git 构建连接，只能手工三步

Cloudflare 是支持从 Git 仓库自动构建部署的，但我这个 Worker 没有接。原因很简单——**这个项目的前端构建产物需要从 npm 取包，而构建过程对网络很敏感**，放在 Cloudflare 的构建环境里不好控制。干脆本地构建、手工推。

实际跑通的流程是三步：

```bash
# ① 取最新代码
cd repo && git pull

# ② 本地构建（前端产物必须走代理，否则慢到不可用）
export HOME=$PWD/../home XDG_CONFIG_HOME=$PWD/../home/.config
export http_proxy=http://127.0.0.1:7890 https_proxy=http://127.0.0.1:7890
npm run build

# ③ 部署
export CLOUDFLARE_API_TOKEN=$(...)   # 从本地凭证文件取
export CLOUDFLARE_ACCOUNT_ID=<你的账号 id>
../node_modules/.bin/wrangler deploy
```

### 包管理器上的坑

这个项目的依赖装起来相当麻烦，我最后是用 npm 而不是 pnpm：

- **pnpm 12 直接装不了**：它会往一个只读路径写 package-manager 的 engine store，报 `ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK`，显式指定 `--store-dir` / `--state-dir` 也没用。
- **npm 12 需要一串参数**才装得干净：
  - `--allow-git=all`——不然依赖里那个 `github:` 协议的包直接报 `EALLOWGIT`；
  - `--force`——不然某些平台特有的可选依赖报 `EBADPLATFORM`；
  - `--registry=https://registry.npmmirror.com`——直连 npm 源会 `ECONNRESET`；
  - npm 12 默认会拦掉依赖的 install 脚本，实测**拦掉也不影响构建**（因为需要的平台二进制包已经作为普通依赖装上了）。

```bash
npm install --legacy-peer-deps --allow-git=all --force \
  --registry=https://registry.npmmirror.com --fetch-retries=6
```

## 配置：四个必须写对的地方

Worker 的配置在 `wrangler.jsonc` 里。有四处**错一个就出问题**，而且症状都不直观。

### 1. KV 绑定的名字必须恰好是 `KV`

不是 `OPENLIST_KV`、不是 `MY_KV`，就是 `KV`。名字不匹配，Worker 里拿到的绑定是 undefined，程序会**静默退回内存存储**——站点看起来能用，但一重启数据全没。

### 2. KV 命名空间 id 要写死在配置里

上游仓库里 `kv_namespaces` 这一段**默认是注释掉的**，但同文件的注释、README 和部署脚本都写着"KV 由 wrangler 自动预配"。这三处互相矛盾，照默认配置部署的结果就是：没有持久化绑定，自动退到 `memory`。

我在 fork 里把这段显式打开，并且**把命名空间 id 写死**：

```jsonc
{
  "name": "openlist-worker-<你的名字>",
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "<你的 KV 命名空间 id>"
    }
  ],
  "vars": {
    "DB_DRIVER": "kv",
    "DB_FORMAT": "map"
  }
}
```

### 3. 部署前必须核对 `name`

这点吃过一次亏：有一次上游 PR 的描述里提到要改 Worker 名，但补丁漏改了配置文件。如果当时直接部署，wrangler 会**新建一个名字不同的 Worker**，而线上那个毫无变化——你会对着一堆"部署成功"的日志纳闷为什么站点没更新。

所以部署前一定先看一眼：

```bash
grep '"name"' wrangler.jsonc
```

### 4. `DB_CIPHER` 和 `JWT_SECRET` 的顺序是单向的

这是我认为**最值得单独拎出来讲**的一条：

配置里的字段加密密钥是从 `JWT_SECRET` **派生**出来的（HKDF）。

- 当前 `DB_CIPHER=none`，也就是配置不加密，此时改 `JWT_SECRET` 只会让现有登录会话失效，代价很小。
- **一旦开了加密**（比如 `DB_CIPHER=aes-256-gcm`），`JWT_SECRET` 就**永久锁定**了——改掉它，已加密的配置就再也解不开。

所以顺序必须是：**先把 `JWT_SECRET` 定下来并且妥善保存，再考虑开加密**。反过来做，等于给自己埋一颗定时炸弹。

### wrangler 部署时到底覆盖什么（实测）

这条也是实测出来的，和直觉不太一样：

| 项目 | 部署时是否被覆盖 |
| --- | --- |
| 普通绑定（KV 等） | 以配置文件为准 |
| `vars`（环境变量） | 以配置文件为准 |
| `secret_text`（密钥） | **保留**，不会被配置文件清掉 |

结论：**绑定和变量必须写进 `wrangler.jsonc`**，不要指望在 Dashboard 上手点；而密钥可以放心地留在 Dashboard / `wrangler secret` 里，部署不会弄丢它。

## 免费额度的真实约束

Cloudflare 免费版看起来额度很大，但**真正卡脖子的是 KV 的写次数，不是请求数**。

| 资源 | 免费额度 |
| --- | --- |
| Workers 请求 | 10 万次/日 |
| Workers CPU | 10 ms/请求 |
| Worker 请求体 | 100 MB |
| Workers 子请求 | 50 次/请求 |
| KV 读 | 10 万次/日 |
| **KV 写** | **1000 次/日** |
| **KV 同 key 写** | **1 次/秒** |
| KV 单值大小 / 总量 | 25 MiB / 1 GB |

为什么会撞到写次数的墙？因为这个应用是这么写数据的：

- **整库配置**是"读出来 → 改 → 整体写回"，改任何一处设置都是一次写；
- **目录树缓存**每浏览一个新目录就写一个键。

### 一个实测发现：缓存只增不减

我专门抽样看过 KV 里的缓存条目结构：

```json
{ "v": "...", "ts": 1730000000000, "exp": 1730001800000 }
```

`ts` 和 `exp` 都是 epoch 毫秒，差值正好 `1,800,000 ms`，也就是 **30 分钟**——对应配置里 `cache_expiration: 30`。

关键在于：**程序自己按 30 分钟判断逻辑过期，但写进 KV 时没有设置 TTL**。我抽查到的条目已经"过期" 123 分钟，物理上仍然躺在 KV 里。

后果就是：**键数和存储占用只增不减**，每个缓存键大约 0.9 KB；每浏览一个新目录新增一次写，重新浏览一个已过期的目录又写一次——这些写操作还要和"整库配置写回"共享每天 1000 次预算。

对一个私人站点来说这个量级完全够用，但如果你打算公开分享给一堆人用，这条一定要先想清楚。

## 运维：能落地的四件事

跑了几天之后我把运维收敛成了四件固定动作。

### 1. 健康检查（两层）

```bash
B=https://newzi.dpdns.org
curl -sS $B/api/health             # {"ok":true,...,"version":"v4.2.3"}
curl -sS $B/api/public/env_check   # resolved_driver=kv, storage.memory=false, ready=true
```

第二个接口特别有用——它会告诉你**实际生效的存储驱动是什么**。如果 `storage.memory=true`，说明 KV 绑定没生效，正在用内存存数据（也就是重启即丢）。这正是前面"绑定名必须是 `KV`"那个坑的探针。

我还会多做一层**静态资源实测**，因为"API 活着"不等于"页面能打开"：抓首页 HTML，把里面引用的主 JS/CSS 和 `manifest.json` 逐个请求一遍，都 200 才算通过。这个办法抓到过"接口正常但前端资源挂掉"的情况。

### 2. 漂移检查：git 里写的 == 线上跑的

把 `wrangler.jsonc` 解析出来（它是 JSONC，得先去注释再 parse），取出 `name`、`kv_namespaces`、`vars`，和 Cloudflare API 返回的线上绑定逐项对比。

这一步是防"我以为我改了，其实线上没变"——比如前面那个 `name` 不一致的问题，漂移检查会直接指出来。

### 3. 备份，并且**验证备份可恢复**

KV 里的整库配置包含所有网盘凭据，所以备份本身**等同于密钥文件**，我把它放在一个明确不属于任何 git 仓库的目录里，权限 700/600。

更重要的是：备份完必须做一次**可恢复性断言**，不然你不知道这个备份是不是废的。我的检查项：

1. 顶层结构（settings / storages / users / metas / shares / plugins）齐全；
2. `settings` 非空，且包含 `robots_txt`、`allow_indexed` 这些关键字段；
3. `storages` 数量与挂载点数量一致；
4. 每个存储都有 `driver`，且 `addition`（凭据容器）非空；
5. 管理员用户有密码哈希；
6. guest 用户记录存在；
7. 密钥文件是 64 位十六进制。

七项全过，才能说"这份配置可以原样写回 KV 完成恢复"。

### 4. 回滚锚点要提前核验

Cloudflare 会给每次部署保留版本。**在真的需要回滚之前**，我会先去版本列表（Dashboard → Worker → Deployments，或 `wrangler versions list`）确认旧版本仍然可取用——不然出事的时候才发现版本已经被清了，那才叫绝望。

配置回滚则是 `git revert` 之后重新部署。**部署不会清空 KV**：绑定改错了只是"看不到数据"，改回来就恢复了——这也是为什么改动前先备份。

## 几个还没解决的问题

诚实记录一下，这些坑我目前是"知道但先不动"：

- **`robots_txt` 和 `allow_indexed` 在这个 TS 版本里没实现**。它们在配置结构里存在，但既没有 `/robots.txt` 路由也没有对应中间件。实测访问 `/robots.txt` 返回的是 SPA 兜底页面。想禁止搜索引擎收录，目前只能靠后台注入 `<meta name="robots" content="noindex,nofollow">`，或者用 Cloudflare 的 Transform Rule。
- **百度网盘挂载开了 `web_proxy=true`**，意味着它的下载和上传流量全部穿过 Worker，会同时消耗请求数、CPU 时间和流量。这是功能与额度之间的取舍。
- **缓存键没有 KV 级 TTL**，所以清理只能手工做——理论上可以定期删掉已经逻辑过期的 `*_cache_*` 键，属于低频写操作，风险很低，但需要单独决定要不要自动化。
- **额度只能看 Dashboard**。Cloudflare 的额度查询接口是 GraphQL，也就是要 POST，而我这边对"向远程主机 POST"有静态拦截，所以这个数字没法自动采集，只能人工看 Workers & Pages → Metrics。

## 小结

如果你也想用 Cloudflare Workers 跑 OpenList，我建议按这个顺序检查：

1. `wrangler.jsonc` 里 **KV 绑定名是 `KV`、id 写死、`name` 和线上一致**；
2. `DB_DRIVER=kv`，部署后用 `/api/public/env_check` 确认 `storage.memory=false`；
3. **先定 `JWT_SECRET` 再谈 `DB_CIPHER`**，而且把 `JWT_SECRET` 备份好；
4. 心里有数：**瓶颈是每天 1000 次 KV 写**，缓存键没有 TTL、只增不减；
5. 把"漂移检查 + 备份可恢复性断言 + 回滚锚点核验"变成固定动作。

前三条错一条站点就会以某种"看起来正常但会丢数据"的方式坏掉，后两条决定你能不能用得长久。这套东西真正的成本不在搭建，而在**知道它在什么条件下会悄悄坏掉**。
