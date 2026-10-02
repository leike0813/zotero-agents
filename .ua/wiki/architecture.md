
# 架构全景

zotero-agents 被划分为 9 个分层。分层由知识图谱给出，是理解模块边界的起点。

## 分层清单

图谱把文件级节点归入分层；函数与类归属到所在文件，不重复计入分层。

| 分层 | 文件数 | 定位 |
| --- | --- | --- |
| [Agent 协议与后端运行时](layers/agent-runtime.md) | 155 | ACP 协议与 SkillRunner 后端运行时：JSON-RPC transport、会话与 transcript 投影、skill run store 与诊断，以及 acp / skillrunner / generic-http / pass-through 四类后端 Provider 的请求适配。 |
| [构建、发布与工程配置](layers/build-tooling.md) | 142 | 构建与运维工具链：host-bridge / synthesis / content-package / acp-ws-bridge / system-e2e 等构建发布脚本、synthesis index harness 工具，以及根级 package.json、tsconfig、ESLint/Prettier 与仓库属性等工程配置。 |
| [项目文档与规范](layers/documentation.md) | 44 | 项目与资产的说明性文档：多语言 README、AGENTS.md 工程约束、CONTEXT.md 上下文说明，以及工作流包与 Skill 目录内的使用说明。 |
| [插件外壳与核心运行时](layers/plugin-core.md) | 65 | Zotero 插件的启动外壳与跨模块运行时基础设施：插件基类与生命周期 hooks、prefs/locale 默认配置、后端注册与任务队列、跨运行时持久化（SQLite 门面、文件传输与配额治理）、运行日志与诊断开关、打包资产解析。 |
| [Synthesis 领域与侧车](layers/synthesis-domain.md) | 357 | Synthesis 知识综合域的完整纵切：Synthesis sidecar（Rust 全部 crates 与构建配方）、npm workspaces 的 contracts / engine / repository / application 四层、sidecar wire 契约、插件侧 synthesis 模块与 client，以及 synthesis-layer 工作流包。 |
| [页面与交互界面](layers/ui-surface.md) | 162 | 宿主内嵌页面的渲染与交互：Dashboard、Synthesis 工作台与侧边栏 Assistant Workspace 的 Preact 区域与 controller、Zotero tab/工具栏/首选项等宿主 UI 构件、只读 Harness 页面，以及 src/shared 的跨边界 wire 契约与区域 memoization 工具。 |
| [内置工作流包与 Skill 资产](layers/workflow-assets.md) | 200 | 随插件分发的声明式资产：literature-workbench、mineru、workflow-debug-probe 等内置工作流包及其 hook/lib/locale 资源，以及 skills_src 下的 Skill 模板、合约、渲染器与 schema。 |
| [工作流引擎与执行](layers/workflow-engine.md) | 86 | 声明式工作流引擎：工作流包加载与 manifest 合约、Workflow Host API 组合与输入物化、触发策略与执行子模块、任务运行时投影，以及工作流与 Skill 使用的 JSON Schema 定义。 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 94 | Zotero 宿主能力与进程外集成：capability broker 与 canonical mutation 权威、Host Bridge server/MCP/CLI 能力面、跨语言 Host Bridge 契约与 JSON Schema，以及 Zotero Bridge、ACP WS Bridge 两个 Rust 二进制和选区上下文投影。 |

## 层间依赖

方向为「源分层 → 目标分层」，只统计跨层的依赖类关系，不含归属类关系。

