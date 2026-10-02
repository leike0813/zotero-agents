
# zotero-agents 代码知识 wiki

Zotero Agents 是面向 Zotero 文献库的 all-in-one 智能体工作台：通过统一的工作流协议与 ACP 协议驱动 AI Agent 直接在库内执行文献分析、引用图谱与知识综合等任务，而不是只做问答的聊天插件。插件本体只提供通用 UI 与菜单，TypeScript 主源码搭配 Rust 侧车（Synthesis sidecar、Zotero Bridge、ACP WS Bridge）共同支撑，npm workspaces 提供共享的 Synthesis 合约与应用层。注意：本项目源码文件超过 100 个，如需更快出结果，建议把分析范围收敛到某个子目录。

## 数据来源

本页及全部子页面均由知识图谱自动生成，是该图谱的人读投影。

图谱是唯一事实源：正文不复制既有设计文档与规格，只链接过去，避免出现第二事实源。

| 项 | 值 |
| --- | --- |
| 图谱版本 | 1.0.0 |
| 分析时间 | 2026-10-02T03:47:09+08:00 |
| 代码提交 | `9218f30899e47d6e9b852dec978be81b1f802c2f` |
| 分析文件数 | 1248 |
| 节点数 | 7536 |
| 关系边数 | 15170 |
| 分层数 | 9 |
| 导览步数 | 14 |
| 文件页数 | 1248 |
| 目录页数 | 244 |
| 独立符号页数 | 374 |

## 三条阅读路径
- **第一次接触本项目**：[导览](tour.md) → [架构全景与层间依赖](architecture.md)
- **要改动某个子系统**：先在 [架构全景](architecture.md) 找到所属层，再沿该层的文件页与目录页进入。
- **要找某个具体符号**：[符号目录](catalog.md)，或直接在 `files/` 下按仓库目录结构定位。

## 分层一览

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
