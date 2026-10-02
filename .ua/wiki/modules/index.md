
# 仓库根目录
> 目录聚合页：26 个文件、7 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [.env.example](../files/.env.example.md) | 配置 | 0 | 开发环境变量样例：Zotero 二进制路径、profile 与数据目录、本地内容根目录（ZOTERO_AGENTS_CONTENT_DEV_ROOT），以及内容源发布用的 GitHub/Gitee Token 占位。 |
| [.gitattributes](../files/.gitattributes.md) | 文件 | 0 | Git 属性文件，仅一条规则 `* text=auto eol=lf`，统一全仓库以 LF 换行并由 Git 自动规范文本文件行尾，避免跨平台 diff 噪声。 |
| [.gitmodules](../files/.gitmodules.md) | 文件 | 0 | Git submodule 声明文件，登记 Zotero-7/9/10 三个固定版本源码基线与 literature-* Skill 子模块的 URL 与固定 commit。 |
| [.prettierignore](../files/.prettierignore.md) | 文件 | 0 | Prettier 排除清单，跳过 agent 工具配置目录、构建产物与 bundle、skills/workflows 内置定义、openspec 工件、文档与参考源码基线 submodule、测试 fixtures 及历史工件目录。 |
| [.worktreeinclude](../files/.worktreeinclude.md) | 文件 | 0 | Git worktree 自动携带清单，让新建 worktree 继承被 gitignore 但本地开发必需的 `.env` 与各类 agent 工具本地配置目录。 |
| [AGENTS.md](../files/AGENTS.md.md) | 文档 | 0 | 面向 AI 编码代理的项目规约文档：规定目录结构、工作流/Transcript/Broker 等领域概念，以及 Synthesis sidecar、Citation Graph、Assistant Workspace 等模块的硬性架构约束。 |
| [content-package.version.json](../files/content-package.version.json.md) | 配置 | 0 | 内置内容包（官方工作流订阅源）的版本身份文件，声明 schema、版本号、content_api 及对插件版本、Zotero 版本的兼容区间。 |
| [CONTEXT.md](../files/CONTEXT.md.md) | 文档 | 0 | 项目领域词汇表：以"术语 + 应避免的近义说法"的形式定义 System End-to-End Test、Contract Integration Test、Reference 体系、Citation Graph Application、Zotero Host Capability Broker、Workflow Host API Projection 等核心概念。 |
| [eslint.config.mjs](../files/eslint.config.mjs.md) | 文件 | 0 | ESLint 扁平配置：汇总 zotero 插件基础规则，并按 scripts/tests/src/sidebar/dashboard/synthesis 分区覆写规则，同时排除生成目录与参考源码；其中 Synthesis 组件层用 no-restricted-imports 强制只允许页面同级、shared 与 preact 导入。 |
| [package.json](../files/package.json.md) | 配置 | 0 | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [README-de.md](../files/README-de.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（德语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-esES.md](../files/README-esES.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（西班牙语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-frFR.md](../files/README-frFR.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（法语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-itIT.md](../files/README-itIT.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（意大利语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-jaJP.md](../files/README-jaJP.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（日语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-koKR.md](../files/README-koKR.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（韩语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-ptBR.md](../files/README-ptBR.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（巴西葡萄牙语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-ruRU.md](../files/README-ruRU.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（俄语），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-zhCN.md](../files/README-zhCN.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（简体中文），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README-zhTW.md](../files/README-zhTW.md.md) | 文档 | 0 | Zotero Agents 插件的多语言项目说明文档（繁体中文），覆盖功能定位、安装与构建、目录结构、工作流与 Skill 概念、测试命令及致谢，共约 43 个章节。 |
| [README.md](../files/README.md.md) | 文档 | 0 | Zotero Agents 插件的主项目文档（英文内容源）：说明以工作流协议与 ACP 驱动 AI Agent 在 Zotero 文献库内执行文献分析、引用图谱与知识综合的定位，涵盖特性、安装构建、目录结构、内置工作流与 Skill、测试与 E2E 流程、致谢。 |
| [tsconfig.dashboard.json](../files/tsconfig.dashboard.json.md) | 配置 | 0 | Dashboard 页面的 TypeScript 子配置：启用 Preact JSX（react-jsx / preact）与 DOM lib，noEmit 检查 src/dashboard、src/shared 与 synthesis-contracts 源码。 |
| [tsconfig.json](../files/tsconfig.json.md) | 配置 | 0 | 主 TypeScript 配置：继承 zotero-types 的 sandbox 条目，只开启 allowImportingTsExtensions；纳入 src、typings 与 packages/*/src，并显式排除 dashboard、synthesis 与 sidebar 组件等由子配置负责的范围。 |
| [tsconfig.sidebar.json](../files/tsconfig.sidebar.json.md) | 配置 | 0 | 侧边栏页面的 TypeScript 子配置：以 Preact JSX + DOM lib、noEmit 方式检查 src/sidebar 的 .ts/.tsx、src/shared 与 synthesis-contracts 源码。 |
| [tsconfig.synthesis.json](../files/tsconfig.synthesis.json.md) | 配置 | 0 | Synthesis 工作台的 TypeScript 子配置：以 Preact JSX + DOM lib、noEmit 方式检查 src/synthesis、synthesisWorkbenchApp.ts、src/shared 与 synthesis-contracts 源码。 |
| [zotero-plugin.config.ts](../files/zotero-plugin.config.ts.md) | 文件 | 7 | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [scripts](scripts.md) | 5 |
| [src](src.md) | 4 |
| [scripts/system-e2e](scripts/system-e2e.md) | 2 |
| [src/modules](src/modules.md) | 2 |
| [src/modules/dashboard](src/modules/dashboard.md) | 2 |
| [scripts/content-package](scripts/content-package.md) | 1 |
| [scripts/host-bridge](scripts/host-bridge.md) | 1 |
| [src/modules/assistant/workspace](src/modules/assistant/workspace.md) | 1 |
| [src/modules/synthesis/workbench](src/modules/synthesis/workbench.md) | 1 |
| [src/modules/workflow/catalog](src/modules/workflow/catalog.md) | 1 |
| [src/sidebar](src/sidebar.md) | 1 |
