# Zotero-Skills 代码审查报告

> 审查日期：2026-06-12
> 审查范围：宏观架构、代码组织规范性、可维护性、可拓展性

---

## 一、项目概览

| 指标 | 数据 |
|------|------|
| src/ 下 `.ts` 文件总数 | 224 |
| src/ 总代码量 | **5,147 KB** (≈ 5.0 MB) |
| 文件 > 50KB | **23 个** |
| 文件 > 100KB | **7 个** |
| 文件 > 200KB | **3 个** |
| 最大文件 | `synthesis/service.ts` — **602 KB** |
| Barrel (index.ts) 文件 | 仅 2 个 |

### 代码量分布

| 目录 | 文件数 | 大小 | 占比 |
|------|--------|------|------|
| `modules/` (非 synthesis) | 122 | 2,391 KB | 46.5% |
| `modules/synthesis/` | 25 | 1,568 KB | 30.5% |
| src 根文件 (含 synthesisWorkbenchApp) | 6 | 524 KB | 10.2% |
| `workflows/` | 12 | 180 KB | 3.5% |
| 其他 (providers, utils, backends 等) | 59 | 485 KB | 9.3% |

> [!CAUTION]
> `modules/` + `modules/synthesis/` 共占 **77%** 的代码量（3,959 KB），是一个显著的技术债务风险点。

---

## 二、关键发现

### 🔴 严重 — 巨型文件问题

项目中存在多个**极端超大文件**，远超合理阈值（建议单文件 < 500 行 / 15KB）：

| 文件 | 大小 | 估算行数 | 问题性质 |
|------|------|----------|----------|
| [service.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/synthesis/service.ts) | 602 KB | ~19,000 | 🔴 God Object — 单一 service 类/模块包含 Synthesis 的全部业务逻辑 |
| [synthesisWorkbenchApp.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/synthesisWorkbenchApp.ts) | 441 KB | ~14,790 | 🔴 巨型 UI — 484+ 函数定义，8+ 渲染表面 |
| [repository.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/synthesis/repository.ts) | 260 KB | ~8,000 | 🔴 巨型持久化层 — Repository 包含过多职责 |
| [skillRunnerLocalRuntimeManager.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/skillRunnerLocalRuntimeManager.ts) | 148 KB | ~4,700 | 🔴 本地运行时管理全部放在一个文件 |
| [uiModel.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/synthesis/uiModel.ts) | 135 KB | ~4,300 | 🟠 UI model 过大 |
| [acpSkillRunnerOrchestrator.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/acpSkillRunnerOrchestrator.ts) | 108 KB | ~3,400 | 🟠 编排器职责过重 |
| [zoteroMcpProtocol.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/zoteroMcpProtocol.ts) | 105 KB | ~3,300 | 🟠 MCP 协议实现放在单文件 |
| [acpSkillRunStore.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/acpSkillRunStore.ts) | 96 KB | ~3,000 | 🟠 存储层过大 |
| [skillRunnerRunDialog.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/skillRunnerRunDialog.ts) | 94 KB | ~2,900 | 🟠 对话框 UI + 业务逻辑混合 |
| [taskManagerDialog.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/taskManagerDialog.ts) | 89 KB | ~2,800 | 🟠 同上 |
| [referenceMatcher.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/synthesis/referenceMatcher.ts) | 83 KB | ~2,600 | 🟠 匹配算法可拆分 |
| [skillRunnerCtlBridge.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/skillRunnerCtlBridge.ts) | 82 KB | ~2,600 | 🟠 控制桥接过大 |
| [skillRunnerTaskReconciler.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules/skillRunnerTaskReconciler.ts) | 82 KB | ~2,600 | 🟠 任务调和器过大 |

> [!IMPORTANT]
> **最严重的单点**：`synthesis/service.ts` 达到 **602 KB** — 这在任何项目中都是极为罕见的超大文件。作为对比，许多成熟开源项目整个 src/ 的总量可能也不到 600 KB。这个文件本身就构成了一个严重的可维护性风险。

#### `synthesisWorkbenchApp.ts` 结构详析

这个 441KB / 14,790 行的文件是一个独立的前端应用，通过 Zotero 的 browser 元素嵌入，与插件通过 `postMessage` 通信。其内部结构：

