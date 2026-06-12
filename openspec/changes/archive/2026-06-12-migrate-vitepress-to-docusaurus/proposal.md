## Why

当前用户文档站点基于 VitePress 1.6.4 构建，存在一个实际限制：启用 `locales` 配置多语言时，侧边栏（`sidebar`）无法渲染。目前的单语言（仅 zh-CN）配置可以工作，但将来扩展英文版时需要重构配置结构，且不能保证 VitePress 后续版本会修复此问题。

Docusaurus 的 i18n 是一等公民，多语言 + 侧边栏开箱即用，可以彻底解决这个问题。

## What Changes

- **移除 VitePress**：删除 `site/.vitepress/` 目录、`vitepress` devDependency、`docs:dev/build/preview` 三个 npm scripts
- **新增 Docusaurus**：在 `site/` 目录初始化 Docusaurus，配置内置 i18n（zh-CN + en）
- **内容迁移**：将现有的 17 篇中文 Markdown 页面从 VitePress 格式迁移到 Docusaurus 格式
- **CI/CD 更新**：修改 `deploy-user-docs.yml`，构建命令从 `vitepress build site` 改为 `docusaurus build`
- **插件侧无变更**：`docsUrl.ts` 的 URL 路由逻辑不受影响，URL 结构保持不变

## Capabilities

### New Capabilities
- `docusaurus-site`: Docusaurus 站点骨架，包含 i18n 配置、主题定制、侧边栏、导航栏、插件配置
- `site-deployment`: 双平台（GitHub Pages + Gitee Pages）部署流水线
- `content-migration`: 现有的 17 篇中文文档从 VitePress 格式迁移到 Docusaurus 格式

### Modified Capabilities

无。不涉及 spec 级别的行为变更。

## Impact

- **移除**：VitePress 相关配置和依赖（`vitepress` devDep、`site/.vitepress/`、npm docs scripts）
- **新增**：Docusaurus 相关配置和依赖（`@docusaurus/core`、`@docusaurus/preset-classic`、`sidebars.js`、`docusaurus.config.ts`）
- **修改**：`.github/workflows/deploy-user-docs.yml` 构建命令和产物路径
- **不变**：`src/utils/docsUrl.ts` URL 解析逻辑、17 篇文档的正文内容、URL 路径结构
