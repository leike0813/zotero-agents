# 项目说明

本项目用于开发一个 Zotero 插件，作为 ACP Agents、Skills-Runner 后端服务以及其他 API 的一个通用前端。

# 项目特点及目标

1. 插件目标版本为 Zotero 7 + Zotero 9。
2. 插件以 zotero-plugin-template 项目为模板开发。
3. 插件采用模块化、工作流可插拔的设计理念。插件本体提供通用的 UI 界面及菜单。内部通过统一的工作流协议，由各组件分别按流程执行任务。插件本身不包含任何具体的业务逻辑。业务逻辑由用户通过“可插拔”的工作流文件或工作流包来声明和定义。
4. 插件主要以通过ACP协议调用Agent工具为目标开发，兼容旧的Skill-Runner后端服务，但也应设计为兼容其他通用的REST API后端。

# 目录结构

- 插件 TypeScript 源码：`./src`（入口 `index.ts`，通过 esbuild 构建到 `./addon`）
- 插件静态资源：`./addon`（manifest.json、bootstrap.js、prefs.js、content、locale、icons）
- 内置 Skill 定义：`./skills_builtin`、Skill 模板源码：`./skills_src`
- 内置工作流定义：`./workflows_builtin`
- OpenSpec 规格与变更记录：`./openspec`
- 参考文档/子模块：`./reference`

