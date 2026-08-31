# 内置 Pi Agent Runtime 工作交接

- 更新日期：2026-08-25
- 工作区：`/home/joshua/Workspace/Code/JavaScript/.orca/worktrees/zotero-agents/dev-agent-harness`
- 分支：`dev-agent-harness`
- 基线提交：`e210997a11e0054a3cb4ae0656e5cfb96102a09c`

## 交接目标

下一阶段要把“内置 Pi Agent Runtime”从可行性研究推进到可评审、可分步实施的正式设计。它最终应成为一个完整 Agent：既支持可持久化的多轮交互，也能安全地使用 Shell、文件和网络能力，并通过稳定的插件内边界直接操作 Zotero 文献库。

当前还没有开始生产实现。已有工作证明了 Pi 核心运行时可以在 Zotero 中无 Node.js 运行，并完成了沙箱与权限模型的横向研究。下一位 Agent 应先把产品边界、进程边界、工具契约和迭代顺序写入 OpenSpec，不能直接从原型代码扩展成生产功能。

## 统一术语

项目根目录的 `CONTEXT.md` 已确定以下术语，后续规格、代码和 UI 应保持一致：

- **内置 Pi Agent Runtime（Built-in Pi Agent Runtime）**：随插件提供并由插件管理生命周期的 Agent 执行能力。避免使用“Pi Harness”或“内置 Harness”。
- **Pi Conversation（Pi 会话）**：由内置运行时持有的可持久化多轮交互。避免使用“自由聊天”或“Pi Chat Session”。
- **Pi Skill Run（Pi Skill 运行）**：由工作流发起并由工作流生命周期持有结果的 Agent 运行，即使包含多轮交互也不属于 Pi Conversation。
- **Pi Agent Transcript（Pi Agent 转录）**：归属于一个 Pi Conversation 或 Pi Skill Run 的完整持久化 Agent 历史，是消息、轮次、工具活动、分支和压缩记录的唯一事实源。
- **沙箱执行工具（Sandboxed Execution Tools）**：在隔离执行环境中运行的 Shell、文件读写和受策略约束的网络能力。
- **Zotero 原生工具（Zotero Native Tools）**：通过 Zotero capability broker 调用的文献库能力，边界是稳定 DTO 和受控操作，不暴露原始 Zotero 运行时对象。

## 已确认的产品与技术决策

以下内容已经与用户确认，下一阶段不应重新打开，除非新证据表明其不可行：