| 行范围 | 内容 | 说明 |
|--------|------|------|
| 1–625 | 类型定义 + 状态声明 | Snapshot, GraphNode, SynthesisTab 等 |
| 626–1142 | 工具/辅助函数 | i18n, 操作追踪, 乐观 UI |
| 1143–1560 | DOM helpers | `el()`, `clear()`, `badge()`, `renderEmptyState()` |
| 1561–14589 | **渲染函数**（主体） | ~13,000 行，覆盖 8+ 个 surface（home, topics, index, review, graph, tags, concepts, reader） |
| 14590–14790 | 事件监听 + 初始化 | `window.addEventListener("message", ...)` |

**共计 484+ 个 `function` 定义**。整个文件是同步渲染驱动的，通过 message passing 接收数据。

> [!NOTE]
> 这个巨型文件**部分是架构约束导致的**：Zotero browser 嵌入模型下不能使用标准模块 import，需要产出单文件。但可以考虑**构建时拆分 + bundler 合并**的策略：开发时拆分为多个源文件，构建时打包为单文件输出。

---

### 🔴 严重 — `modules/` 扁平化 "抽屉" 问题

[modules/](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/modules) 目录包含 **122 个文件**，除 `synthesis/`、`workflowExecution/`、`tagVocabulary/`、`harness/` 四个子目录外，其余文件全部扁平堆放在同一层级。

**具体问题**：

1. **命名前缀充当伪目录**：大量文件通过命名前缀来表示逻辑分组，但缺乏真正的目录结构：
   - `acp*` 前缀：20+ 个文件（acpSessionManager, acpSkillRunStore, acpConnectionAdapter...）
   - `skillRunner*` 前缀：15+ 个文件（skillRunnerLocalRuntimeManager, skillRunnerRunDialog...）
   - `hostBridge*` 前缀：10+ 个文件
   - `workflow*` 前缀：13+ 个文件
   - `dashboard*` / `task*` 前缀：5+ 个文件
   - `synthesisWorkbench*` 前缀：4 个文件

2. **缺少子目录封装**：这些逻辑分组应该各自成为独立子目录，拥有清晰的对外 API（index.ts / barrel）。当前只有 `handlers/` 和根 `src/` 有 barrel 文件。

3. **发现困难**：新开发者面对 122 个平铺文件无法快速理解模块边界。

**建议的目录重组**：

```
src/modules/
├── acp/                    # ACP 协议相关（~20 files）
│   ├── session/
│   ├── skill-run/
│   └── connection/
├── skill-runner/           # SkillRunner 后端（~15 files）
│   ├── local-runtime/
│   ├── task-reconciler/
│   └── dialogs/
├── host-bridge/            # Host Bridge 服务（~10 files）
├── mcp/                    # MCP 服务端（zoteroMcpProtocol + zoteroMcpServer）
├── synthesis/              # ✅ 已有子目录，但内部仍需拆分
├── dashboard/              # 面板/仪表盘
├── workflow-settings/      # 工作流设置
├── persistence/            # 持久化（runtime + plugin state）
└── shared/                 # 共享工具（debugMode, selectionContext...）
```

---

### 🟡 中等 — `hooks.ts` 膨胀与职责越界

[hooks.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/hooks.ts)（34 KB，1085 行）作为生命周期调度中心，存在以下问题：

1. **导入爆炸**：前 106 行全部是 import 语句，从 **50+ 个不同模块** 导入功能。这反映了缺少模块聚合层（barrel/facade）。

2. **`onPrefsEvent` 成为巨型 switch-case 路由**（L545-L1061，超过 500 行）：这个函数本质上是一个手动的事件分发路由，包含 **40+ 个 case 分支**，涵盖：
   - 工作流扫描、后端管理、任务管理器
   - Sidebar 操作（`openSkillRunnerSidebar`、`openAcpSidebar`、`toggleSkillRunnerSidebar`）
   - Host Bridge 全套操作（LAN、端口、token 旋转、master token、CLI 安装、profile 拷贝）
   - MCP 服务器启停（`stateMcpServer`、`setMcpServerEnabled`）
   - SkillRunner 本地运行时部署/卸载
   - 持久化治理（扫描、清理）
   - Synthesis 数据库重置

   > [!WARNING]
   > 每新增一个偏好设置操作，就需要在这个巨型 switch 中添加 case。这违反了开闭原则（OCP），是扩展性瓶颈。更重要的是，许多 case 分支中包含 10-30 行业务逻辑（构建 backend 元数据映射、组装响应对象、多步异步操作与错误处理），违反了文件自身 L1072 的注释："*Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.*"

