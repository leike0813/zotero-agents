# 文档健康度审计报告

**日期：** 2026-06-11
**范围：** `doc/` 目录（49 个文件）与当前 `main` 分支代码（HEAD=1312727）的偏差分析

---

## 目录

1. [文档库存概览](#1-文档库存概览)
2. [方法论](#2-方法论)
3. [严重偏差（文档与代码明显不符）](#3-严重偏差文档与代码明显不符)
4. [中等偏差](#4-中等偏差)
5. [轻微偏差](#5-轻微偏差)
6. [仍然准确的领域](#6-仍然准确的领域)
7. [文档缺口（建议新增）](#7-文档缺口建议新增)
8. [优先级建议](#8-优先级建议)
9. [附录：文档文件完整清单](#9-附录文档文件完整清单)

---

## 1. 文档库存概览

| 区域 | 文件数 | 总量 | 覆盖领域 |
|------|--------|------|---------|
| `doc/` 根级 | 9 | ~125KB | 架构总览、开发指南、Host Bridge CLI、持久化、测试框架、ACP 状态机、SkillRunner 序列恢复、主题综合套件、UI 渲染稳定性 |
| `doc/components/` | 25 | ~145KB | 组件级设计：Provider、Workflow、Handler、JobQueue、Transport、SelectionContext、UI Shell、各状态机 SSOT、测试治理、MCP 设计 |
| `doc/synthesis-layer/` | 15（含 2 YAML） | ~260KB | 综合层完整设计：领域模型、引用解析、引文图、主题、概念、持久化、性能、运行时、UI、状态机、序列 |
| **合计** | **49** | **~530KB，~12,000 行** | |

---

## 2. 方法论

审计方式：对每个 `doc/` 文件中的关键断言，通过 CodeGraph 知识图谱、源代码读取、grep 搜索等方式与当前代码实现进行比对。重点关注：

- **结构断言**：文档声称的数据结构、类型、状态枚举是否匹配代码
- **数量断言**：文档声称的计数（表数量、工具数量、状态数量）是否准确
- **引用断言**：文档引用的文件、路径、命令是否存在
- **存在性断言**：文档描述的功能/机制是否在代码中存在
- **缺口识别**：代码中存在但文档未覆盖的子系统

---

## 3. 严重偏差（文档与代码明显不符）

### 3.1 SkillRunner 本地运行时状态机

| 维度 | 文档声称 | 代码实际 |
|------|---------|---------|
| **来源** | `doc/components/skillrunner-local-runtime-oneclick-state-machine-ssot.md` | `src/modules/skillRunnerLocalRuntimeManager.ts` |
| **状态数** | 12 个状态 | 6 个 `RuntimeState` 值 |
| **Event 类型** | 49 个事件定义 | 无 Event 类型 |
| **守卫函数** | `transitionGuard`、`actionMutexGuard`、`buttonEnablementGuard`、`autoStartToggleGuard`、`monitorGuard`、`reconcileAfterHeartbeatFailGuard` | 无任何守卫函数实现 |
| **转换表** | 形式化状态转换矩阵 | 无转换表，使用 if/else 控制流 |

**文档存在但代码不存在的状态（7 个）：**
- `no_runtime_info`、`runtime_info_ready`、`preflighting`、`deploying`、`acquiring_lease`、`stopping`、`uninstalling`、`error`

**代码存在但文档不存在的状态（1 个）：**
- `degraded`

**结论：** 这是一个**文档驱动的设计**，记录了一个计划中的状态机架构，但实际代码实现要简单得多。两者差距极大，要么需要根据代码重写文档，要么需要根据文档补全代码。

---

### 3.2 ACP 技能状态机

| 维度 | 文档声称 | 代码实际 |
|------|---------|---------|
| **来源** | `doc/acp-skills-state-machine-ssot.md` | `src/modules/acpSkillRunStore.ts` |
| **Run 状态** | `running, waiting_user, repairing, succeeded, failed, canceled`（6 个） | 多了一个 **`queued`**（7 个） |
| **连接状态** | 描述为单一轴：`active, closed, ended, recovery availability` | 实际是**三个独立轴**： |
| | | — `ConversationState`: `starting, active, ended, closed, error`（5 个） |
| | | — `RecoveryState`: `unavailable, available, connecting, connected, failed, unsupported`（6 个） |
| | | — `ConnectionActionState`: `idle, connecting, disconnecting`（3 个） |
| **回复状态** | 未提及 | 存在 `ReplyState`: `idle, submitted, accepted, rejected`（4 个） |

**结论：** 文档将多轴状态模型过度简化为单轴描述，遗漏了大量状态值。这是文档 SSOT 与代码 SSOT 严重分离的典型案例。

---

### 3.3 Zotero MCP 工具清单不全

| 维度 | 文档 | 代码 |
|------|------|------|
| **来源** | `doc/components/zotero-mcp-service-design.md` 和 `doc/components/zotero-host-capability-broker-ssot.md` | `src/modules/zoteroMcpProtocol.ts` |
| **工具数量** | 23 个（详细记录了 inputSchema 和 structuredContent） | ~42 个工具常量 |
| **未记录的工具** | — | 19 个合成层工具没有签名文档 |

**未记录的工具列表：**
- `topics.list`
- `topics.get_context`
- `topics.get_review_input`
- `schemas.get`
- `concepts.query`
- `citation_graph.query_cluster`
- `citation_graph.get_overview`
- `citation_graph.get_slice`
- `citation_graph.get_metrics`
- `citation_graph.rank_external_references`
- `citation_graph.rank_library_papers`
- `library_index.get`
- `resolvers.resolve`
- `reference_index.get`
- `paper_artifacts.get_manifest`
- `paper_artifacts.read`
- `paper_artifacts.export_filtered`
- `paper_artifacts.resolve_topic_digest`
- `insights.get_attention_queue`

**结论：** 近一半 MCP 工具没有 inputSchema、structuredContent 形状或文本披露要求的文档。合成层工具尤其严重——用户/开发者无法从文档了解如何调用这些工具。

---

### 3.4 Provider 系统文档缺 AcpProvider

| 维度 | 文档 | 代码 |
|------|------|------|
| **来源** | `doc/components/providers.md`、`doc/dev_guide.md` | `src/providers/registry.ts` |
| **Provider 数量** | 声称 3 个：`skillrunner, generic-http, pass-through` | 实际 4 个：多了 **`AcpProvider`** |
| **Request kind 数量** | providers.md 列出 1+ 种；workflows.md 列出 4 种 | 代码注册 **7 种** |

**未记录的 requestKind：**
- `skillrunner.sequence.v1`（由 AcpProvider 和 workflow declarative compiler 支持）
- `acp.prompt.v1`
- `acp.skill.run.v1`

**结论：** AcpProvider 是 v0.5 引入的关键新 Provider，支持直接 ACP 协议通信，但文档中完全不存在。

---

## 4. 中等偏差

### 4.1 Host Bridge CLI 文档

**来源：** `doc/host-bridge-cli.md`（54KB，最大单文件）

| # | 问题 | 详情 |
|---|------|------|
| 1 | **虚构的 `synthesis` 命令** | 文档多处引用 `synthesis <subcommand>` 作为顶层 CLI 命令（第 389、752、761 行及 12.7 节标题）。实际 Rust 代码（`cli/zotero-bridge/src/args.rs`）中不存在此命令。真实命令是各自独立的顶层子命令：`topics`、`citation-graph`、`paper-artifacts`、`concepts`、`schemas`、`library-index`、`resolvers`、`reference-index`、`insights` |
| 2 | **字段名不一致** | 文档描述 `literature ingest` 输入使用 `paper`（单数对象），实际代码接受 `papers`（复数数组） |
| 3 | **`--input` 必填性矛盾** | 文档暗示 `synthesis <subcommand> --input` 可省略（默认 `{}`），但 `literature ingest` 的 `input` 在代码中是 `String` 而非 `Option<String>`，意味着必填 |

---

### 4.2 综合层持久化表族

**来源：** `doc/synthesis-layer/persistence-and-files.md`

| 表族 | 文档列在表中？ | 代码中存在？ |
|------|--------------|------------|
| 11 个已列出的表族 | ✅ | ✅ |
| `synt_cache_basis` | ❌（仅一句话提及） | ✅（repository.ts:2348） |
| `synt_operation` | ❌（仅一句话提及） | ✅（repository.ts:2883） |
| `synt_reference_match_proposal` | ❌ | ✅（repository.ts:2440） |
| `synt_literature_matching_metadata` | ❌ | ✅（repository.ts:2607） |

**结论：** 文档遗漏了 4 个实际存在的表族。

---

### 4.3 SkillRunner 运行时选项

**来源：** `doc/dev_guide.md`（第 124-129 行）

文档列出 3 个选项：`engine`、`model`、`no_cache`。

代码 `src/providers/skillrunner/provider.ts` 实际有 7 个：

| 选项 | 类型 | 文档中有？ |
|------|------|-----------|
| `engine` | string | ✅ |
| `model` | string | ✅ |
| `no_cache` | boolean | ✅ |
| `provider_id` | string | ❌ |
| `effort` | string | ❌ |
| `interactive_auto_reply` | boolean | ❌ |
| `hard_timeout_seconds` | number | ❌ |

---

### 4.4 测试治理文档自相矛盾

| 来源 | 问题 |
|------|------|
| `test-suite-governance.md` §3 与 §8 | `test/core/32-job-queue-transport-integration.test.ts` 在第 3 节被列为 **full-only**，但在第 8 节又被列为 **lite 保留** |
| `test-taxonomy-domain-map.md` §4 | 声明 39 个已迁移测试套件，但列出文件仅累加为 35 个（24 + 6 + 4 + 1） |
| `test-taxonomy-domain-map.md` 与真实文件系统 | 遗漏至少 4-7 个真实存在的测试文件（如 `47-*`、`87-*`、`88-*`、`89-*`、`70a/b/c-*`） |

---

### 4.5 持久化治理 TTL 不准确

**来源：** `doc/persistence-governance.md`
**代码：** `src/modules/persistenceIntegrity.ts`

文档说 skill-run workspaces 有 30 天 TTL。但清理代码对 `acp-skill-runs` 类别**未做年龄检查**，直接清除所有匹配条目。

```
// 伪代码对比
// 其他类别： if (isOlderThan(path, 30 * DAY_MS)) { remove(path); }
// acp-skill-runs： remove(path);  // 无年龄判断！
```

---

### 4.6 工作流设置 SSOT

**来源：** `doc/components/workflow-settings-single-source-submit-flow-ssot.md`

文档说持久字段只有 `backendId`、`workflowParams`、`providerOptions`。

代码 `src/modules/workflowSettings.ts` 的 `WorkflowExecutionContext` 还有：
- `runOptions: WorkflowRunOptions`
- `providerId: string`

---

### 4.7 架构流程图过时

**来源：** `doc/architecture-flow.md`

| 问题 | 详情 |
|------|------|
| 断链引用 | 第 5 行引用 `doc/architecture-hardening-baseline.md`，此文件已不存在（仅在 `artifact/archive/` 中有归档版） |
| 缺少执行阶段 | 流程图缺少：**settings gate**（工作流配置检查/弹窗阶段）、**dedup guard**（请求去重守卫）、**deferred job reconciliation**（延迟任务协调）三个阶段 |
| Provider 解析时机 | 流程图暗示 ProviderRegistry Resolve 在 Provider Execute 之前独立发生，实际 resolution 在 JobQueue callback 内部按 job 执行 |

---

### 4.8 Workflow Hook Helpers 遗漏

**来源：** `doc/components/workflow-hook-helpers.md`

遗漏 4 个 hostApi.file 方法：`readBytes`、`writeBytes`、`copy`、`pathToFile`

遗漏 3 个运行时上下文字段：`addon`、`FileReader`、`navigator`

---

## 5. 轻微偏差

| 领域 | 偏差 | 严重度 |
|------|------|--------|
| Sequence 状态机字段名 | 文档 `runId`/`sequenceFinalStepId`，代码 `workflowRunId`/`finalStepId` | 低 |
| 引用解析层表族计数 | 文档说"4 个活跃表族"，实际有 6 个表组 | 低 |
| UI 渲染稳定性测试覆盖 | 文档要求"每个 UI surface"都遵循三类别分离，但测试仅覆盖 `synthesisWorkbenchApp.ts` | 低 |
| SkillRunner model 选项折叠 | `doc/dev_guide.md` 说 model 随 engine 动态刷新，实际代码中已通过 `provider_id` 和 `modelOptionFolding` 机制解耦 | 低 |

---

## 6. 仍然准确的领域

以下领域的文档与代码实现基本一致，无需大幅修改：

| 领域 | 准确度 | 备注 |
|------|--------|------|
| **Transport**（`doc/components/transport.md`） | ✅ | `src/transport/` 确实为空 |
| **Local Cache**（`doc/components/local-cache.md`） | ✅ | 确实未实现 |
| **Job Queue 状态机**（`doc/components/job-queue.md`） | ✅ | 5 个状态值完全匹配 |
| **Workflow Schema 废弃字段**（`doc/components/workflows.md`） | ✅ | 8 个废弃字段均正确拒绝 |
| **Backend 兼容性规则**（`doc/components/providers.md`） | ✅ | `acp→acp`, `skillrunner→skillrunner/acp` 等规则正确 |
| **测试框架架构**（`doc/testing-framework.md`） | ✅ | 双环境、域分组、lite/full 门禁设计基本准确 |
| **综合层领域模型**（`doc/synthesis-layer/domain-model.md`） | ✅ | 10 个领域的所有权声明与模块结构一致 |
| **综合层引用解析策略**（`doc/synthesis-layer/reference-resolution.md`） | ✅ | 7 级匹配层级、去重策略均与代码一致 |
| **综合层序列图**（`doc/synthesis-layer/sequences.md`） | ✅ | 9 个序列图与运行时流程一致 |
| **Deprecated assistant-sidebar-entrypoints** | ✅ | 文档正确标记为历史代码 |

---

## 7. 文档缺口（建议新增）

### 7.1 关键缺口（完全无文档，第一优先级补充）

| # | 子系统 | 涉及文件 | 说明 |
|---|--------|---------|------|
| **G1** | **ACP Backend Presets** | `src/modules/acpBackendPresets.ts` | 定义 6 个预设（opencode/codex/claude-code/gemini-cli/hermes/qwen-code）。这是用户配置 ACP 后端的核心入口，新用户 onboarding 必须阅读 |
| **G2** | **UI Readonly Test Harness** | `src/modules/harness/`（9 个文件） | 测试基础设施——`assistantReadonlyModel.ts`、`backendsReadonly.ts`、`dashboardReadonlyModel.ts`、`env.ts`、`pluginStateReadonly.ts`、`prefsReadonly.ts`、`sqliteReadonly.ts`、`synthesisReadonlyService.ts`、`zoteroReadonlyLibraryAdapter.ts`。完全无文档 |
| **G3** | **Host Bridge 生命周期监管** | `src/modules/hostBridgeServer.ts` 中的 start/stop/port selection/pin-fallback/status snapshot | openspec `harden-host-bridge-lifecycle-and-status` 已归档但无对应文档。涉及：端口选择策略、心跳检测、故障恢复、`HostBridgeStatusSnapshot` 诊断接口 |
| **G4** | **Host Bridge 主令牌认证** | `src/modules/hostBridgeAuth.ts` | 安全敏感模块——AES-GCM 加密、PBKDF2 密钥派生、schema-v1 信封格式。完全无文档，对安全审计和外部客户端对接至关重要 |

### 7.2 高优先级缺口

| # | 子系统 | 说明 | 建议文档类型 |
|---|--------|------|------------|
| **G5** | **ACP/SkillRunner 合同对等性** | Schema 资产解析器、ACP 输入/参数/输出验证管道、技能包注册表验证、result-file fallback | SSOT 设计文档 |
| **G6** | **Host Bridge Prompt Injection 机制** | `workflow.execution.zoteroHostAccess.runtime_options` 注入、编排器注入 `.zotero-bridge` profile、engine instruction file markers、`required` vs `required: false` 行为 | 安全/架构文档 |
| **G7** | **Synthesis 知识图谱子系统** | 6+ 个 openspec 变更的合集：KG foundation、concept KB、topic graph、literature registry、citation graph、tag vocabulary、git-sync | 合成层扩展文档 |
| **G8** | **Debug Sequence Probe 技能** | 3 个内置技能（check/emit/finalize）+ `workflowDebugProbe.ts` | 开发者指南章节 |
| **G9** | **manuscript-literature-framing 技能** | 内置技能之一，用于手稿起草框架 | 技能说明文档 |
| **G10** | **autoskill-converter 技能** | 内置技能之一，用于技能格式转换 | 技能说明文档 |
| **G11** | **Synthesis Workbench Invalidation API** | `synthesisWorkbenchInvalidation.ts` 的事件监听器/表面失效机制 | API 参考文档 |

### 7.3 中优先级缺口

| # | 子系统 | 说明 |
|---|--------|------|
| **G12** | **Host Bridge Approval Prompts 人性化** | 审批文案生成、workflow submit vs capability call 的审批区别、"View details" 标签变更 |
| **G13** | **Assistant 复制/输入 UX** | 文本选择 CSS 策略、代码块复制手柄、回复历史内存、输入框方向键历史 |
| **G14** | **Synthesis CLI 子命令设计思路** | 为什么是 `synthesis` 顶层命令（已废弃但仍作为设计记录有用）、`--input <JSON_OR_FILE>` 统一模式、kebab-case 原则 |
| **G15** | **Note Payload Codec 架构** | `notePayloadCodec.ts`：编码格式、embedded attachment 标记（`WORKBENCH_EMBEDDED_PAYLOAD_MARKER` / `PNG_IEND`）、分块策略（DEFAULT=8000/MAX=16000）、版本化方案 |
| **G16** | **Workflow Editor Host 框架** | `workflowEditorHost.ts`：编辑器注册/反注册机制、render API、编辑操作分发 |
| **G17** | **Workflow Settings Dialog UI** | `workflowSettingsDialog.ts` + `workflowSettingsDialogModel.ts`：弹窗表单架构、render model 构建方式 |

### 7.4 低优先级缺口

| # | 子系统 | 说明 |
|---|--------|------|
| **G18** | **Debug Mode 全局说明** | `debugMode.ts` 的控制范围（local deploy debug store、debug console button、selection sample menu）、test override seam 模式 |
| **G19** | **Dashboard 子模块文档** | `dashboardActiveTasks.ts`、`dashboardToolbarButton.ts`、`taskDashboardHistory.ts`、`taskDashboardSnapshot.ts` 等 |
| **G20** | **Host Bridge Capability Registry 内部架构** | 如何注册 handler、capability context 如何工作、与 capability broker 的关系 |

---

## 8. 优先级建议

### 第一阶段：修复现有偏差（高 ROI，消除误导）

```
P0 — 影响读者正确理解的硬伤
├── P0a: acp-skills-state-machine-ssot.md — 补齐 Run State 缺的 'queued'
│                                      — 展开连接状态为三个独立轴
│                                      — 添加 Reply State
│
├── P0b: providers.md + dev_guide.md — 补充 AcpProvider 和 3 个缺的 requestKind
│
├── P0c: zotero-mcp-service-design.md 和
│        zotero-host-capability-broker-ssot.md
│     └— 补齐 19 个合成层 MCP 工具的 inputSchema/structuredContent
│
└── P0d: skillrunner-local-runtime-oneclick-state-machine-ssot.md
     └— 两种路线选一：
        (a) 降级为代码的实际 6 状态模型（文档对齐代码）
        (b) 补全代码实现至 12 状态 49 事件（代码对齐文档）

P1 — 影响信息准确性的偏差
├── P1a: host-bridge-cli.md — 删除虚构的 `synthesis` 命令引用
│                           — 修复 `paper` → `papers` 字段名
│                           — 澄清 `--input` 必填性
│
├── P1b: architecture-flow.md — 删除断链引用
│                             — 补齐 settings gate / dedup guard / deferred reconciliation
│
├── P1c: persistence-and-files.md — 补齐 4 个缺的表族
│
├── P1d: dev_guide.md — 补充 SkillRunner 运行时选项（provider_id, effort 等）
│
├── P1e: test-suite-governance.md — 修复 32-* 测试文件的矛盾归属
│
├── P1f: test-taxonomy-domain-map.md — 补齐遗漏的测试文件，修复计数
│
├── P1g: persistence-governance.md — 修正 skill-run workspace TTL 描述
│
├── P1h: workflow-settings-ssot.md — 补充 runOptions/providerId
│
└── P1i: workflow-hook-helpers.md — 补充 4 个 file 方法和 3 个 context 字段
```

### 第二阶段：补齐关键文档缺口

```
P2 — 降低 onboarding 和运维成本
├── P2a: doc/components/acp-backend-presets.md  [G1]
├── P2b: doc/components/host-bridge-lifecycle.md  [G3]
├── P2c: doc/components/ui-readonly-harness.md  [G2]
├── P2d: doc/components/host-bridge-auth.md  [G4]
├── P2e: doc/components/acp-skillrunner-parity.md  [G5]
└── P2f: doc/components/host-bridge-prompt-injection.md  [G6]

P3 — 合成层知识图谱补齐  [G7]
└── doc/synthesis-layer/knowledge-graph.md
    └— 覆盖 KG foundation, concept KB, topic graph, 文献注册表, 引文图
```

### 第三阶段：增量补齐（可并行、低风险）

```
P4 — 增量补充
├── 为 3 个无文档的 debug probe 技能添加章节  [G8]
├── 为 manuscript-literature-framing 添加章节  [G9]
├── 为 autoskill-converter 添加章节  [G10]
├── invalidation API 参考  [G11]
├── approval prompts / copy UX 设计说明  [G12][G13]
├── note payload codec 架构说明  [G15]
└── 其余中低优先级缺口  [G14][G16][G17][G18][G19][G20]
```

---

## 9. 附录：文档文件完整清单

### 9.1 `doc/` 根级（9 个）

| # | 文件名 | 大小 | 行数 | 主题 |
|---|--------|------|------|------|
| 1 | `acp-skills-state-machine-ssot.md` | 2.2KB | 63 | ACP 技能状态机 SSOT |
| 2 | `architecture-flow.md` | 2.9KB | 86 | 架构执行主链路（中文） |
| 3 | `dev_guide.md` | 8.7KB | 208 | 开发者指南（中文） |
| 4 | `host-bridge-cli.md` | 54.5KB | 1,986 | Host Bridge CLI 规格 |
| 5 | `persistence-governance.md` | 4.1KB | 90 | 持久化治理 |
| 6 | `skillrunner-sequence-recovery-state-machine.md` | 4.9KB | 128 | SkillRunner 序列恢复状态机 |
| 7 | `testing-framework.md` | 12.8KB | 397 | 测试框架设计（中文） |
| 8 | `topic-synthesis-split-skill-suite.md` | 27.1KB | 636 | 主题综合拆分技能套件合约（中文） |
| 9 | `ui-rendering-stability-contract.md` | 2.7KB | 61 | UI 渲染稳定性合约 |

### 9.2 `doc/components/`（25 个）

| # | 文件名 | 主题 |
|---|--------|------|
| 10 | `assistant-sidebar-panel-ui-ssot.md` | 助手侧边栏面板 UI/UX SSOT |
| 11 | `handlers.md` | Handler 组件（中文） |
| 12 | `job-queue.md` | Job 队列组件（中文） |
| 13 | `local-cache.md` | 本地缓存组件（中文，占位） |
| 14 | `plugin-localization-governance.md` | 插件本地化治理 SSOT |
| 15 | `plugin-skill-registry-and-acp-compatible-ssot.md` | 插件技能注册表及 ACP 兼容性 SSOT |
| 16 | `providers.md` | Provider 组件（中文） |
| 17 | `runtime-persistence-governance-ssot.md` | 运行时持久化治理 SSOT |
| 18 | `selection-context.md` | SelectionContext 组件（中文） |
| 19 | `selection-context.schema.json` | SelectionContext JSON Schema |
| 20 | `skillrunner-local-runtime-debug-mode-log-split.md` | SkillRunner 调试模式与日志分割 |
| 21 | `skillrunner-local-runtime-oneclick-state-machine-ssot.md` | SkillRunner 本地一键部署状态机 SSOT（中文） |
| 22 | `skillrunner-provider-global-run-workspace-tabs-ssot.invariants.yaml` | 运行工作区 YAML 不变量 |
| 23 | `skillrunner-provider-global-run-workspace-tabs-ssot.md` | SkillRunner 全局运行工作区标签 SSOT |
| 24 | `skillrunner-provider-state-machine-ssot.invariants.yaml` | Provider 状态机 YAML 不变量 |
| 25 | `skillrunner-provider-state-machine-ssot.md` | SkillRunner Provider 状态机 SSOT |
| 26 | `test-suite-governance.md` | 测试套件治理 |
| 27 | `test-taxonomy-domain-map.md` | 测试分类域映射 |
| 28 | `transport.md` | 传输组件（中文） |
| 29 | `ui-render-caveats.md` | UI 渲染与环境限制（中文） |
| 30 | `ui-shell.md` | UI Shell 组件（中文） |
| 31 | `workflow-hook-helpers.md` | Workflow Hook Helpers API 参考 |
| 32 | `workflow-settings-single-source-submit-flow-ssot.md` | Workflow 设置 SSOT 提交流程 SSOT（中文） |
| 33 | `workflows.md` | Workflow 组件（中文） |
| 34 | `zotero-host-capability-broker-ssot.md` | Zotero 主机能力代理 SSOT |
| 35 | `zotero-mcp-service-design.md` | Zotero MCP 服务设计 |

### 9.3 `doc/synthesis-layer/`（15 个）

| # | 文件名 | 主题 |
|---|--------|------|
| 36 | `README.md` | 综合层文档入口 |
| 37 | `concepts.md` | 概念知识库 |
| 38 | `domain-model.md` | 综合领域模型 |
| 39 | `glossary.md` | 综合术语表 |
| 40 | `library-ssot-and-sidecar-cache.md` | 库 SSOT 与边车缓存 |
| 41 | `performance-and-scale.md` | 性能与规模 |
| 42 | `persistence-and-files.md` | 持久化与文件 |
| 43 | `reference-resolution.md` | 引用解析策略 |
| 44 | `registry-and-citation-graph.md` | 注册表与引文图 |
| 45 | `runtime-and-rebuild.md` | 运行时与缓存刷新 |
| 46 | `sequences.md` | 综合序列图 |
| 47 | `state-machines.md` | 综合状态机 |
| 48 | `topics-and-discovery.md` | 主题与发现 |
| 49 | `workbench-ui.md` | 综合工作台 UI |
| — | `contracts/invariants.yaml` | 综合不变量 YAML |
| — | `contracts/states-and-events.yaml` | 综合状态与事件 YAML |

---

*本文档生成于 2026-06-11，基于 commit 1312727 的代码分析。*
