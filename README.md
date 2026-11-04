# newzi-blog

个人博客。代码来自 [YYsuni/2025-blog-public](https://github.com/YYsuni/2025-blog-public)（Next.js 方案），
内容与站点信息已改为本仓库自己的。

> 这里是**源码 + 内容**仓库。所有文章、图片、站点配置都在这个 Git 仓库里，没有数据库、没有后端服务。

## 架构

```
Next.js 16 (App Router) + React + TypeScript + Tailwind
        │
        │  pnpm build   → 静态化，文章本来就是静态文件
        ▼
     Vercel（当前采用的部署方式）
     也支持 Cloudflare Workers（opennextjs/cloudflare，见 wrangler.toml）
```

内容全部是**静态文件**，由浏览器在运行时 fetch：

| 路径 | 作用 |
| --- | --- |
| `public/blogs/<slug>/index.md` | 正文（Markdown，可带 YAML frontmatter） |
| `public/blogs/<slug>/config.json` | 单篇元数据（标题/标签/日期/摘要/封面/分类） |
| `public/blogs/<slug>/*.webp` | 该篇的图片，正文里用 `/blogs/<slug>/xxx.webp` 绝对路径引用 |
| `public/blogs/index.json` | 全部文章的索引（列表页、首页「最新文章」卡片用它） |
| `src/config/site-content.json` | 站点信息：标题、描述、用户名、主题色、社交按钮 |
| `src/config/card-styles.json` | 首页卡片的开关与位置 |

## 写作流程（Obsidian）

**核心约定：`index.md` 里的 YAML frontmatter 是文章元数据的唯一数据源。**
`config.json` 和 `index.json` 都由 `scripts/blog-sync.mjs` 自动生成，不用手写、不要手改。

### 一次性设置

1. 克隆本仓库到本地，例如 `~/blog`。
2. **Obsidian 打开 vault 时，选 `public/` 这个子目录，不要选仓库根目录。**
   原因：Obsidian 的「绝对路径」链接是相对 vault 根的，vault 开在 `public/` 时生成的链接正好是
   `/blogs/<slug>/x.png`，与站点要求的格式一致；开在仓库根目录会变成 `/public/blogs/...`，全站图片失效。
3. 文件与链接的三个关键设置**已经提交在 `public/.obsidian/app.json` 里**（Markdown 链接、
   绝对路径、附件放当前文件所在文件夹），打开 vault 就自动生效，不用手点。
   若发现图片链接变成了短链（`xxx.png` 而不是 `/blogs/...`），就是这三项被覆盖了，去设置里改回来。
4. 安装社区插件 **obsidian-git**（自动 commit + push），按需开启定时拉取/推送。
   （插件本体没法预先提交，需要在 Obsidian 的社区插件市场里装一次。）
5. （可选但推荐）在仓库里执行 `bash scripts/install-hooks.sh`，启用提交前自动同步。

### 写一篇新文章

1. 在 `public/blogs/` 下新建一个目录，目录名就是 URL 里的 slug，例如 `arch-niri-setup`。
2. 在里面新建 `index.md`，开头写 frontmatter：

```markdown
---
title: Arch + niri 桌面配置备忘
date: 2026-11-05T10:30
tags:
  - Arch Linux
  - niri
category: 折腾
summary: 一句话摘要，会显示在列表页和文章顶部。
cover: /blogs/arch-niri-setup/cover.webp
---

正文从这里开始……
```

3. 图片直接拖进 Obsidian，它会放到同目录并生成 `/blogs/<slug>/xxx.png` 形式的链接。
4. 写完提交推送即可。**不需要手动改任何 JSON** —— 构建时会自动跑同步。

### frontmatter 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题 |
| `date` | 建议 | `YYYY-MM-DD` 或 `YYYY-MM-DDTHH:mm`，列表按它倒序 |
| `tags` | | 标签数组 |
| `category` | | 分类（`site-content.json` 里 `enableCategories` 为 true 时启用） |
| `summary` | | 摘要 |
| `cover` | | 封面图路径，如 `/blogs/<slug>/cover.webp` |
| `hidden` | | `true` 则不在列表里显示（只有用 GitHub App 登录后的编辑者能看到） |

## 本地开发

```bash
pnpm install          # 用 pnpm，仓库锁文件是 pnpm-lock.yaml
pnpm dev              # 自动同步 frontmatter → JSON，然后起 dev server（端口 2025）
pnpm build            # 自动同步，然后生产构建
pnpm sync             # 只跑同步（一般不需要手动执行）
```

**沙箱/受限环境的坑**：如果 `pnpm install` 报
`ERR_PNPM_STORE_DIR_OPEN_OPERATION_LOCK` 或 `Read-only file system`，是因为 pnpm 的跨进程锁放在
`$XDG_RUNTIME_DIR` 下（默认 `/run/user/1000`），而该目录不可写。解决办法是指到可写目录：

```bash
export XDG_RUNTIME_DIR=/tmp/pnpm-run && mkdir -p "$XDG_RUNTIME_DIR"
```

## 部署（Vercel）

一键导入（以本仓库为源，登录后直接点 Deploy）：

<https://vercel.com/new/clone?repository-url=https://github.com/newzi23/newzi-blog>

手动步骤：

1. Vercel → Add New → Project → 导入本仓库。
2. Framework 会自动识别为 Next.js，**不需要改任何构建配置**，直接 Deploy。
3. **不需要设任何环境变量**：`sitemap.xml` 与 `rss.xml` 在 Vercel 生产环境会自动使用
   `https://murin.dpdns.org`。只有在你想换域名时才需要设 `SITE_URL`（预览部署仍会用 `VERCEL_URL`）。

每次 push 到 `main` 都会自动重新部署。

## 与上游的差异（重要）

本仓库从 `YYsuni/2025-blog-public` 导入后做了这些改动，将来若要参考上游需注意：

1. **移除了作者的全部内容与个人素材**：75 篇文章、`public/images/*`（美术图/头像/雪花等）、
   `public/music/*`、`public/live2d/*`、`src/app/live2d/`。
2. **站点信息改为本仓库的**（`src/config/site-content.json`、`src/app/about/list.json`）；
   `bloggers` / `projects` / `share` 三个列表清空为 `[]`。
3. **关闭了依赖 GitHub App 的功能**：`hideEditButton: true`，并关掉 `writeButtons` 卡片，
   导航里的「(开发中)」标签也去掉了。网页版编辑器需要创建 GitHub App 并把私钥填进浏览器，
   我们改用 Obsidian，所以不再需要。
4. **`src/config/card-styles.json`** 关掉了 `artCard` / `musicCard` / `writeButtons`（素材已删/不需要）。
5. **新增 frontmatter 支持**：`src/lib/markdown-renderer.ts` 里加了 `stripFrontmatter()`。
   渲染前剥掉 YAML frontmatter，这样 frontmatter 可以留在文件里给 Obsidian 用，又不会被当成正文。
6. **新增 `scripts/blog-sync.mjs`**：把 frontmatter 同步成 `config.json` 与 `index.json`，
   并接进 `dev` / `build` / `build:cf` 脚本，保证构建产物永远是最新的。
7. **`src/app/rss.xml/route.ts`** 的站点域名回退值改为 `https://murin.dpdns.org`。
8. 去掉了自定义光标（`layout.tsx` 里的 `cursor: url(/images/cursor.svg)`），该素材已删。

## 已知限制与坑

1. **网页版编辑器（`/write`）不支持表格**。它用 TipTap + StarterKit，没有表格扩展；
   **阅读侧**用的是 `marked`，表格、任务列表、KaTeX 数学（`$...$`）、Shiki 代码高亮都正常。
   所以：写表格请用 Obsidian / 文本编辑器，**不要用网页编辑器打开并保存含表格的文章**，否则表格会被破坏。
2. **frontmatter 不能删**：它是元数据来源。删了不会报错，但标题/日期会沿用旧的 `config.json`，
   容易困惑。
3. `config.json` 与 `index.json` 是**生成物**。直接改它们会在下次 `build`/`dev` 时被覆盖。
4. **空页面**：`我的项目`（`/projects`）、`推荐分享`（`/share`）、`优秀博客`（`/bloggers`）
   的列表已清空，现在是空状态。想填就编辑对应的 `list.json`。
5. **用生产构建预览时，往 `public/` 新增的文件要重新构建才会被服务。**
   Next.js 的静态文件清单是构建期生成的，`next start` 不会自动发现新文件——实测新加的图片会 404，
   重新 `pnpm build` 并重启后才变 200。线上不受影响（每次 push 都会重新构建）。
6. `public/blogs/index.json` 会被 `sitemap.ts` 和 `rss.xml/route.ts` 在**构建期直接 import**，
   所以这个文件必须存在，否则构建会失败（`Module not found: Can't resolve '@/../public/blogs/index.json'`）。
   `pnpm build` 会先跑同步脚本生成它；全新克隆后想手动构建，先跑一次 `pnpm sync`。

## 换域名 / 从 GitHub Pages 迁移

本站原来在 GitHub Pages（Hexo）上，`murin.dpdns.org` 的 DNS 记录指向 `newzi23.github.io`。
切到 Vercel 后，需要在 Cloudflare 把那条记录改成 Vercel 要求的记录（通常是 CNAME →
`cname.vercel-dns.com`，以 Vercel 项目 Domains 页面给出的值为准），然后在 Vercel 里绑定域名、
等待证书签发。
