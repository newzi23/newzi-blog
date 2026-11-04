#!/usr/bin/env node
/**
 * 把 public/blogs/<slug>/index.md 里的 YAML frontmatter 同步成两个 JSON：
 *   - public/blogs/<slug>/config.json   单篇元数据（文章页头部、侧栏用它）
 *   - public/blogs/index.json           总索引（/blog 列表页、首页「近期文章」卡片用它）
 *
 * 为什么要这样：这个博客原本靠网页编辑器维护上面两个 JSON，而 Obsidian 打不开 JSON 笔记。
 * 所以约定「index.md 的 frontmatter 是唯一数据源」，本脚本在每次 build / dev 前自动重新生成 JSON。
 * index.md 里的 frontmatter 会**保留**（Obsidian 的属性面板要用），阅读端渲染前会剥掉它。
 *
 * 用法：node scripts/blog-sync.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const BLOGS_DIR = path.join(ROOT, 'public', 'blogs')
const INDEX_FILE = path.join(BLOGS_DIR, 'index.json')

const LIST_KEYS = new Set(['tags'])

/** 去掉值两侧的引号 */
function unquote(v) {
  const s = v.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

/** 解析 `[a, b]` 形式的内联数组 */
function parseInlineArray(v) {
  const inner = v.trim().slice(1, -1)
  if (!inner.trim()) return []
  return inner.split(',').map(x => unquote(x)).filter(Boolean)
}

/**
 * 只解析我们需要的 YAML 子集：标量、block 列表、内联数组。
 * 不引入 js-yaml 依赖，避免多一个维护面。
 */
function parseFrontmatter(text) {
  const m = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/)
  if (!m) return null

  const data = {}
  let currentListKey = null

  for (const rawLine of m[1].split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue

    const listItem = rawLine.match(/^\s*-\s+(.*)$/)
    if (listItem && currentListKey) {
      data[currentListKey].push(unquote(listItem[1]))
      continue
    }

    const kv = rawLine.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue

    const key = kv[1]
    const value = kv[2]

    if (!value.trim()) {
      // 后面可能跟 block 列表
      data[key] = []
      currentListKey = key
      continue
    }

    currentListKey = null
    if (LIST_KEYS.has(key)) {
      data[key] = value.trim().startsWith('[') ? parseInlineArray(value) : [unquote(value)]
    } else if (value.trim() === 'true') {
      data[key] = true
    } else if (value.trim() === 'false') {
      data[key] = false
    } else {
      data[key] = unquote(value)
    }
  }

  return { data, body: text.slice(m[0].length) }
}

function main() {
  if (!fs.existsSync(BLOGS_DIR)) {
    console.log('[blog-sync] 没有 public/blogs，跳过')
    return
  }

  const slugs = fs
    .readdirSync(BLOGS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()

  const index = []
  let written = 0

  for (const slug of slugs) {
    const postDir = path.join(BLOGS_DIR, slug)
    const mdFile = path.join(postDir, 'index.md')
    const cfgFile = path.join(postDir, 'config.json')
    if (!fs.existsSync(mdFile)) continue

    const text = fs.readFileSync(mdFile, 'utf8')
    const parsed = parseFrontmatter(text)
    let config = {}

    if (fs.existsSync(cfgFile)) {
      try {
        config = JSON.parse(fs.readFileSync(cfgFile, 'utf8'))
      } catch {
        config = {}
      }
    }

    if (parsed) {
      const { data } = parsed
      // frontmatter 覆盖 config.json；未写的字段沿用 config.json
      for (const [k, v] of Object.entries(data)) {
        config[k] = v
      }
    }

    if (!config.title) {
      console.warn(`[blog-sync] 跳过 ${slug}：没有 title（请在 index.md 的 frontmatter 或 config.json 里补）`)
      continue
    }
    if (!config.date) {
      console.warn(`[blog-sync] 提示 ${slug}：没有 date，列表排序会靠后`)
    }

    const nextCfg = JSON.stringify(config, null, 2) + '\n'
    const prevCfg = fs.existsSync(cfgFile) ? fs.readFileSync(cfgFile, 'utf8') : null
    if (prevCfg !== nextCfg) {
      fs.writeFileSync(cfgFile, nextCfg)
      written++
      console.log(`[blog-sync] 更新 ${slug}/config.json`)
    }

    index.push({
      slug,
      title: config.title,
      tags: config.tags || [],
      date: config.date || '',
      summary: config.summary,
      cover: config.cover,
      hidden: config.hidden || false,
      category: config.category || ''
    })
  }

  index.sort((a, b) => String(b.date).localeCompare(String(a.date)))
  const nextIndex = JSON.stringify(index, null, 2) + '\n'
  const prevIndex = fs.existsSync(INDEX_FILE) ? fs.readFileSync(INDEX_FILE, 'utf8') : null
  if (prevIndex !== nextIndex) {
    fs.writeFileSync(INDEX_FILE, nextIndex)
    console.log(`[blog-sync] 更新 index.json（${index.length} 篇）`)
  }

  console.log(`[blog-sync] 完成：${index.length} 篇文章，${written} 个 config.json 有变更`)
}

main()
