## Context

当前文档站点基于 VitePress 1.6.4，使用 `site/` 目录存放源码，17 篇中文 Markdown 页面平铺在 `site/` 根目录下。配置为单语言模式（`lang: "zh-CN"`），侧边栏定义在 `themeConfig.sidebar` 顶层。

问题：VitePress 1.6.x 存在 `locales` + `sidebar` 渲染缺陷——启用 `locales` 后侧边栏不显示。这使得将来扩展英文版需要重构配置，且结果不可预测。

本项目已有 `openspec/changes/user-docs-vitepress-dual-platform/` 记录了前一阶段的 OpenSpec 工作流。本 design 基于 proposal 的能力划分，给出实现方案。

## Goals / Non-Goals

**Goals:**
- 将文档框架从 VitePress 切换为 Docusaurus，启用内置 i18n
- 保留现有 17 篇中文文档的全部内容，URL 路径不变
- 保留双平台（GitHub Pages + Gitee Pages）部署机制
- 保留插件内 `docsUrl.ts` 的 locale 分流逻辑（URL 结构不变，无需修改）
- 为将来扩展英文版提供清晰的扩展路径

**Non-Goals:**
- 不新增或重写文档内容（内容迁移只做格式适配）
- 不与开发者文档 `doc/` 合并
- 不部署自托管方案（继续使用 GitHub Pages / Gitee Pages 静态托管）
- 不引入搜索功能（Docusaurus 内置 Algolia，但初始阶段可跳过）

## Decisions

### D1：站点位置保留为 `site/`

虽然 Docusaurus 默认脚手架使用 `website/`，但保留 `site/` 可减少 git diff（现有 CI、`.gitignore` 等已以 `site/` 为路径）。`docusaurus.config.ts` 等配置文件的路径会相应调整。

### D2：使用 TypeScript 配置（`docusaurus.config.ts`）

现有 VitePress 使用 `config.ts`，项目广泛使用 TypeScript。Docusaurus 官方支持 `docusaurus.config.ts`（需要 `@docusaurus/tsconfig` 或 `ts-node`），保持一致性。如果 `ts-node` 在 CI 中增加复杂度，回退方案为使用 `docusaurus.config.js` + JSDoc 注释。

### D3：i18n 配置

Docusaurus 内置 i18n，配置方式：
```ts
i18n: {
  defaultLocale: "zh-CN",
  locales: ["zh-CN", "en"],
  localeConfigs: {
    "zh-CN": { label: "简体中文" },
    en: { label: "English" },
  },
},
```
zh-CN 为默认语言，文档结构为：
```
site/
├── docs/          # zh-CN（默认语言，路径中不出现 locale 前缀）
│   ├── intro.md
│   ├── installation.md
│   └── ...
└── i18n/
    └── en/        # 英文版（后续扩展）
        └── docusaurus-plugin-content-docs/
            └── current/
                ├── intro.md
                └── ...
```

这与 Docusaurus 的 i18n 文件覆盖模型一致：默认语言放在 `docs/` 根目录，其他语言通过 `i18n/<locale>/` 覆盖。

### D4：侧边栏配置（`sidebars.js`）

Docusaurus 使用独立的 `sidebars.js`（或 `.ts`）文件，而非 VitePress 的 themeConfig 内联定义。结构如下：
```ts
export default {
  docs: [
    {
      type: "category",
      label: "📖 指南",
      items: ["intro", "installation", "getting-started"],
    },
    // ... 其余分组
  ],
};
```
i18n 下侧边栏由 Docusaurus 自动映射，无需为每种语言重复定义。

### D5：URL 路径保持不变

当前 VitePress 使用 `base: "/Zotero-Skills/"`，页面路径形如 `/Zotero-Skills/installation`。Docusaurus 通过 `baseUrl: "/Zotero-Skills/"` 保持相同行为。`docsUrl.ts` 的 locale 分流逻辑无需修改。

### D6：npm scripts 替换

```jsonc
// 移除
"docs:dev": "vitepress dev site",
"docs:build": "vitepress build site",
"docs:preview": "vitepress preview site",

// 新增
"docs:dev": "docusaurus start",
"docs:build": "docusaurus build",
"docs:serve": "docusaurus serve",
```

### D7：移除 vite.config.ts（如果存在）

VitePress 的 Vite 配置嵌套在 `.vitepress/config.ts` 内，Docusaurus 不需要该配置。

### D8：使用 docusaurus-plugin-content-docs 默认行为

默认情况下，Docusaurus 的 docs 插件以 `docs/` 为源码目录。这与当前 `site/` 根目录下平铺 .md 文件的结构不同。方案：

```
site/docs/             # 文档源码目录（不是 site 根目录）
  ├── intro.md         # 原 site/index.md → 映射到 /
  ├── installation.md  # 原 site/installation.md
  ├── getting-started.md
  ├── backends/
  ├── workflows/
  ├── ...
site/src/              # React 源码（主题、组件）
  └── pages/
      └── index.tsx    # 首页
```

Docusaurus 的 docs 插件默认将 `docs/` 中的 .md 文件以 `docs/` 作为 URL 前缀。但通过配置 `routeBasePath: "/"`，可以使文档成为网站根路由：

```ts
presets: [
  [
    "classic",
    {
      docs: {
        routeBasePath: "/",
        sidebarPath: "./sidebars.ts",
      },
    },
  ],
],
```

这样 `docs/intro.md` → `/intro`，`docs/backends/acp.md` → `/backends/acp`，与当前 VitePress 的 URL 结构完全一致。

### D9：首页实现

VitePress 中首页由 `site/index.md` 渲染。Docusaurus 中将首页拆分为两部分：
- **文档首页**：`docs/intro.md`，映射到 `/intro`，包含项目简介、功能列表、快速链接
- **网站根页面**：通过 React 组件 `src/pages/index.tsx` 实现，配置一个简单的重定向到 `/intro`，或展示简短的品牌介绍后引导用户进入文档

Docusaurus 的 `src/pages/` 与 `docs/` 是独立的两个插件（pages plugin + docs plugin），需要合理规划路由以避免冲突。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| Docusaurus 的 `routeBasePath: "/"` 可能导致 pages plugin 的首页路由冲突 | 使用 `src/pages/index.tsx` 简单重定向到 `/intro`，或仅展示品牌页 + 按钮跳转到文档 |
| `docusaurus.config.ts` 需要额外 ts 依赖 | 如果 CI 中失败，回退为 `docusaurus.config.js` + JSDoc |
| 内容迁移过程中可能有链接断裂 | 所有内部链接使用 Docusaurus 的 `doc` 标识符引用，构建时自动验证 |
| 17 篇文档的 frontmatter 需要逐一转换 | VitePress 和 Docusaurus 的 frontmatter 高度兼容，主要差异在 `editLink` 和 `lastUpdated` 等 meta 字段 |
| 现有 CSS/样式差异 | 保持默认主题，Docusaurus 默认样式已有良好中文支持，无需自定义样式以缩小差异 |
