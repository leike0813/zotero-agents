## 1. VitePress 框架

- [x] 1.1 创建 `site/.vitepress/config.ts` — i18n locales 配置（en / zh-CN），base path 设为 `/Zotero-Skills/`
- [x] 1.2 创建 `site/en/index.md` — 英文首页
- [x] 1.3 创建 `site/en/installation.md` — 英文安装指南
- [x] 1.4 创建 `site/en/getting-started.md` — 英文快速开始
- [x] 1.5 创建 `site/zh-CN/index.md` — 中文首页（镜像英文结构）
- [x] 1.6 创建 `site/zh-CN/installation.md` — 中文安装指南
- [x] 1.7 创建 `site/zh-CN/getting-started.md` — 中文快速开始

## 2. npm 配置与依赖

- [x] 2.1 在 `package.json` 新增 `docs:dev` / `docs:build` / `docs:preview` 三个 scripts
- [x] 2.2 安装 `vitepress` 为 devDependency

## 3. CI 部署工作流

- [x] 3.1 创建 `.github/workflows/deploy-user-docs.yml` — VitePress 构建 + GitHub Pages 部署 + Gitee Pages 推送 + API 触发重建

## 4. Locale 分流函数

- [x] 4.1 创建 `src/utils/docsUrl.ts` — `getDocsBaseUrl()` 函数，根据 Zotero.locale / navigator.language 返回对应文档根 URL

## 5. 验证

- [x] 5.1 运行 `npm run docs:build` 确认无构建错误
- [x] 5.2 运行 `npm run docs:preview` 确认 en / zh-CN 路由正常
