## 1. 移除 VitePress 相关文件

- [x] 1.1 删除 `site/.vitepress/` 目录（config.ts 及 cache）
- [x] 1.2 从根 `package.json` 移除 `vitepress` devDependency
- [x] 1.3 从根 `package.json` 移除 `docs:dev`、`docs:build`、`docs:preview` 三个 scripts

## 2. 初始化 Docusaurus 骨架

- [x] 2.1 在 `site/` 下运行 `npx create-docusaurus@latest site classic --typescript`（注意：需要先清空或迁移到临时目录再初始化）
- [x] 2.2 将 Docusaurus 生成的 `package.json` 中 `@docusaurus/*` 依赖复制到根 `package.json` 的 `devDependencies`（或在 site/ 下独立管理——选择独立管理，删除根 package.json 中的 docs scripts）
- [x] 2.3 验证 `docusaurus start` 正常启动

## 3. 配置 Docusaurus

- [x] 3.1 编写 `site/docusaurus.config.ts`：设置 `baseUrl: "/Zotero-Skills/"`、项目名称、`title`、`tagline`
- [x] 3.2 配置 i18n：`defaultLocale: "zh-CN"`，`locales: ["zh-CN", "en"]`
- [x] 3.3 配置 docs plugin：`routeBasePath: "/"`、`sidebarPath: "./sidebars.ts"`
- [x] 3.4 配置导航栏（nav）：首页、安装、快速开始
- [x] 3.5 配置 footer：版权信息、GitHub 链接
- [x] 3.6 配置 Edit this page URL：指向 `main/site/docs/` 路径
- [x] 3.7 编写 `site/sidebars.ts`：定义 7 个 category 分组，与当前 VitePress 侧边栏结构一致

## 4. 新建 docs/ 目录并移动内容

- [x] 4.1 创建 `site/docs/` 目录
- [x] 4.2 将现有 16 个 `.md` 文件从 `site/` 根目录移动到 `site/docs/`（排除 `site/index.md`）
- [x] 4.3 将 `site/index.md` 重命名为 `site/docs/intro.md`
- [x] 4.4 更新所有 `.md` 文件中 VitePress 格式的内部链接为 Docusaurus 格式（相对路径 → `/` 开头的 docs-root 绝对路径）
- [x] 4.5 清理 VitePress 特有的 frontmatter（如 `layout`、`editLink` 等）
- [x] 4.6 验证构建：`docusaurus build` 无报错、无 broken links

## 5. 实现首页

- [x] 5.1 编写 `site/src/pages/index.tsx`：品牌展示 + "进入文档" 按钮重定向到 `/intro`
- [x] 5.2 验证首页在 `/Zotero-Skills/` 正确渲染

## 6. 清理 VitePress 残留

- [x] 6.1 删除不再需要的 `site/.vitepress/` 配置（确认 Docusaurus 工作正常后）
- [x] 6.2 更新 `.gitignore`：添加 `site/build/`、`site/.docusaurus/`，移除 VitePress 相关条目

## 7. 更新 CI/CD 部署工作流

- [x] 7.1 修改 `deploy-user-docs.yml`：构建命令改为 `docusaurus build`（从 `site/` 目录运行）
- [x] 7.2 修改 artifacts 上传路径从 `site/.vitepress/dist` 为 `site/build`
- [x] 7.3 修改 Gitee push 路径从 `site/.vitepress/dist` 为 `site/build`
- [x] 7.4 验证 CI 构建流程（可通过 push 到非 main 临时分支测试）

## 8. 端到端验证

- [x] 8.1 本地运行 `npm run docs:build`，确认 build 成功
- [x] 8.2 本地运行 `npm run docs:serve`，确认所有 17 个路由返回 200
- [x] 8.3 验证侧边栏渲染正确（7 个分组、active 状态）
- [x] 8.4 验证所有内部链接可点击跳转
- [x] 8.5 验证 Edit this page 链接指向正确的 GitHub 路径
- [x] 8.6 验证移动端响应式布局正常