| 源分层 | 目标分层 | 边数 | 关系类型 |
| --- | --- | --- | --- |
| [Agent 协议与后端运行时](layers/agent-runtime.md) | [插件外壳与核心运行时](layers/plugin-core.md) | 288 | imports×288 |
| [工作流引擎与执行](layers/workflow-engine.md) | [插件外壳与核心运行时](layers/plugin-core.md) | 157 | imports×157 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [插件外壳与核心运行时](layers/plugin-core.md) | 93 | imports×93 |
| [页面与交互界面](layers/ui-surface.md) | [插件外壳与核心运行时](layers/plugin-core.md) | 87 | imports×87 |
| [工作流引擎与执行](layers/workflow-engine.md) | [Agent 协议与后端运行时](layers/agent-runtime.md) | 71 | imports×67、defines_schema×4 |
| [Agent 协议与后端运行时](layers/agent-runtime.md) | [页面与交互界面](layers/ui-surface.md) | 68 | imports×67、depends_on×1 |
| [Agent 协议与后端运行时](layers/agent-runtime.md) | [工作流引擎与执行](layers/workflow-engine.md) | 59 | imports×59 |
| [页面与交互界面](layers/ui-surface.md) | [Agent 协议与后端运行时](layers/agent-runtime.md) | 57 | imports×57 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [工作流引擎与执行](layers/workflow-engine.md) | 55 | imports×55 |
| [Synthesis 领域与侧车](layers/synthesis-domain.md) | [插件外壳与核心运行时](layers/plugin-core.md) | 53 | imports×53 |
| [构建、发布与工程配置](layers/build-tooling.md) | [Synthesis 领域与侧车](layers/synthesis-domain.md) | 51 | imports×50、configures×1 |
| [页面与交互界面](layers/ui-surface.md) | [工作流引擎与执行](layers/workflow-engine.md) | 40 | imports×40 |
| [插件外壳与核心运行时](layers/plugin-core.md) | [Agent 协议与后端运行时](layers/agent-runtime.md) | 29 | imports×29 |
| [工作流引擎与执行](layers/workflow-engine.md) | [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 27 | imports×27 |
| [插件外壳与核心运行时](layers/plugin-core.md) | [工作流引擎与执行](layers/workflow-engine.md) | 25 | imports×25 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [Synthesis 领域与侧车](layers/synthesis-domain.md) | 23 | imports×22、configures×1 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [构建、发布与工程配置](layers/build-tooling.md) | 21 | defines_schema×21 |
| [Agent 协议与后端运行时](layers/agent-runtime.md) | [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 18 | imports×18 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [Agent 协议与后端运行时](layers/agent-runtime.md) | 15 | imports×15 |
| [构建、发布与工程配置](layers/build-tooling.md) | [插件外壳与核心运行时](layers/plugin-core.md) | 14 | imports×10、configures×4 |
| [构建、发布与工程配置](layers/build-tooling.md) | [工作流引擎与执行](layers/workflow-engine.md) | 14 | imports×13、configures×1 |
| [构建、发布与工程配置](layers/build-tooling.md) | [页面与交互界面](layers/ui-surface.md) | 13 | imports×8、configures×5 |
| [插件外壳与核心运行时](layers/plugin-core.md) | [Synthesis 领域与侧车](layers/synthesis-domain.md) | 13 | imports×12、configures×1 |
| [插件外壳与核心运行时](layers/plugin-core.md) | [页面与交互界面](layers/ui-surface.md) | 13 | imports×10、configures×3 |
| [Synthesis 领域与侧车](layers/synthesis-domain.md) | [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 12 | imports×12 |
| [页面与交互界面](layers/ui-surface.md) | [Synthesis 领域与侧车](layers/synthesis-domain.md) | 12 | imports×12 |
| [页面与交互界面](layers/ui-surface.md) | [构建、发布与工程配置](layers/build-tooling.md) | 10 | imports×10 |
| [工作流引擎与执行](layers/workflow-engine.md) | [Synthesis 领域与侧车](layers/synthesis-domain.md) | 10 | imports×10 |
| [Synthesis 领域与侧车](layers/synthesis-domain.md) | [页面与交互界面](layers/ui-surface.md) | 9 | imports×9 |
| [页面与交互界面](layers/ui-surface.md) | [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 9 | imports×9 |
| [插件外壳与核心运行时](layers/plugin-core.md) | [构建、发布与工程配置](layers/build-tooling.md) | 8 | imports×8 |
| [工作流引擎与执行](layers/workflow-engine.md) | [页面与交互界面](layers/ui-surface.md) | 8 | imports×8 |
| [插件外壳与核心运行时](layers/plugin-core.md) | [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 7 | imports×7 |
| [Synthesis 领域与侧车](layers/synthesis-domain.md) | [工作流引擎与执行](layers/workflow-engine.md) | 7 | imports×7 |
| [工作流引擎与执行](layers/workflow-engine.md) | [构建、发布与工程配置](layers/build-tooling.md) | 7 | imports×7 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [页面与交互界面](layers/ui-surface.md) | 7 | imports×6、defines_schema×1 |
| [项目文档与规范](layers/documentation.md) | [内置工作流包与 Skill 资产](layers/workflow-assets.md) | 6 | depends_on×6 |
| [Agent 协议与后端运行时](layers/agent-runtime.md) | [构建、发布与工程配置](layers/build-tooling.md) | 5 | imports×5 |
| [构建、发布与工程配置](layers/build-tooling.md) | [Agent 协议与后端运行时](layers/agent-runtime.md) | 5 | imports×5 |
| [Synthesis 领域与侧车](layers/synthesis-domain.md) | [构建、发布与工程配置](layers/build-tooling.md) | 5 | defines_schema×4、imports×1 |
| [构建、发布与工程配置](layers/build-tooling.md) | [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | 2 | imports×2 |
| [内置工作流包与 Skill 资产](layers/workflow-assets.md) | [Agent 协议与后端运行时](layers/agent-runtime.md) | 2 | imports×2 |
| [内置工作流包与 Skill 资产](layers/workflow-assets.md) | [项目文档与规范](layers/documentation.md) | 1 | configures×1 |
| [Zotero 宿主与 Bridge 集成](layers/zotero-host.md) | [项目文档与规范](layers/documentation.md) | 1 | configures×1 |

## 双向依赖

[Agent 协议与后端运行时](layers/agent-runtime.md) ↔ [插件外壳与核心运行时](layers/plugin-core.md)；[Agent 协议与后端运行时](layers/agent-runtime.md) ↔ [页面与交互界面](layers/ui-surface.md)；[Agent 协议与后端运行时](layers/agent-runtime.md) ↔ [工作流引擎与执行](layers/workflow-engine.md)；[构建、发布与工程配置](layers/build-tooling.md) ↔ [Synthesis 领域与侧车](layers/synthesis-domain.md)；[页面与交互界面](layers/ui-surface.md) ↔ [工作流引擎与执行](layers/workflow-engine.md)；[工作流引擎与执行](layers/workflow-engine.md) ↔ [Zotero 宿主与 Bridge 集成](layers/zotero-host.md)；[插件外壳与核心运行时](layers/plugin-core.md) ↔ [工作流引擎与执行](layers/workflow-engine.md)；[Agent 协议与后端运行时](layers/agent-runtime.md) ↔ [Zotero 宿主与 Bridge 集成](layers/zotero-host.md)；[构建、发布与工程配置](layers/build-tooling.md) ↔ [插件外壳与核心运行时](layers/plugin-core.md)；[构建、发布与工程配置](layers/build-tooling.md) ↔ [工作流引擎与执行](layers/workflow-engine.md)；[构建、发布与工程配置](layers/build-tooling.md) ↔ [页面与交互界面](layers/ui-surface.md)；[插件外壳与核心运行时](layers/plugin-core.md) ↔ [Synthesis 领域与侧车](layers/synthesis-domain.md)；[插件外壳与核心运行时](layers/plugin-core.md) ↔ [页面与交互界面](layers/ui-surface.md)；[Synthesis 领域与侧车](layers/synthesis-domain.md) ↔ [Zotero 宿主与 Bridge 集成](layers/zotero-host.md)；[Synthesis 领域与侧车](layers/synthesis-domain.md) ↔ [页面与交互界面](layers/ui-surface.md)；[页面与交互界面](layers/ui-surface.md) ↔ [Zotero 宿主与 Bridge 集成](layers/zotero-host.md)；[插件外壳与核心运行时](layers/plugin-core.md) ↔ [Zotero 宿主与 Bridge 集成](layers/zotero-host.md)；[Synthesis 领域与侧车](layers/synthesis-domain.md) ↔ [工作流引擎与执行](layers/workflow-engine.md)；[项目文档与规范](layers/documentation.md) ↔ [内置工作流包与 Skill 资产](layers/workflow-assets.md)；[Agent 协议与后端运行时](layers/agent-runtime.md) ↔ [构建、发布与工程配置](layers/build-tooling.md)；[构建、发布与工程配置](layers/build-tooling.md) ↔ [Zotero 宿主与 Bridge 集成](layers/zotero-host.md)。改动这些分层时需要同时检查两侧。

## 关系类型口径

| 关系 | 含义 |
| --- | --- |
| imports | 文件之间的 import 关系 |
| calls | 符号之间的调用关系 |
| depends_on | 显式记录的依赖 |
| configures | 配置作用于目标 |
| defines_schema | 定义目标的结构约束 |
| implements | 实现目标声明的接口 |

归属类关系（`contains`、`exports`、`documents`）不计入层间依赖，它们只表示内容归属。
