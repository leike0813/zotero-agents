## ADDED Requirements

### Requirement: Docusaurus project scaffold

The system SHALL provide a Docusaurus project in the `site/` directory with the following configuration:
- `docusaurus.config.ts` — Docusaurus 配置，包含 `baseUrl: "/Zotero-Skills/"`、i18n 配置（默认 zh-CN，支持 en）、docs plugin 配置（`routeBasePath: "/"`、`sidebarPath: "./sidebars.ts"`）
- `sidebars.ts` — 侧边栏配置，以 category 形式组织 7 个分组（指南、后端配置、Workflow、Dashboard、侧边栏与 ACP Chat、Synthesis Workbench、偏好设置）
- `src/pages/index.tsx` — 首页 React 组件，使用 `@docusaurus/Link` 重定向到 `/intro` 或展示品牌信息 + 引导按钮
- `src/css/custom.css` — 自定义样式（可选，初始阶段可使用默认主题）
- `package.json` — 在 `site/` 目录下包含 Docusaurus 依赖声明

#### Scenario: Dev server starts without error
- **WHEN** running `docusaurus start` in the `site/` directory
- **THEN** dev server starts on `localhost:3000` and serves all routes without 404

#### Scenario: Production build succeeds
- **WHEN** running `docusaurus build` in the `site/` directory
- **THEN** build output is generated at `site/build/` with correct HTML files for all 17 routes

### Requirement: i18n configuration

The system SHALL provide built-in i18n support with the following configuration:
- zh-CN is the default locale
- en is declared as an additional locale for future expansion
- Default language documents sit at `site/docs/` (no locale prefix in path)
- Documents at `/intro`, `/installation`, etc. serve Chinese content by default
- English content can be added later via `site/i18n/en/docusaurus-plugin-content-docs/current/`

#### Scenario: Chinese content served at root paths
- **WHEN** visiting `/Zotero-Skills/installation`
- **THEN** the Chinese version of the installation page is served

#### Scenario: English locale expansion path
- **WHEN** English `.md` files are placed in `site/i18n/en/docusaurus-plugin-content-docs/current/`
- **THEN** visiting `/Zotero-Skills/en/installation` serves the English version

### Requirement: sidebar parity with current VitePress

The Docusaurus sidebar SHALL have exactly the same structure as the current VitePress sidebar, organized into 7 groups:
1. 📖 指南 (intro, installation, getting-started)
2. ⚙️ 后端配置 (backends/, backends/acp, backends/skill-runner, backends/generic-http)
3. 🔧 Workflow (workflows/, workflows/invocation)
4. 📊 Dashboard (dashboard)
5. 🖥️ 侧边栏与 ACP Chat (sidebar/, sidebar/acp-chat)
6. 🔬 Synthesis Workbench (synthesis/, synthesis/tags, synthesis/index-and-citation, synthesis/topic-synthesis)
7. ⚙️ 偏好设置 (preferences)

#### Scenario: All sidebar items render
- **WHEN** navigating to any documentation page
- **THEN** the sidebar displays all 7 groups with correct labels and links

#### Scenario: Sidebar active state
- **WHEN** clicking a sidebar link
- **THEN** the corresponding page is loaded and the active item is highlighted in the sidebar

### Requirement: URL parity with current VitePress

All documentation page URLs SHALL remain unchanged after the migration:
- `/Zotero-Skills/` — site root (home page or redirect)
- `/Zotero-Skills/installation` — installation guide
- `/Zotero-Skills/getting-started` — quick start
- `/Zotero-Skills/backends/` — backend overview
- `/Zotero-Skills/backends/acp` — ACP backend
- `/Zotero-Skills/backends/skill-runner` — Skill-Runner
- `/Zotero-Skills/backends/generic-http` — Generic HTTP
- `/Zotero-Skills/workflows/` — workflow intro
- `/Zotero-Skills/workflows/invocation` — workflow invocation
- `/Zotero-Skills/dashboard` — dashboard
- `/Zotero-Skills/sidebar/` — sidebar overview
- `/Zotero-Skills/sidebar/acp-chat` — ACP Chat
- `/Zotero-Skills/synthesis/` — Synthesis Workbench
- `/Zotero-Skills/synthesis/tags` — tags management
- `/Zotero-Skills/synthesis/index-and-citation` — index and citation
- `/Zotero-Skills/synthesis/topic-synthesis` — topic synthesis
- `/Zotero-Skills/preferences` — preferences

#### Scenario: All old URLs return 200
- **WHEN** requesting each of the 17 routes above
- **THEN** the server returns HTTP 200 with the correct Chinese content

### Requirement: npm scripts

The root `package.json` SHALL provide npm scripts for local development:
- `docs:dev` — starts Docusaurus dev server
- `docs:build` — builds production site
- `docs:serve` — serves built production site locally

#### Scenario: npm run docs:dev starts dev server
- **WHEN** running `npm run docs:dev`
- **THEN** the Docusaurus dev server starts on port 3000

#### Scenario: npm run docs:build produces output
- **WHEN** running `npm run docs:build`
- **THEN** the build output is generated in `site/build/`
