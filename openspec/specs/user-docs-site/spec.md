# user-docs-site Specification

## Purpose

Specifies the user-facing documentation site: VitePress-based build, bilingual (en/zh-CN) support, and dual-platform deployment to GitHub Pages and Gitee Pages.

## Requirements

### Requirement: VitePress 站点构建

系统 SHALL 使用 VitePress 构建用户文档站点，源码位于 `site/` 目录。

#### Scenario: 本地开发预览
- **WHEN** 运行 `npm run docs:dev`
- **THEN** VitePress 开发服务器 SHALL 启动并监听本地端口
- **WHEN** 访问 `/en/` 路径
- **THEN** SHALL 显示英文版文档首页
- **WHEN** 访问 `/zh-CN/` 路径
- **THEN** SHALL 显示中文版文档首页

#### Scenario: 生产构建
- **WHEN** 运行 `npm run docs:build`
- **THEN** 构建产物 SHALL 输出到 `site/.vitepress/dist`
- **THEN** 构建过程 SHALL 以非零退出码报告错误

### Requirement: 双语言支持

站点 SHALL 支持 en 和 zh-CN 两种语言，通过 VitePress i18n locales 机制实现。

#### Scenario: 语言路由
- **WHEN** 用户访问 `/en/` 路径
- **THEN** SHALL 加载英文内容
- **WHEN** 用户访问 `/zh-CN/` 路径
- **THEN** SHALL 加载中文内容
- **WHEN** 用户访问 `/` 根路径
- **THEN** SHALL 重定向到默认语言（英文）

#### Scenario: 语言切换
- **WHEN** 用户在英文页面上点击语言切换链接
- **THEN** SHALL 导航到对应中文页面路径
- **WHEN** 用户在中文页面上点击语言切换链接
- **THEN** SHALL 导航到对应英文页面路径

### Requirement: Installation 页面

SHALL 提供英文和中文版本的安装指南，内容覆盖系统要求、下载、安装步骤。

#### Scenario: 英文安装页面
- **WHEN** 用户访问 `/en/installation.html`
- **THEN** SHALL 显示英文 Installation 页面
- **THEN** 页面 SHALL 包含系统要求和安装步骤

#### Scenario: 中文安装页面
- **WHEN** 用户访问 `/zh-CN/installation.html`
- **THEN** SHALL 显示中文安装页面
- **THEN** 页面 SHALL 包含系统要求和安装步骤

### Requirement: Getting Started 页面

SHALL 提供英文和中文版本的快速开始指南，覆盖配置和使用流程。

#### Scenario: 英文 Getting Started 页面
- **WHEN** 用户访问 `/en/getting-started.html`
- **THEN** SHALL 显示英文 Getting Started 页面

#### Scenario: 中文 Getting Started 页面
- **WHEN** 用户访问 `/zh-CN/getting-started.html`
- **THEN** SHALL 显示中文 Getting Started 页面

### Requirement: 双平台部署

站点构建产物 SHALL 同时发布到 GitHub Pages 和 Gitee Pages。

#### Scenario: GitHub Pages 部署
- **WHEN** 推送包含 `site/**` 变更的 commit 到 main 分支
- **THEN** GitHub Actions SHALL 触发 `deploy-user-docs` 工作流
- **THEN** 工作流 SHALL 执行 `vitepress build site`
- **THEN** 构建产物 SHALL 部署到 GitHub Pages

#### Scenario: Gitee Pages 部署
- **WHEN** GitHub Actions `deploy-user-docs` 工作流运行
- **THEN** SHALL 将构建产物推送到 Gitee 镜像仓库的 `gh-pages` 分支
- **THEN** SHALL 调用 Gitee Pages API 触发重建

#### Scenario: 手动触发部署
- **WHEN** 在 GitHub Actions 中手动触发 `deploy-user-docs` 工作流
- **THEN** SHALL 执行完整构建和双平台部署流程

### Requirement: Locale 分流函数

系统 SHALL provide `getDocsBaseUrl()` / `getDocsUrl()` helpers for user-facing online documentation links.

#### Scenario: Debug docs routing

- **WHEN** debug mode is enabled
- **THEN** `getDocsBaseUrl()` SHALL return the local Docusaurus server URL.

#### Scenario: Production docs routing