3. **业务逻辑泄露**：`reconcileSkillRunnerBackendsOnStartup()`（L210-L232）、`prewarmSynthesisWorkbenchAfterStartup()`（L248-L253）等函数直接在 hooks.ts 中定义，而不是委托给对应模块。

4. **测试 seam 暴露**：`setSkillRunnerStartupBackendReconcileRunnerForTests`（L237-L242）直接在 hooks.ts 中暴露可变的全局状态用于测试注入，说明 hooks 和具体实现之间的边界不够清晰。

**建议**：
- 将 `onPrefsEvent` 重构为基于注册的命令分发系统，各模块自行注册处理器
- 将 startup 相关的调和逻辑移至对应模块的 `onStartup()` 方法
- 引入 facade 层减少 import 数量

---

### 🟡 中等 — 缺少统一的事件/消息系统

整个 `src/` 中**没有使用任何正式的事件系统**（无 EventEmitter、EventTarget、pub/sub、Observer 模式）。组件间通信完全依赖直接函数调用。

**现有通信模式**：

| 模式 | 使用场景 | 评价 |
|------|----------|------|
| 直接函数调用 | 绝大多数模块间交互 | 紧耦合，122+ 模块互相直接 import |
| Callback | jobQueue 的 `onJobUpdated`/`onJobProgress` | 局部使用，未推广 |
| `postMessage` | workspaceApp ↔ host iframe 通信 | 仅限 UI 层 |
| 通知函数 | `notifySynthesisWorkbenchSidecarChanged()` 等 | 仅 2 处，不成体系 |
| 结构化日志 | `appendRuntimeLog()` | Provider 层使用良好 |

**影响**：
- 跨切面关注点（如"工作流执行完成"、"后端状态变化"）需要通过直接 import 链传递，而非松耦合的事件订阅
- 新模块添加通知时必须修改已有代码（违反 OCP）
- 调试跨模块交互困难，缺少可追踪的事件流

**建议**：引入轻量事件总线（不需要完整的 EventEmitter），至少为以下场景提供统一的事件发布/订阅：
- 工作流生命周期（started / completed / failed）
- 后端连接状态变化
- 任务状态变化
- 偏好设置变更通知

---

### 🟡 中等 — `Addon` 类设计问题

[addon.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/addon.ts) 的 `Addon` 类通过 `data` 属性存储大量运行时状态：

```typescript
class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    locale?: { current: any };
    prefs?: { window: Window };
    workflow?: { workflowsDir: string; loaded: LoadedWorkflows };
    workflowEditorHost?: { open: ...; registerRenderer: ...; unregisterRenderer: ... };
    workflowDebugProbe?: { run: ... };
    dialog?: DialogHelper;
  };
  public hooks: typeof hooks;
  public api: object;  // ← 空对象，从未使用
}
```

**问题**：
1. `data` 是一个松散的属性包，随着功能增长不断膨胀
2. `api: object` 声明为空对象且未使用
3. 可选属性过多（`workflow?`, `workflowEditorHost?`, `workflowDebugProbe?`, `dialog?`），各模块通过全局 `addon.data.xxx` 进行松散通信
4. 某些属性使用 `any` 类型（`locale.current: any`）

---

### 🟡 中等 — 错误处理模式不一致

项目中的错误处理缺乏统一策略，存在**大规模的静默错误吞没**：

1. **空 catch 块泛滥**：全 `src/` 范围内发现 **331+ 处 `} catch {}` 空 catch 块**。高频出现在：
   | 文件 | 空 catch 数 |
   |------|------------|
   | `skillRunnerLocalRuntimeManager.ts` | 多处 |
   | `skillRunnerTaskReconciler.ts` | 多处 |
   | `backendManager.ts` | 5 |
   | `acpConversationStore.ts` | 5 |
   | `builtinWorkflowSync.ts` | 4 |
   | `acpSessionManager.ts` | 3 |
   | `hooks.ts` | 2 |

   > [!CAUTION]
   > 331+ 处空 catch 意味着大量错误被完全静默，隐藏潜在 bug 的风险极高。

2. **`.catch(() => undefined)` 模式**：出现在 7 个文件中，用于 fire-and-forget 异步操作。

3. **`typeof console !== "undefined"` 防御**：在 hooks.ts 中出现 **10+ 次**。如果运行环境可能没有 console，应该有一个统一的日志工具处理兼容性，而不是每次手动检查。

4. **混合的错误处理风格**：
   - ✅ `providers/registry.ts`：使用 `appendRuntimeLog()` 进行结构化日志 — **最佳实践**
   - ✅ `requestContracts.ts`：自定义 `ProviderRequestContractError` 类，含 category/reason — **良好**
   - ❌ 其他多数模块：console.warn 或空 catch — **不一致**

