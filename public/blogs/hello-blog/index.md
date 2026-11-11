---
title: 博客开张：Hexo + Butterfly + GitHub Pages
aliases:
  - 博客开张
  - Hexo + Butterfly + GitHub Pages
date: 2026-11-04T21:10
tags:
  - Hexo
  - Butterfly
  - GitHub Pages
category: 建站
summary: 记录这个博客的搭建方式：Hexo 生成静态站点，Butterfly 主题，源码放在 GitHub 的 hexo-blog 仓库，发布到 GitHub Pages。
cover: /blogs/hello-blog/cover.webp
hidden: false
---

> **注**：这篇写于本站的 Hexo 时期。博客后来已经整体迁移到 Next.js 方案，文中的 Hexo/Butterfly/GitHub Pages 流程已不再使用，仅作留档。

## 写在前面

这个博客搭起来了。技术栈是 **Hexo**（静态站点生成器）+ **Butterfly**（主题）+ **GitHub Pages**（托管）。

选这套方案的理由很简单：

- 全静态，没有数据库、没有服务器，不需要操心运维和安全补丁
- 源码就是一堆 Markdown 文件，全部在 Git 里，历史清晰、随时可回滚
- 零成本

## 它是怎么工作的

整个流程分三块：

1. **源码仓库** — [`newzi23/hexo-blog`](https://github.com/newzi23/hexo-blog)，存放 Markdown 文章、主题配置和 Hexo 工程本身
2. **构建** — Hexo 把 Markdown 渲染成 HTML，输出到 `public/`
3. **发布仓库** — 生成结果推送到 `newzi23/newzi23.github.io`，由 GitHub Pages 对外提供访问

所以日常写文章只需要三步：写 Markdown → 本地预览 → 生成并部署。

## 一个代码块，用来验证高亮

```bash
# 本地预览
npx hexo server

# 生成并部署
npx hexo clean && npx hexo generate && npx hexo deploy
```

```python
def greeting(name: str) -> str:
    """打个招呼"""
    return f"你好，{name}！"

print(greeting("世界"))
```

## 接下来

慢慢往里填内容。想到什么写什么，不追求体系完整。