- **WHEN** debug mode is not enabled
- **THEN** `getDocsBaseUrl()` SHALL return the GitHub Pages docs URL regardless of locale.

#### Scenario: Bundled help is the offline fallback

- **WHEN** the published docs site is unreachable for a user
- **THEN** the bundled Help entry point SHALL remain available without relying on Gitee Pages or any plugin-internal HTTP server.

### Requirement: Bundled Help Docs Generation

The project SHALL generate a bundled documentation set from the Docusaurus docs source tree for inclusion in the plugin package.

#### Scenario: Help docs build output exists

- **WHEN** `npm run build:help-docs` runs successfully
- **THEN** `addon/content/help-docs/manifest.json` SHALL exist
- **AND** generated Markdown docs SHALL exist under `addon/content/help-docs/docs/{locale}/`
- **AND** referenced image assets SHALL exist under `addon/content/help-docs/assets/img/`.

#### Scenario: All Docusaurus docs locales are bundled

- **WHEN** a docs locale exists under `site/i18n/{locale}/docusaurus-plugin-content-docs/current`
- **THEN** the bundled help manifest SHALL include that locale
- **AND** English docs from `site/docs` SHALL always be included.

#### Scenario: Docusaurus syntax is converted for plugin rendering

- **WHEN** docs contain frontmatter, admonitions, internal doc links, or image references
- **THEN** the generated docs SHALL remove frontmatter
- **AND** convert admonitions into renderer-compatible Markdown
- **AND** rewrite internal doc links to bundled help navigation targets
- **AND** rewrite image references to packaged chrome asset URLs.

#### Scenario: Help docs image assets are size-controlled

- **WHEN** docs reference raster images
- **THEN** the generated assets SHALL be compressed at build time
- **AND** the help docs checker SHALL fail if the bundled help docs exceed the configured size budget.

### Requirement: Bundled Help Center Runtime

The plugin SHALL provide a bundled help center that reads generated documentation assets from the packaged plugin and remains usable without the external docs site.

#### Scenario: Help opens inside Zotero

- **WHEN** the user activates the Help entry point from the workspace toolbar or preferences About section
- **THEN** Zotero SHALL open the bundled help center in an internal tab.

#### Scenario: Locale is selected from available bundled docs

- **WHEN** the help center opens
- **THEN** it SHALL choose the best bundled locale by exact locale match or language-prefix match
- **AND** it SHALL fall back to English when no match exists.

#### Scenario: Independent help panes scroll

- **WHEN** the bundled help center opens inside a Zotero tab
- **THEN** the navigation pane SHALL be scrollable independently of the document reading pane
- **AND** the document reading pane SHALL be scrollable independently of the navigation pane.

#### Scenario: Navigation and locale controls stay inside the sidebar

- **WHEN** bundled help locales include labels wider than the sidebar
- **THEN** the locale selector SHALL remain clickable inside the sidebar
- **AND** navigation category and document labels SHALL wrap or break without widening the sidebar.

#### Scenario: Bundled images use documentation-sized rendering

- **WHEN** generated help docs include screenshots, icon images, or poster images
- **THEN** screenshots SHALL be constrained to the reading column
- **AND** icon images SHALL render compactly
- **AND** poster images SHALL render as compact centered images.

#### Scenario: Online Docs opens the published docs root

- **WHEN** the user clicks Online Docs from the workspace toolbar, preferences About section, or bundled help center
- **THEN** Zotero SHALL launch the configured published documentation root in the external browser.

#### Scenario: Help chrome text follows selected bundled locale

- **WHEN** the user switches the bundled help locale
- **THEN** help-center chrome labels such as title, Online Docs, language selector, loading state, and failure state SHALL update for that locale when a bundled translation exists.

### Requirement: Published docs use renamed project identity

The published user docs SHALL use `Zotero Agents` as the product name and
`zotero-agents` as the active repository/site slug.

#### Scenario: Docs links target the renamed repository
- **WHEN** users follow active README or documentation links to releases,
  issues, repository pages, or the docs site
- **THEN** those links target `leike0813/zotero-agents` or the
  `/zotero-agents/` docs base path.

#### Scenario: Historical archives are not rewritten
- **WHEN** archived OpenSpec changes, deprecated docs, or artifact reports
  mention old names
- **THEN** those historical files MAY keep their original text.