5. **结果对象模式（不一致）**：`onPrefsEvent` 中的许多 case 返回 `{ ok: boolean, stage: string, message: string, details?: ... }` 格式的结果对象，但这个模式没有定义为类型，也没有在所有 case 中一致使用。

---

### 🟡 中等 — Provider/Backend 抽象设计良好但一致性不足

**正面**：Provider 架构设计合理，包含清晰的分层：
- [types.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/providers/types.ts)：定义了 `Provider` 接口
- [contracts.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/providers/contracts.ts)：请求/响应类型（7 种 request kind）
- [requestContracts.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/providers/requestContracts.ts)：多层契约验证（kind → backend 兼容性 → provider 兼容性 → payload 结构）
- [registry.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/providers/registry.ts)：Provider 注册与分发

**四个 Provider 实现**：

| Provider | 目录 | 大小 | Backend 类型 |
|----------|------|------|-------------|
| `SkillRunnerProvider` | `providers/skillrunner/` (7 files) | ~107 KB | `skillrunner` |
| `AcpProvider` | `providers/acp/` (1 file) | 9 KB | `acp` |
| `GenericHttpProvider` | `providers/generic-http/` (1 file) | 26 KB | `generic-http` |
| `PassThroughProvider` | `providers/pass-through/` (1 file) | 3 KB | `pass-through` |

**问题**：
1. **类型定义分散**：Provider 相关类型分布在 `types.ts`、`contracts.ts`、`requestContracts.ts` 三个文件，边界不够明确。`contracts.ts` 实际包含的是 request/result 类型定义（应该叫 `requestTypes.ts`），而 `requestContracts.ts` 包含的是运行时断言逻辑。
2. **Backend 与 Provider 的关系隐含**：`BackendInstance.type` 字段的值与 `Provider.id` 的映射关系在代码中通过字符串匹配实现，而非类型系统保障。
3. **Provider 规模不平衡**：SkillRunner Provider 有 7 个文件 / 107KB，其他三个各只有 1 个文件。SkillRunner 子目录可能需要进一步模块化。
4. **Transport 层缺失**：HTTP 逻辑直接嵌入各 Provider 内部。[transport.md](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/doc/components/transport.md) 文档中明确说明这是有意推迟的设计，当前可接受。

---

### 🟡 中等 — 配置管理分散

偏好设置和配置分散在多个位置，缺乏统一的校验层：

| 配置来源 | 位置 | 说明 |
|----------|------|------|
| 编译期常量 | [config/defaults.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/config/defaults.ts) (33 行) | 仅 backend type 常量和默认 request kind 映射 |
| 运行时偏好 | [utils/prefs.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/utils/prefs.ts) (69 行) | 34 个类型化 pref key，包裹 `Zotero.Prefs.get/set/clear` |
| 默认偏好值 | `addon/prefs.js` | Zotero 默认 pref 值声明 |
| JSON 序列化存储 | 各模块通过 prefs 存储 JSON | `backendsConfigJson`, `runtimeLogsJson`, `skillRunnerRequestLedgerJson` 等 |

> [!WARNING]
> 大量复杂对象（后端配置、运行时日志、任务账本）被 JSON 序列化后存入 Zotero prefs，但**没有统一的 schema 校验机制**来防止数据格式损坏。只有加载时的逐字段 normalize 逻辑分散在各个模块中。

---

### 🟢 正面 — Workflow 插件系统

[workflows/](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/workflows) 是项目中设计最出色的子系统，构成了真正的插件架构：

**架构亮点**：
- **声明式清单**：用户编写 JSON manifest（`workflow.json`），声明 `id`, `label`, `provider`, `parameters`, `inputs`, `execution`, `request`, `hooks`
- **参数系统**：支持 string/number/boolean 类型，`enum`/`allowCustom`/`optionsSource` 枚举源，`visible_if` 条件可见性
- **4 种 Hook 类型**：`filterInputs`、`buildRequest`、`normalizeSettings`、`applyResult`
- **3 种执行模式**：`precompiled-host-hook`（预编译 .mjs）、`legacy-text-loader`（文本转换）、`node-native-module`（ESM import）
- **包格式**：`workflow-package.json` 支持多工作流共享代码的包分发
- **Rich Host API**（版本 5）：提供 items / context / library / prefs / handlers / file / editor / images / notifications / logging / synthesis 全套宿主能力
- **结构化诊断**：`manifest_parse_error`, `hook_missing_error` 等分类错误

