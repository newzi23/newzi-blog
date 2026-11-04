#!/bin/sh
# 启用仓库自带的 git hooks（提交前自动同步 frontmatter → JSON）
set -e
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true
echo "已启用：core.hooksPath=.githooks"