```shell
.
├── .github/                  # GitHub Actions workflows
├── addon/                    # Zotero 插件静态资源
│   ├── bootstrap.js          # 插件引导入口
│   ├── manifest.json         # 插件清单
│   ├── prefs.js              # 首选项默认值
│   ├── content/
│   │   ├── dashboard/        # Dashboard 页面（index.html, app.js, styles.css 等）
│   │   ├── shared/           # 静态共享资产（css、markdown renderer、theme、vendor libs）
│   │   ├── sidebar/          # 侧边栏页面（HTML/css；JS 由 src/sidebar 构建为 bundle）
│   │   ├── synthesis/        # Synthesis 工作台页面
│   │   ├── workspace/        # Assistant Workspace 页面
│   │   ├── harness/          # 只读 Harness 测试页面
│   │   ├── help-center/      # 帮助中心入口
│   │   ├── help-docs/        # 内嵌帮助文档（多语言）**自动生成，不要直接修改！**
│   │   ├── components/       # 可复用 Web 组件
│   │   ├── acp-runtime-prompts/templates/  # ACP 运行时 prompt 模板
│   │   ├── acp-skill-patches/templates/    # ACP Skill Patch 模板
│   │   └── markdown-reader/  # Markdown 附件阅读器
│   ├── locale/               # 多语言 FTL 文件（11 种语言）
│   └── bin/                  # Host Bridge CLI 预编译二进制（跨平台）
├── doc/                      # 架构文档
│   ├── components/           # 各组件设计文档（~49 篇）
│   └── synthesis-layer/      # Synthesis 层设计文档
├── reference/                # 外部参考资料（Skill-Runner, zotero-plugin-toolkit, API 指南等）
├── src/                      # TypeScript 源码
│   ├── index.ts              # 插件入口
│   ├── addon.ts              # 插件基类
│   ├── hooks.ts              # 生命周期钩子
│   ├── modules/              # 核心模块（~140 个模块文件）
│   │   ├── acp*.ts           # ACP 协议相关（connection, transport, session, skill runner, transcript 等）
│   │   ├── assistant*.ts     # Assistant 面板（model, renderer, view model, transcript）
│   │   ├── workflow*.ts      # 工作流引擎（execute, runtime, settings, menu, editor 等）
│   │   ├── skillRunner*.ts   # Skill-Runner 后端集成
│   │   ├── hostBridge*.ts    # Host Bridge 服务
│   │   ├── synthesis/        # Synthesis 子模块（~33 个文件）
│   │   ├── workflowExecution/ # 工作流执行子模块（~18 个文件）
│   │   ├── harness/          # 只读测试 Harness 子模块
│   │   └── ...               # 其他模块（backendManager, debugMode, runtimeLog, notificationHub 等）
│   ├── providers/            # 后端 Provider 实现
│   │   ├── acp/              # ACP Provider
│   │   ├── generic-http/     # 通用 HTTP Provider
│   │   ├── pass-through/     # 透传 Provider
│   │   └── skillrunner/      # Skill-Runner Provider
│   ├── backends/             # 后端注册与类型
│   ├── workflows/            # 工作流引擎核心
│   ├── utils/                # 工具函数（locale, prefs, path, fileSystem, wait, window, ztoolkit 等）
│   ├── config/               # 默认配置
│   ├── handlers/             # Handler 注册
│   ├── jobQueue/             # 任务队列
│   ├── platform/             # 平台抽象（command, env, path, subprocess）
│   ├── schemas/              # JSON Schema 定义
│   ├── shared/               # 共享前端组件与跨边界契约（citation graph, topic timeline, assistant wire/snapshot contract）
│   └── sidebar/              # 侧边栏页面 JS（ES module .js，esbuild 打包到 addon/content/sidebar/*.bundle.js；只允许 import 相对路径与 src/shared）
├── test/                     # 测试
│   ├── core/                 # 核心功能测试（~100+ 测试文件）
│   ├── node/core/            # Node.js 环境测试
│   ├── ui/                   # UI 测试
│   ├── zotero/               # Zotero 运行时测试基础设施
│   ├── helpers/              # 测试辅助工具
│   ├── fixtures/             # 测试 fixtures
│   ├── setup/                # 测试环境初始化
│   ├── mock-skillrunner/     # Mock Skill-Runner 服务
│   └── workflow-*/           # 各工作流的专项测试
├── scripts/                  # 构建与运维脚本（~50 个 .ts/.mjs）
├── skills_builtin/           # 内置 Skill 定义（~22 个 skill 目录）
│   ├── literature-analysis/
│   ├── literature-deep-reading/
│   ├── literature-explainer/
│   ├── literature-translator/
│   ├── tag-regulator/
│   ├── topic-synthesis-*/    # topic-synthesis 拆分后的多个 skill
│   └── ...                   # 其他 skills
├── skills_src/               # Skill 模板与合约源码
│   ├── topic-synthesis/      # topic-synthesis 合约、运行时、模板
│   └── literature-deep-reading/  # literature-deep-reading 合约与渲染器
├── workflows_builtin/        # 内置工作流包定义
│   ├── literature-workbench-package/  # 文献工作台工作流
│   ├── synthesis-layer/      # Synthesis 工作流
│   ├── mineru/               # MinerU 工作流
│   └── workflow-debug-probe/ # 调试探针工作流
├── openspec/                 # OpenSpec 规格与变更管理
│   ├── config.yaml
│   ├── specs/                # 规格文件（~228 个 spec）
│   └── changes/              # 变更记录（含 archive）
├── profiles/                 # Hermes Profile 发布目录
├── profiles_src/             # Hermes Profile 源文件
├── cli/                      # Zotero Bridge CLI（Rust 项目）
├── native/                   # Native 辅助程序（ACP WebSocket Bridge，Rust）
├── deprecated/               # 已废弃的旧代码（保留参考）
├── artifact/                 # 开发过程工件（设计评审、审计报告、playbook 等）
├── assets/                   # 共享资产（Skill Runner 输出合约 Python 库）
├── feeds/                    # 内容订阅 feed
├── site/                     # Docusaurus 用户文档站点
├── tools/                    # 开发辅助工具
├── typings/                  # TypeScript 类型声明
├── non-existing-zotero-data/ # 模拟 Zotero 数据目录（用于测试）
├── .env / .env.example       # 环境变量
├── package.json              # Node.js 依赖与脚本
├── tsconfig.json             # TypeScript 配置
├── zotero-plugin.config.ts   # 插件构建配置
├── eslint.config.mjs         # ESLint 配置
└── README.md                 # 项目说明
```