**美中不足**：工作流相关逻辑也分布在 `modules/` 中（`workflowSettings.ts`, `workflowSettingsDialog.ts`, `workflowMenu.ts`, `workflowEditorHost.ts`, `workflowRuntime.ts` 等 13+ 个文件），没有汇聚到 `workflows/` 目录下。

---

### 🟢 正面 — 测试基础设施

测试目录结构组织良好，覆盖面广：

```
test/
├── core/              # 132 个测试文件（主套件）
├── ui/                # 13 个测试文件
├── node/core/         # 12 个 Node 环境测试
├── setup/             # 测试基础设施
├── fixtures/          # 测试固件
├── mock-skillrunner/  # Mock 服务
├── zotero/            # 11 个 Zotero 测试基础设施文件
└── workflow-*/        # 8 个按工作流分组的测试目录
```

**测试特性**：
- 支持 Zotero 环境和 Node 环境双重测试
- lite / full 两级粒度，CI gate 区分 PR 和 release
- Synthesis 有独立的不变量测试（`test:synthesis:invariants` 脚本）
- 共享测试文件模式（如 `70-*.shared.ts` + `70a-`/`70b-`/`70c-` 分片）

**值得注意的大型测试文件**：
| 测试文件 | 大小 |
|----------|------|
| `107-acp-skillrunner-compatible-runner.test.ts` | 190 KB |
| `125-synthesis-tab-ui.test.ts` | 170 KB |
| `129-synthesis-layer-integration.test.ts` | 137 KB |
| `97-acp-ui-smoke.test.ts` | 119 KB |
| `96-acp-session-manager.test.ts` | 82 KB |

**测试覆盖盲区**：
- `hooks.ts` 的 `onPrefsEvent` 巨型 switch 分发逻辑未见专门测试
- 配置 JSON 序列化 / 反序列化的校验逻辑未见专门测试

---

### 🟢 正面 — 构建与工具链

- TypeScript 配置继承自 `zotero-types` 的沙箱配置，确保类型安全
- ESLint 使用 `@zotero-plugin/eslint-config` 标准配置
- Prettier 配置合理（80 列宽度，LF 换行）
- 脚本命令丰富（25+ 个 npm scripts），覆盖开发、测试、检查、文档等场景
- 多个质量检查脚本：`check:builtin-workflow-manifest`、`check:localization-governance`、`check:ssot-invariants`、`check:host-bridge-doc-sync`

---

### 🟢 正面 — Schema 验证与文档同步

- 工作流定义有详尽的 [workflow.schema.json](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/schemas/workflow.schema.json)（600 行，JSON Schema 2020-12，含条件验证规则）
- 选区上下文有独立的 [selectionContextSchema.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/schemas/selectionContextSchema.ts)
- 工作流包索引有 [workflow-package.schema.json](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/schemas/workflow-package.schema.json)
- 架构文档（`doc/`）与实际实现保持良好的同步——包括对已知技术债务（如 transport 层推迟）的明确记录

---

### 🟢 正面 — 国际化