1. 内置运行时只采用 `pi-agent-core + pi-ai` 的核心能力。会话持久化、权限、工具、日志、配置、UI 和其他外围设施由本项目实现。
2. 插件不打包 Node.js 运行时。Pi 必须经一个明确的 browser build boundary 进入 Zotero 插件环境。
3. MVP 必须包含 Pi Conversation，不能只做一次性任务执行。
4. 长期产品目标是完整 Agent，而非只读聊天组件。通用能力至少包括 Shell、文件读写、网络搜索和 fetch。
5. 通用计算机能力必须经过真正的沙箱执行边界。审批、提示词和工具白名单都不能替代 OS、容器或 VM 级的限制。
6. 沙箱规则应参考成熟 Agent 的公开安全模型，重点借鉴 sandbox、workspace trust、permission/approval 三层分离的做法。
7. 内置运行时的战略优势是 Zotero 原生工具：以与 `zotero-bridge` CLI 能力相近的工具面为参考，但直接经过插件内 capability broker 调用 `hostApi`，减少外部协议与序列化绕行。
8. 沙箱执行体系和 Zotero 原生工具体系都需要独立的详细设计。不能在一个简单的“MVP 是否包含工具”问题中草率定案。
9. Pi Conversation 与 Pi Skill Run 的持久化由项目持有，完整历史只保存在每个 owner 的 canonical JSONL 中一次。SQLite 仅保存分离的 owner registry 与少量可重建标量，不得镜像 transcript payload；完整恢复、压缩、保留和清理契约见 [`docs/adr/0001-project-owned-pi-persistence.md`](../docs/adr/0001-project-owned-pi-persistence.md) 与 [GitHub #16](https://github.com/leike0813/zotero-agents/issues/16)。

用户最后一次范围澄清很重要：不要把现有决定解释成“先做聊天，以后再考虑完整 Agent”。正确理解是：Pi Conversation 已明确进入 MVP；完整工具能力是产品目标，但其沙箱和文献库操作边界必须在实施前分别完成设计。MVP 首批交付究竟包含哪些可执行工具，仍需在下一阶段正式定案。

## 已完成的证据

### Pi core Zotero 兼容性原型

- 分支：`prototype/pi-core-zotero-compatibility`
- 提交：`c073b007`
- 远端：`origin/prototype/pi-core-zotero-compatibility`
- 主报告：`artifact/pi-agent-runtime/pi-core-zotero-compatibility/report.md`
- 原型说明：`artifact/pi-agent-runtime/pi-core-zotero-compatibility/README.md`

可在当前工作区直接读取报告：

```bash
git show prototype/pi-core-zotero-compatibility:artifact/pi-agent-runtime/pi-core-zotero-compatibility/report.md
```

已经验证：

- 固定版本 `@earendil-works/pi-agent-core@0.84.3`、`@earendil-works/pi-ai@0.84.3` 和 `@earendil-works/pi-telemetry@0.84.3` 可以按 `platform: browser`、`format: iife`、`target: firefox115` 打包。
- 产物在 Zotero 7.0.32 和 Zotero 9.0.4 中运行通过，宿主没有可用 Node.js runtime。
- Agent 流式循环、工具调用、取消、listener 清理、reset 和官方 OpenAI provider 的 fixture fetch 路径均已验证。
- `core + faux` bundle 为 670,855 B raw / 110,290 B gzip；加入 OpenAI 后为 1,210,816 B raw / 194,907 B gzip。
- OpenAI 路径只有一处已知浏览器构建例外：`@earendil-works/pi-ai/dist/utils/provider-env.js` 对 `node:fs` 的 Bun-only fallback。原型只对“精确 importer + 精确 specifier”设置执行即抛错的 guard，其他 Node builtin 一律令构建失败。

原型没有验证真实 API 网络、密钥存储、多 provider、插件卸载、多 Agent 并发、生产分包、许可证物化、沙箱工具或 Zotero 原生工具。它只回答了一个问题：Pi 的选定 browser 路径可以不依赖 Node.js 运行在 Zotero 中。

生产实现不能直接复制原型的临时依赖组织方式。应保留其严格的 Node builtin 审计思路，并为每次 Pi 升级重新运行兼容性探针。

### Agent 沙箱与权限模型研究

- 分支：`research/pi-agent-sandbox-models`
- 提交：`6786bbe9`
- 远端：`origin/research/pi-agent-sandbox-models`
- 报告：`artifact/pi-agent-runtime/sandbox-and-permission-models.md`

读取方式：

```bash
git show research/pi-agent-sandbox-models:artifact/pi-agent-runtime/sandbox-and-permission-models.md
```

报告基于 OpenAI Codex CLI、Claude Code、Gemini CLI 和 Pi 的官方资料，形成了以下候选底线：

- Zotero 插件进程负责 Pi model loop、会话状态、UI、审批和策略；Shell、文件、进程、网络以及可扩展执行工具全部通过类型化 RPC 进入独立 executor。
- 如果改为把完整 Pi 放入独立进程、容器或微型 VM，也必须保证工具全集都在该边界内，不能只隔离 Bash。
- executor 在执行前返回 capability receipt，声明实际后端、版本、canonical workspace root、可写路径、网络策略、环境清理和资源限制。
- 无法建立或证明沙箱时 fail closed，返回 `sandbox_unavailable` 或 `sandbox_failed`；不得退回 Zotero 宿主权限执行。
- 默认无网络、无宿主环境和凭据继承；文件模式只考虑 `read-only` 与 `workspace-write`。任何权限扩大都应可见、按次、范围明确。
- workspace trust 只决定项目设置、skills、extensions、hooks、MCP 和 `.env` 能否影响 Agent；它不能替代文件、网络和进程隔离。

这份报告是候选安全契约，不是已存在的实现承诺。跨平台 executor、路径逃逸、进程树回收、网络拒绝、凭据泄漏、无头审批、资源上限和 capability receipt 都仍需原型验证。

### Zotero 7/9/10 兼容性自动化测试框架指南

主工作区中另有一份基于本次 spike 经验起草的工件：

`/home/joshua/Workspace/Code/JavaScript/zotero-agents/artifact/zotero_7_9_10_compatibility_test_framework_design_guide.md`

它属于主工作区，目前未提交，不在本工作树中。它面向全项目兼容性测试框架，后续可为 Pi runtime 的 Zotero 版本矩阵提供基础，但不应与 Pi runtime 规格合并成同一变更。

## 当前工作区状态

截至交接时：

- 当前分支仍位于 `e210997a`，没有 Pi runtime 生产代码。
- `CONTEXT.md` 是未跟踪文件，内容只有上述领域术语。
- 本交接文档也是未跟踪文件。
- 当前工作树中没有与内置 Pi Agent Runtime 对应的 OpenSpec change。
- 两个研究成果保留在独立、已推送的分支上，没有合并到 `dev-agent-harness`。
- 先前错误嵌套在字面量 `~/Workspace/...` 下的 worktree 已迁移到本文件顶部所列的正确路径；不要再使用旧路径。
- 修复路径后需要由宿主重新打开新工作区，才能让 CodeGraph 等依赖工作区路径的服务按新位置启动。

建议接手后先运行：

```bash
pwd
git status --short --branch
git rev-parse HEAD
git branch -a --list '*pi*' '*sandbox*' '*agent-harness*'
```

不要为了方便而立即 merge 或 cherry-pick 两个研究分支。先决定哪些证据应作为正式规格附件保留，再以可审阅的方式纳入当前分支。

## 建议的系统边界

以下结构与现有证据一致，可作为下一阶段设计的起点：

```text
[Assistant Workspace / Workflow UI]
                 |
                 v
[Built-in Pi Agent Runtime]
  Pi Conversation、model loop、provider boundary、状态与取消
                 |
        +--------+---------+
        |                  |
        v                  v
[Tool Policy/Broker]  [Pi Owner Registry / Canonical Agent Transcript]
        |
   +----+----------------------+
   |                           |
   v                           v
[Sandbox Executor RPC]   [Zotero Capability Broker]
 shell/file/network       stable DTO + controlled hostApi operations
```

设计时要守住几条边界：

- Pi 和 provider SDK 的版本、browser bundling、Node builtin 拒绝规则集中在一个深层 runtime adapter 中。上层不得直接依赖 Pi/provider 的内部类型。
- Pi Conversation 应复用或适配项目已有 transcript、streaming、cancellation 和 owner 模型，避免另建一套不兼容的 UI 状态系统。
- Assistant Workspace 的 transcript-only 更新不得触发 toolbar、drawer、permission pane 等非 transcript 区域重建。现有 `AGENTS.md` 中的 owner-first、page-first、region signature guard 和 assistant chunk coalescing 约束继续生效。
- 沙箱策略判定与 executor 强制执行分层。approval decision 不能改变 `failClosed`，也不能授权退回宿主 shell。
- Zotero 原生工具只交换稳定 DTO。不要把 `Zotero.Item`、窗口对象、数据库句柄或其他宿主对象交给 Pi。
- Zotero 原生工具与 Sandboxed Execution Tools 是两种不同的信任域。前者由插件 capability broker 控制文献库操作；后者在插件进程外限制通用计算机能力。

## 尚未定案的问题

下一阶段要明确记录决定及理由，至少覆盖以下内容。

### Runtime 与 provider

- Pi 版本固定、升级和回归探针策略。
- provider adapter 是随插件静态打包、按 provider 分包，还是按配置延迟加载。
- 首批支持哪些 provider；禁止使用 `providers/all` 的构建门禁如何落地。
- API key 的存储、读取、脱敏、日志与删除边界。
- 真实 fetch 的 CORS、Zotero proxy、重试、超时、限流和错误归一化。
- 多会话并发、插件禁用/卸载、窗口关闭和异常退出时的资源清理。

### Pi Conversation 与现有 UI/工作流

- Pi Conversation 如何映射现有 Assistant Workspace 的 backend、conversation owner、transcript store 和 snapshot contract。
- 内置 runtime 是新增 backend/provider，还是位于 backend 抽象之下的独立执行路径。
- 自由输入与工作流任务如何共用一个会话生命周期，同时保持任务状态和 transcript 边界清晰。
- 已确定的 Pi Agent Transcript 如何通过现有 page-first、owner-first 投影契约接入 Assistant Workspace，以及模型选项和取消行为如何出现在公开接口中。
- Pi 事件如何归一化到 ACP Chat / ACP Skills 已共享的 transcript boundary 分类，避免按 provider 名称做特判。

### Sandboxed Execution Tools

- `embedded loop + RPC executor` 与 `external Pi + RPC` 的最终选择。
- macOS、Linux、Windows 的 executor 后端、分发、更新、健康检查和 capability receipt。
- workspace identity、canonical path、symlink/junction/reparse point、外部 worktree和 TOCTOU 防护。
- shell、读写、搜索、fetch 和 web search 的工具 schema、输出上限、取消与进程树回收。
- 精确域名/端口 allowlist、重定向、DNS、私网、loopback 和代理策略。
- approval scope、无头模式、workspace trust 和审计记录。
- CPU、内存、磁盘、进程、句柄、执行时间、输出和会话成本限制。

### Zotero Native Tools

- 以哪些 `zotero-bridge` CLI 能力为参考建立首批工具目录，哪些能力明确不开放。
- capability broker 的接口、稳定 DTO、schema 版本和错误模型。
- 查询、选择项、附件、笔记、标签、集合、全文和检索能力的读取边界。
- 写操作的审批、事务、幂等、批处理、冲突、撤销与恢复语义。
- 工具结果的大小控制、分页、附件文本引用和敏感字段过滤。
- 与现有 `hostApi`、Host Bridge、工作流 protocol 的复用边界，避免复制业务规则。

## 推荐的下一阶段工作包

建议先创建一个 OpenSpec change，临时标识可用 `builtin-pi-agent-runtime-mvp`。在查看仓库现有 OpenSpec 约定后再确定最终名称。该 change 的第一轮只做规格和架构定案，不直接写生产代码。

### 工作包 A：MVP 外部契约

明确用户可观察行为：创建/恢复 Pi Conversation、选择 provider/model、流式响应、取消、错误恢复、调用工具、显示审批和持久化 transcript。列出 MVP 明确包含与明确延后的能力，但不能把完整 Agent 的目标从设计中删除。

完成条件：proposal、design、受影响 specs 和 tasks 能回答“用户如何开始、会话如何持有、失败后如何恢复、工具为何可用或不可用”。

### 工作包 B：Pi browser runtime boundary

把 spike 中验证的导入、构建和事件行为整理成生产接口设计。接口应隐藏 Pi/provider 类型，并定义 session create/run/abort/reset/dispose、事件归一化和结构化错误。

完成条件：设计中包含固定版本、provider 选择、Node builtin 审计、唯一 `node:fs` guard、bundle size/metafile 证据和升级重跑矩阵。

### 工作包 C：会话与 Assistant Workspace 集成

先追踪现有 backend registry、provider、workflow execution、assistant model/snapshot/transcript 的真实调用链，再决定接入点。优先复用现有 owner、transcript store、projection 和 region-level rendering contract。

完成条件：给出 sequence、状态机和 DTO；说明 Pi Conversation 与 ACP Chat/Skills 的共享部分及必须隔离的部分；列出保护 DOM identity 与 transcript coalescing 的测试。

### 工作包 D：沙箱 executor 设计与原型

以研究报告的候选安全契约为输入，单独设计跨平台 executor 和 typed RPC。第一步验证 fail-closed、路径逃逸、环境清理、网络拒绝、进程树取消和 capability receipt，不要先扩展工具数量。

完成条件：至少一平台的最小 executor 原型能证明真实限制；其他平台有明确的 disabled 状态和后续矩阵，不能退回宿主权限。

### 工作包 E：Zotero capability broker 与首批原生工具

先盘点现有 `hostApi`、Host Bridge CLI 和插件模块的能力，建立“可复用领域操作—稳定 DTO—Agent 工具 schema”的映射。建议从一个高价值、只读、输出有界的工具做垂直切片，但首批工具目录应作为整体设计接受评审。

完成条件：工具目录、DTO、schema、权限分类、错误模型和审计字段明确；证明没有暴露原始 Zotero 对象，也没有复制已有业务逻辑。

这些工作包可以在设计上并行，但实施依赖顺序大致为：A 确定外部契约；B 与 C 建立无工具的会话主链；D 提供通用执行边界；E 提供文献库能力。D、E 都通过统一 Tool Policy/Broker 被 Pi 调用，不能各自在 UI 或 runtime 中埋特殊分支。

## 实施前的代码探索入口

接手 Agent 应以代码为准核对以下区域，并记录文档漂移：

- `src/modules/assistant*.ts`、`src/shared`：Assistant Workspace 的模型、snapshot、wire contract、transcript projection 与渲染边界。
- `src/modules/acp*.ts`、`src/providers/acp`：会话、事件、取消、消息合并和 provider 适配先例。
- `src/backends`、`src/providers`、`src/modules/backendManager*`：内置 runtime 的注册与选择边界。
- `src/workflows`、`src/modules/workflow*`、`src/modules/workflowExecution`：任务执行与自由会话是否应共享的协议。
- `src/modules/hostBridge*.ts`、`cli`：可复用 Zotero 能力、CLI 工具目录和现有安全边界。
- `src/platform`：平台命令、路径、环境与子进程抽象；只能用于理解现状，不能把 Node-only 代码带进插件 runtime。
- `test/core`、`test/node/core`、`test/zotero`：现有稳定行为测试与真实 Zotero runner。
- `openspec/specs`、`openspec/changes`：选择最接近的规格和 change 组织方式。

如果新工作区的 `.codegraph/` 可用，遵守该工作区 `AGENTS.md` 的 CodeGraph 规则，通过 Explore Agent 做大范围探索；主会话只做精确符号查询。若服务仍指向旧路径，应先让宿主在新工作区重启它，不要恢复旧 worktree。

## 测试与证据策略

后续应采用 TDD，但只锁定稳定、可观察的行为：

- runtime adapter：事件归一化、取消、dispose、错误码、Node builtin build gate。
- Pi Conversation：owner 隔离、恢复、streaming、取消、transcript projection 和 DOM identity 不变量。
- executor：真实路径/网络/环境/进程边界及 fail-closed，不能只断言配置文本。
- Zotero 原生工具：DTO/schema、权限分类、分页/大小上限、只读与写入边界。
- 兼容性：至少覆盖 Zotero 7 与 9；Zotero 10 按兼容性框架指南中的渠道与预发布策略接入。

不要为完整提示词、UI 文案、日志全文、字段顺序或内部调用顺序添加脆弱测试。真实宿主、跨进程和安全边界的证据优先于大段 snapshot。

## 禁止的捷径

- 不得为了使用 Pi SDK 打包 Node.js runtime 或给插件环境补一套宽泛 Node polyfill。
- 不得导入 `pi-agent-core/node`、`session/testing`、`providers/all`、compat、OAuth 或 Bedrock 路径，除非新的独立研究证明其浏览器边界并获得设计批准。
- 不得把 Pi 默认工具、extension、MCP 或任意 host callback 直接暴露给模型后称为“沙箱”。
- 不得在 executor 不可用时回退到 Zotero 进程内执行 Shell、文件或网络操作。
- 不得让项目 trust、permission allow 或用户审批取消 OS/容器/VM 的强制边界。
- 不得向 Pi 暴露原始 Zotero runtime 对象，也不得绕过 capability broker 直接调用任意 `hostApi`。
- 不得为 Pi Conversation 复制一套与现有 Assistant Workspace 相冲突的 transcript 渲染和持久化系统。
- 不得因研究分支已有可运行原型就跳过 OpenSpec、接口设计和跨平台安全验证。

## 建议的接手顺序

1. 阅读当前工作区 `AGENTS.md`、`CONTEXT.md` 和本文。
2. 用 `git show` 阅读两个研究分支中的完整报告及原型 README，不先合并分支。
3. 检查工作树状态，确认没有覆盖用户未提交改动。
4. 探索现有 assistant/backend/provider/workflow/transcript/hostApi 边界，形成带文件与符号证据的现状图。
5. 创建并完善 OpenSpec change；先确认外部契约和关键架构决策。
6. 将沙箱 executor 与 Zotero 原生工具拆成可独立评审的设计章节或后续 change，同时在总设计中保留统一 Tool Policy/Broker。
7. 用户确认方案后，再按 TDD 开始第一个垂直切片。

## 下一次交付建议

下一位 Agent 的首个正式交付物应是一套待用户评审的 OpenSpec 方案，而非代码补丁。它至少应包含：

- Pi Conversation 的用户行为和生命周期；
- runtime/provider 深层接口与 browser build boundary；
- 与现有 Assistant Workspace、backend/provider 和 workflow 的接入决定；
- Sandboxed Execution Tools 与 Zotero Native Tools 的信任域和统一路由；
- MVP 工具范围的明确提案及取舍；
- 分阶段任务、测试矩阵、失败恢复和跨平台风险；
- 对两个研究分支工件如何纳入当前分支的处理计划。

达到这些条件并取得用户确认后，才进入生产实现阶段。
