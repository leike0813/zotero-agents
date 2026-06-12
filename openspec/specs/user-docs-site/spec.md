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

系统 SHALL 提供 `getDocsBaseUrl()` 函数，根据用户 locale 返回对应的文档根 URL。

#### Scenario: 中文 locale 分流
- **WHEN** `Zotero.locale` 以 `"zh"` 开头
- **THEN** `getDocsBaseUrl()` SHALL 返回 Gitee Pages URL

#### Scenario: 非中文 locale 分流
- **WHEN** `Zotero.locale` 不以 `"zh"` 开头
- **THEN** `getDocsBaseUrl()` SHALL 返回 GitHub Pages URL

#### Scenario: locale 不可用时的回退
- **WHEN** `Zotero.locale` 为 `undefined`
- **THEN** `getDocsBaseUrl()` SHALL 回退到 `navigator.language`
- **WHEN** `navigator.language` 也不可用
- **THEN** `getDocsBaseUrl()` SHALL 回退到 `"en-US"`