- 使用 Mozilla **Fluent** (`.ftl`) 作为本地化格式（Zotero/Firefox 原生格式）
- 支持 4 种语言：en-US、zh-CN、fr-FR、ja-JP
- en-US 的 `addon.ftl` 达 64KB / 1185 行，覆盖面广
- [locale.ts](file:///d:/Workspace/Code/JavaScript/Zotero-Skills/src/utils/locale.ts) 提供类型安全的 `getString()` API，使用 `FluentMessageId` 类型做编译期键名检查
- `localizationGovernance.ts` 有额外的本地化治理检查

---

## 三、架构风险矩阵

| 风险维度 | 严重程度 | 描述 |
|----------|----------|------|
| 文件大小 | 🔴 高 | 3 个文件 > 200KB，23 个文件 > 50KB，远超行业最佳实践 |
| 模块边界 | 🔴 高 | modules/ 扁平化严重，缺少子模块封装 |
| 单一职责 | 🔴 高 | synthesis/service.ts (600KB) 是典型的 God Object |
| 事件系统 | 🟡 中 | 完全没有 pub/sub，122+ 模块直接 import 耦合 |
| 事件分发 | 🟡 中 | hooks.ts onPrefsEvent 40+ 分支的巨型 switch-case |
| 错误处理 | 🟡 中 | 331+ 空 catch 块，缺乏统一策略 |
| 配置管理 | 🟡 中 | JSON 序列化 prefs 无 schema 校验 |
| 类型安全 | 🟡 中 | 存在 `any` 类型和松散属性包 |
| 命名一致性 | 🟢 低 | 命名前缀一致，但应转化为目录结构 |
| 扩展性 | 🟢 低 | Provider/Workflow 系统设计优秀 |
| 测试覆盖 | 🟢 低 | 测试基础设施完善，覆盖面广 |
| 文档同步 | 🟢 低 | 架构文档与实现保持同步 |
| 国际化 | 🟢 低 | Fluent 格式，4 语言，类型安全 |

---

## 四、改进建议优先级

### P0 — 紧急（阻碍日常开发效率）

1. **拆分 `synthesis/service.ts`**（602 KB）
   - 按领域拆分为多个 service 文件：`topicService.ts`, `paperService.ts`, `tagService.ts`, `exportService.ts`, `syncService.ts` 等
   - 使用 facade 模式保持对外统一接口

2. **拆分 `synthesisWorkbenchApp.ts`**（441 KB）
   - 引入构建时 bundler：开发时按 surface（home, topics, index, review, graph, tags, concepts, reader）拆分为独立源文件，构建时合并为单文件输出
   - 分离类型定义、DOM helpers、i18n 辅助、渲染函数为独立模块

3. **拆分 `synthesis/repository.ts`**（260 KB）
   - 按实体拆分：topicRepository, paperRepository, tagRepository 等

### P1 — 重要（影响可维护性和团队协作）

4. **重组 `modules/` 目录结构**
   - 将 `acp*`, `skillRunner*`, `hostBridge*`, `workflow*`, `dashboard*` 前缀的文件移入对应子目录
   - 为每个子目录添加 barrel 文件（index.ts）
   - 逐步减少 hooks.ts 的直接导入数

5. **重构 `hooks.ts` 的 `onPrefsEvent`**
   - 改为基于注册的命令分发系统
   - 各模块自行注册命令处理器
   - 定义统一的命令返回类型 `{ ok: boolean; stage: string; message: string; details?: Record<string, unknown> }`

6. **拆分其他 100KB+ 文件**
   - `skillRunnerLocalRuntimeManager.ts`（148 KB）
   - `acpSkillRunnerOrchestrator.ts`（108 KB）
   - `zoteroMcpProtocol.ts`（105 KB）

7. **引入轻量事件总线**
   - 替代跨模块直接函数调用的部分场景
   - 优先覆盖：工作流生命周期、后端状态变化、任务状态通知

### P2 — 改善（提升代码质量）

8. **治理空 catch 块**
   - 审计 331+ 处空 catch，分类为"可接受的静默"和"应该记录的错误"
   - 创建 `utils/logger.ts` 封装 console 兼容性和结构化日志
   - 推广 Provider 层的 `appendRuntimeLog()` 模式到其他模块

9. **统一结果类型**
   - 定义 `OperationResult<T>` 类型替代松散的 `{ ok, stage, message }` 对象
   - 在 `onPrefsEvent` 和模块公开 API 中统一使用

10. **清理 `Addon` 类**
    - 移除未使用的 `api: object`
    - 考虑引入依赖注入 / 服务定位器替代全局 `addon.data.xxx` 通信

11. **类型安全增强**
    - 消除 `any` 类型使用
    - 将 Backend type 字符串转为 union 枚举
    - 为序列化 prefs JSON 添加加载时的 schema 校验

---

## 五、总结

**项目在核心架构设计上有很好的基础**：Provider/Backend 分离、Workflow 插件系统（设计优秀，堪称项目亮点）、声明式 Schema 验证、结构化测试套件、完善的国际化等都体现了良好的设计意识和工程水准。架构文档也与实现保持了同步。

但随着功能——特别是 Synthesis 子系统（3 个文件 1.3 MB）和 ACP/SkillRunner 集成——的快速增长，**代码组织没有跟上功能增长的步伐**。主要表现为：
- 巨型文件失控（23 个 > 50KB，最大 602 KB）
- `modules/` 扁平化严重（122 个文件平铺）
- 事件分发依赖巨型 switch-case
- 大量静默错误吞没（331+ 空 catch）
- 缺少统一的事件系统

最关键的改善路径是：**Synthesis 子系统拆分** → **modules/ 目录重组** → **hooks.ts 分发重构** → **错误处理治理**。前两步是所有后续改进的前提。