# 注意事项

- **如无必要，勿增实体！**
- 遵循全局AGENTS.md的指示
- 首先，敲定开发方案，再进入执行阶段
- 开发过程注重文档化
- 采用TDD模式：每一步开发前先写测试用例，再围绕测试实现
- **切勿将Node.js环境中才能使用的代码用于插件环境**

# Host Bridge Agent-facing Surface硬约束

- 修改 Host Bridge 三个 agent-facing surface 的语义源时，除非当前已批准方案逐项明确列入删除清单，否则不得压缩、删除、归并、重排或以更薄的概述改写任何现有指令。
- 新增指令必须与相邻现有指令保持同等厚度、同等详细程度，并覆盖相称的适用条件、决策分支、证据要求、完成条件、失败处理与恢复路径。
- 修改前必须记录固定 baseline commit、受影响的 materialized 文件指标和明确删除清单；修改后必须报告 unmapped、downgraded、unauthorized dropped 与 intra-package duplicate 四类计数。
- materialized `SKILL.md` 与直接引用的 reference 除绝对深度门禁外，还必须相对固定 baseline 保持 substantive instruction line count 不下降，normalized prose character count 不低于 baseline 的 95%。
- 相对厚度门禁只能发现明显变薄，不能替代逐条语义 parity 审阅；即使行数或字符数通过，也不得据此授权压缩、归并、重排或删除。
- 只允许删除已批准清单中的语义单元；本次外置队列迁移仅允许删除 Hermes 自有 workflow plan/plan-entry/reservation/batching/replay 队列指令，不得影响通知、watched runs、attention、catalog/index、maintenance、receipt、cron read-only 或 Generic Input Planning v2 指令。

# Assistant Workspace UI硬约束

- transcript/prompting 是 Assistant Workspace 中最高频的更新路径，transcript 渲染必须与 toolbar、banner、plan、hint、reply、context drawer、details drawer、permission drawer 等非 transcript DOM 渲染解耦。
- 任何 Assistant Workspace / ACP Skills / ACP Chat / SkillRunner 面板改动，都不得把 transcript revision、transcript page signature、streaming chunk、transcript item/event count、prompting event tail 或 log tail 放入整面板 chrome render key。
- transcript-only 更新只能触发 transcript region 渲染；不得重建 Runner pane、details drawer、context drawer 或其它非 transcript managed region。
- transcript loading/spinner 也是 transcript region 的一部分，必须按 panel owner scope（例如 backend/conversation、requestId、taskKey）隔离；同一 owner 的同一 loading 语义状态不得反复清空 transcript window 或重建 spinner。
- 如果需要刷新非 transcript region，必须使用该 region 自身的稳定 signature（只能包含该 region 用户可见内容和打开/折叠状态）作为组件 props 的 memoization 比较键（`src/sidebar/components/regionEquality.ts` 的 signature equality）；signature 语义不因实现机制变化而放宽。
- 所有 Assistant Workspace shared managed regions（toolbar、banner、plan、hint、reply、context drawer、details drawer、permission drawer）都是独立 Preact 组件，经由区域级 props memoization（signature equality）隔离；不得让 transcript-only/loading/streaming snapshot 直接触发这些区域的 clear/rebuild。transcript region 由 `TranscriptRegion` 组件包裹的命令式渲染器（`src/sidebar/assistantTranscriptRenderer.js`）持有，其虚拟滚动与行身份语义不受 chrome 组件重渲染影响。
- 涉及 transcript 渲染、prompting、snapshot、drawer/details 的改动必须补充或更新能锁定上述 DOM identity 不变量的测试。
- cold transcript 前台渲染必须 page-first，不得以 full mirror hydrate 完成为首屏 transcript page 的正确性前提；`transcript page ready` 与 `full mirror ready` 是两个独立状态。
- Assistant Workspace 中任何 selected transcript owner 切换都必须 owner-first：ACP Chat conversation/backend 切换、ACP Skills run 切换等路径必须先发布新 owner 的 loading-first/empty snapshot；indexed page read 与 full mirror hydrate 不得阻塞 owner first paint。
- live/prompting/lifecycle-open transcript mirror 必须 pinned，不参与 cold mirror LRU 淘汰；cold full mirror cache 只是性能缓存，不能成为 transcript 可见性的必要条件。
- cold full mirror LRU 按 owner 维护：ACP Skills 使用 `requestId`，ACP Chat 使用 `backendId + "\n" + conversationId`；缓存命中可以加速切换，缓存未命中必须仍能通过 indexed page read 渲染 selected page。
- SkillRunner transcript owner 使用 `requestId`（未分配 requestId 的 local run 回退 `runKey`）；SkillRunner 不维护 cold full mirror cache——有界的内存会话历史（上限 500 条）即是 mirror，分页读直接由其供页，transcript 以 snapshot 形式发布（无增量通道）。
- 新增 transcript cold-load / hydrate / mirror cache 逻辑时，不得把分页缓存设计成正确性 SSOT，也不得改写历史 transcript store 格式来满足 UI 首屏性能。
- toolbar/banner/reply 区域折叠（`src/sidebar/assistantRegionCollapse.ts`）是容器 class 驱动的纯 chrome 表现态：只能切换区域容器上的 `is-region-collapsed` class 与 root 上的 `data-collapse-stage` 属性，不得进入任何区域的 signature/render key 或 panel DTO，不得触发 transcript 或其它区域的重渲染；折叠把手必须挂在区域容器上（Preact managed mount 之外）。

