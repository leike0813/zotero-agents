## Context

项目是一个 Zotero 插件，使用 TypeScript/JavaScript 技术栈，托管在 GitHub（`leike0813/Zotero-Skills`）。现有 CI 使用 GitHub Actions，构建通过 `zotero-plugin-scaffold`。项目已有 4 个 git 工作流文件，以及一套成熟的测试基础设施。

文档现状：
- `doc/` 目录包含 55+ 文件，全为面向开发者/Agent 的设计文档（SSOT、架构决策、组件设计）
- 没有任何面向最终用户的使用手册
- 主要用户群体包含大量中文用户，需要同时覆盖 en 和 zh-CN

## Goals / Non-Goals

**Goals:**
- 建立 VitePress 构建的用户文档站点，源码在 `site/` 目录
- 初始交付 Installation + Getting Started（en + zh-CN）
- 双平台部署：GitHub Pages（海外）+ Gitee Pages（国内）
- 插件内 locale 自动分流：中文 → Gitee，其他 → GitHub
- 仅 `site/` 目录变更时触发部署，不影响主 CI

**Non-Goals:**
- 不迁移现有 `doc/` 内容到用户文档站点
- 不做自定义域名或 DNS 分流（暂无备案计划）
- 首期不在插件 UI 中添加文档链接（仅提供工具函数）
- 不引入额外的测试覆盖

## Decisions

### D1: 站点目录命名 `site/` 而非 `docs/`

- `docs/` 在 GitHub 生态中有特殊含义（GitHub Pages 默认源），且本项目已在根目录有 `.github/` 工作流
- `doc/` 已被内部设计文档占用
- `site/` 语义清晰，VitePress 支持任意目录名

### D2: Gitee 仓库策略 — 镜像 + API 触发

- 在 Gitee 上镜像 GitHub 仓库（Gitee 免费功能，自动同步）
- GitHub Actions 构建后，将 `site/.vitepress/dist` 推送到 Gitee 镜像仓库的 `gh-pages` 分支
- 通过 Gitee Pages API 触发重建
- 不选择独立 Pages 仓库（策略 A），因为 Gitee API 可以直接触发已配置 Pages 的镜像仓库重建

### D3: Locale 分流时机

- 在 `Zotero.locale` 可用时优先使用，否则回退到 `navigator.language`
- 判断标准：`locale.startsWith("zh")`
- 分流函数独立为 `src/utils/docsUrl.ts`，首期不接入 UI

### D4: Base path

- VitePress `base` 配置设为 `/Zotero-Skills/`
- 两个平台使用相同的 base path，确保构建产物一致

### D5: 依赖引入

- `vitepress` 作为 `devDependency` 引入
- 不与主构建工具链冲突（VitePress 底层使用 Vite，与项目现有的 esbuild 生态兼容）

## Risks / Trade-offs

- [Gitee 同步延迟] → GitHub Actions 主动推送构建产物到 Gitee 的 `gh-pages` 分支，而不是依赖 Gitee 自动镜像的定时同步。分钟级生效。
- [Gitee Pages API 稳定性] → 如果 API 调用失败，Gitee 镜像仓库的 `gh-pages` 分支已包含最新产物，手动在 Gitee Pages 控制台重新部署即可恢复。
- [Gitee Token 泄露] → Token 通过 GitHub Secrets 存储，权限仅限于 Gitee Pages 仓库的推送和 Pages API 调用。
