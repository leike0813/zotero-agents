## Why

项目目前没有任何面向最终用户的使用手册。现有 `doc/` 目录的文档面向开发者/Agent（SSOT、架构决策、组件设计），不适合直接给插件用户阅读。用户需要一份清晰的使用指南来完成安装、配置和日常操作。

## What Changes

- 新增 `site/` 目录，存放 VitePress 源码，与 `doc/` 完全隔离
- 初始内容：安装指南（Installation）和快速开始（Getting Started），支持 en / zh-CN 双语言
- 新增 CI 部署工作流，构建产物同时发布到 GitHub Pages 和 Gitee Pages
- 插件内通过 `Zotero.locale` 分流：中文用户走 Gitee，其他走 GitHub
- `package.json` 新增 3 个 npm scripts（docs:dev / docs:build / docs:preview）

## Capabilities

### New Capabilities
- `user-docs-site`: 面向最终用户的在线使用手册站点，基于 VitePress 构建，支持 en / zh-CN 双语言，双平台部署

### Modified Capabilities

无。不涉及 spec 级别的行为变更。

## Impact

- 新增 `devDependencies`：`vitepress`
- 新增 CI workflow：`.github/workflows/deploy-user-docs.yml`
- 新增 `src/utils/docsUrl.ts`：Locale 分流工具函数（当前无消费方，供后续 UI 链接使用）
- `doc/` 目录不受影响，继续作为开发者/Agent 文档