# ACP Transcript Projection硬约束

- ACP Chat / ACP Skills 的 transcript projection 不得假设后端已经正确整流 assistant message chunks；插件侧必须按协议语义维护稳定的 assistant text segment。
- `tool_call_update`、usage、status、workspace activity 等 side-channel update 不得作为 assistant message 的硬切分边界；新 `tool_call`、用户消息、plan/permission/user interaction、显式 turn boundary、request terminal 才能结束当前 assistant text segment。
- ACP transcript message coalescing 必须是协议/语义级通用逻辑，不得按 backend id、provider id、agent family、命令名或具体后端产品字符串做特判。
- ACP Chat 与 ACP Skills 共享同一类 transcript boundary 分类；新增或修改 session update kind 时必须同步审查两条路径的 message coalescing 行为。

# 发布流程硬约束

- Host Bridge 发布只能由 Agent 在版本、release set、本地门禁和用户授权明确后，通过 `npm run release:host-bridge:dispatch` 显式触发；普通 `main` push 和 CI 不得触发发布。
- Host Bridge CLI 七平台预构建只能以内容寻址集合发布到 `host-bridge-cli-prebuilds` 分支，不得创建 GitHub Release 充当预构建仓。
- Host Bridge workflow、校验、receipt、同步和恢复脚本不得进入 CLI build fingerprint；构建身份仅由 CLI 源码、Cargo 输入和 build recipe 决定。
- Host Bridge 完成条件是三表面远端验证、可变指针推进、complete receipt 和自动 source-main finalize 全部成功。
- Gitee 同步不属于任何 GitHub 正式发布主线，只能在用户单独要求时运行 `npm run sync:gitee-release`。

# 发布流程硬约束

- GitHub `main`、GitHub tag/release 与 GitHub content feed 是正式发布的唯一事实源；正式发布门禁和 Host Bridge release receipt 不得依赖 Gitee 状态。
- Gitee 发布只能通过独立的 `npm run sync:gitee-release` 命令执行。除非用户在当前任务中单独明确要求，Agent 不得自动执行、轮询或等待该命令。
- Gitee 同步必须复用 GitHub 已发布的插件和 content package 原始字节，不得为 Gitee 重新构建产物、修改版本、创建修复提交或重新触发正式发布流程。
- content package 的 GitHub release asset 是不可变产物：同名同版本仅允许复用 SHA-256 一致的文件；内容不同必须提升 content package 版本。
