# 工作流引擎与宿主适配 · 只读侦察报告

- 仓库：`/home/joshua/Workspace/Code/JavaScript/zotero-agents`
- 范围：`src/workflows/`（26 文件 / 16,010 行）、`src/modules/workflow/`（25 文件 / 14,900 行）、`src/modules/workflowExecution/`（23 文件 / 9,412 行）、`workflows_builtin/`（163 文件）、`skills_src/`（87 文件）、`skills_builtin/`（273 文件）
- 方法：只读。`read` / `rg` / `ls` / `wc` / `codegraph explore`；未修改任何既有文件，未执行 git 写、安装、构建或测试。
- 标注约定：**事实**＝有 `路径:行号` 或 `路径:符号` 支撑；**推测**＝明确写出"推测"。所有行号基于侦察时磁盘状态（文件 mtime 2026-09-16 前后）。
- 配套子报告（同目录，内容包与测试章节的完整版）：`_scout-content-packages.md`（324 行）、`_scout-workflow-tests.md`（129 行）。本报告已吸收并**抽样复核**其关键事实（renderer 路径、`content-package.version.json`、`pluginSkillRegistry` 的 `runner.json` 硬要求、各包文件数）。

---

## 1. 职责与边界

### 1.1 引擎负责什么（事实）

`src/workflows/` 是**通用工作流引擎**，`src/modules/workflow/` 是**产品化外壳**（目录、注册表、设置、菜单），`src/modules/workflowExecution/` 是**执行 seam 实现**（准备 → 提交 → 运行 → 回写）。职责可归为 7 件事：

1. **扫描与加载**：`src/workflows/loader.ts:973 loadWorkflowManifests` 遍历工作流目录，识别"工作流包（`workflow-package.json`）"或"单工作流（`workflow.json`）"两种形态（`loader.ts:663 collectWorkflowCandidates`），产出 `LoadedWorkflows`。
2. **校验**：JSON Schema 校验 + 语义校验（`loaderContracts.ts:424 parseWorkflowManifestFromText`、`loaderContracts.ts:477 parseWorkflowPackageManifestFromText`、`loaderContracts.ts:411 resolveBuildStrategy`），并把问题规约为 `LoaderDiagnostic`（`loaderContracts.ts:19`），**加载失败按 warning 跳过单个工作流，不中断整次扫描**（`loader.ts:1086-1107`）。
3. **Hook 加载与隔离执行**：`loader.ts:738 loadHooks` 加载 4 个可选 hook；包内 hook 强制 `.mjs`（`loader.ts:766 assertPackageHookPath`）并在扫描期预编译打包（`loader.ts:237 importPrecompiledPackageHooksModule` + `packageHookBundler.ts:372 bundlePackageHookScript`），通过 `Services.scriptloader.loadSubScript` 注入受控 scope 执行（`loader.ts:276-301`）。
4. **宿主能力投影**：`src/workflows/hostApi.ts:98 createWorkflowHostApi` 组装并投影 Workflow Host API v12（`hostApi.ts:314` 起为显式对象字面量）。
5. **输入规划与请求构建**：`workflowInputPlanning.ts:1120 planWorkflowInput`、`runtime.ts:891 executeBuildRequests`（hook 优先，否则 `declarativeRequestCompiler.ts:651 compileDeclarativeRequest`）。
6. **Provider 编排**：`workflowExecution/runSeam.ts:473 runWorkflowExecutionSeam` 建队列、派发请求、收集进度、解析终态；`skillrunner.sequence.v1` 由 `sequenceRuntime.ts:1955 executeSkillRunnerSequence` 承担（ACP provider 明确拒绝自行执行该 kind：`src/providers/acp/provider.ts:211`）。
7. **结果收口**：`workflowExecution/resultContext.ts:442 createWorkflowResultContext` 解析 result.json/bundle/artifacts，`applySeam.ts:255 runWorkflowApplySeam` 调 `applyResult` hook 写回宿主。

配套：运行状态持久化（`sequenceStateStore.ts` → `pluginStateStore/runTables.ts`）、UI 反馈（`feedbackSeam.ts`）、目录与设置（`modules/workflow/`）。

### 1.2 "插件本体不含业务逻辑、业务逻辑由可插拔工作流包声明"如何成立（事实 + 推断）

三条机制共同保证：

**(a) 清单即业务声明，可纯声明式执行。**
`WorkflowManifest` 携带 `request`/`result`/`inputs`/`validateSelection`/`parameter` 等纯数据（`types.ts:2682-2704`）。当 manifest 无 `buildRequest` hook 但有 `request` 时，引擎走声明式编译：`loaderContracts.ts:411-421 resolveBuildStrategy` 返回 `"declarative"`，由 `declarativeRequestCompiler.ts:651` 生成 provider 请求。实例：`workflows_builtin/workflow-debug-probe/debug-apply-single-result/workflow.json` 只有 `request.kind = skillrunner.job.v1`，无声明式业务分支。

**(b) Hook 在包内、以受控 scope 外挂执行，宿主能力只有 Host API。**
- 包形态下 hook 必须是 `.mjs`（`loader.ts:766-777`），引擎把包内 `import` 图打成一个脚本（`packageHookBundler.ts:372`），在临时文件里用 `Services.scriptloader.loadSubScript(uri, scope)` 载入（`loader.ts:295-298`）。
- scope 只提供 `__zsHostApi`、`__zsHostApiVersion` 与标准 Web globals（`loader.ts:191-208 createHostHookScope`）；打包器把这二者提升为脚本头部变量（`packageHookBundler.ts:341-342`）。
- 因此包内 hook 拿不到 `Zotero`、`addon` 或其他插件内部对象，只能经 Host API 动作。执行模式被记录为 `precompiled-host-hook` / `legacy-text-loader` / `node-native-module`（`types.ts:3039-3043`），并按模式标注 `capabilitySource`（`runtime.ts:594-602`）。

**(c) 真业务执行在 Skill/Agent 侧，而非插件侧。**
`request.kind` 把活干交给后端：`skillrunner.job.v1` / `skillrunner.sequence.v1` / generic-http / pass-through（`types.ts:2617-2680`、`declarativeRequestCompiler.ts:1-20`）。序列步骤的 `skill_id` 指向 `skills_builtin/` 里的 skill 目录；插件只做编排与回写。

**推断（未在本次范围验证到位）**：`runtime.ts` 仍在插件内实现 hook 运行期（signal、leaf scope、diagnostics），以及 `workflowHostOwners.ts` 内的 research-bundle 物化/导入逻辑；这些是否属于"具体业务逻辑"取决于判据，但从代码看它们面向所有工作流通用（`workflowHostOwners.ts:547 createWorkflowResearchBundleImportApi`、`:1090 createWorkflowResearchBundleMaterializeApi`）。

### 1.3 插件 ↔ 工作流包协议：版本与兼容规则在哪定义（事实）

| 事项 | 定义位置 |
| --- | --- |
| Host API 版本数值 | `src/workflows/workflowHostContract.ts:54-55`（`version: ["value", 12]`）→ `:175 export const WORKFLOW_HOST_API_VERSION` |
| 再导出 | `src/workflows/hostApi.ts:51`、`src/workflows/workflowHostOwners.ts:101` |
| 能力清单（协议 SSOT） | `workflowHostContract.ts:54-173 WORKFLOW_HOST_API_MANIFEST` |
| 编译期双向精确匹配断言 | `workflowHostContract.ts:198-203 _WorkflowHostManifestMatchesApi`（配合 `:41 WorkflowHostBidirectionalExact`） |
| 运行时结构检查器 | `workflowHostContract.ts:244 inspectWorkflowHostCandidate`、`:329 inspectWorkflowHostContractVariants`、`:424 inspectWorkflowHostContract` |
| 版本解析（显式 override › hostApi.version › 当前投影） | `workflowHostContract.ts:387 resolveWorkflowHostContractVersion` |
| 错误契约 | `src/workflows/workflowHostErrorContract.ts:8 WORKFLOW_HOST_ERROR_SCHEMA = "zotero-agents.workflow-host-error.v1"` |
| 内容包级兼容门禁 | `src/modules/workflow/catalog/contentPackageSubscription.ts:316 ContentPackageIncompatibility`、`:206 CONTENT_API_VERSION = "3.0.0"`、判定 `:702-750` |

**关键事实（也是疑点 9.1 的证据）**：`inspectWorkflowHostContract` / `inspectWorkflowHostContractVariants` 在生产 `src/` 中**没有任何调用者**，只有测试引用（`tests/workflows/187-workflow-host-contract-governance.test.ts:7-8,181,441`）。生产路径里唯一被调用的契约函数是 `summarizeWorkflowHostApiCapabilities`（`loader.ts:228`、`runtime.ts:648`、`modules/workflow/ui/workflowDebugProbe.ts:173`），它只产出布尔摘要用于诊断日志，**不会**因缺失能力或版本不一致而拒绝加载。

**结果**：兼容性在三层分别成立——(1) 编译期 TypeScript 精确匹配断言；(2) 内容包 semver 门禁（plugin / content_api / zotero，`contentPackageSubscription.ts:702-750`）；(3) 测试治理。**工作流包自身无法声明"我要求 Host API vN"**：`src/schemas/workflow.schema.json` 的 `properties` 中没有 `hostApiVersion`，`WorkflowManifest`（`types.ts:2682-2704`）也没有该字段；`WorkflowRuntimeContext.hostApiVersion`（`types.ts:2846`）只由引擎写入（`runtime.ts:738`，或调用方 override `runtime.ts:451`）。

---

## 2. 文件地图

### 2.1 `src/workflows/`（26 文件 / 16,010 行）

| 文件 | 行数 | 角色（一句话） |
| --- | --- | --- |
| `types.ts` | 3080 | 引擎全部 DTO/接口/hook 签名/清单类型的唯一类型源。 |
| `workflowHostOwners.ts` | 1453 | Host API 的"owner"实现层：leaf scope、capability broker 工厂、live-read 适配、research bundle 物化/导入、addon/environment owner。 |
| `runtime.ts` | 1294 | Hook 执行引擎：hook runtime context、signal 链接、leaf scope 包裹、`executeBuildRequests` / `executeApplyResult` 编排、诊断发射。 |
| `workflowInputPlanning.ts` | 1251 | 输入规划 v2：候选筛选、分组、单元切分、选择校验（菜单/执行/handoff 三模式）。 |
| `loader.ts` | 1153 | 目录扫描、包/单工作流候选收集、hook 加载与预编译、内容摘要、`LoadedWorkflows` 装配。 |
| `archive.ts` | 842 | `archive` host 能力实现（测量条目、原子写 zip、解包执行）。 |
| `workflowNoteImagePreparation.ts` | 801 | `images.prepareForNoteEmbedding` 实现（缩放、压缩、格式转换、诊断）。 |
| `declarativeRequestCompiler.ts` | 704 | 声明式请求编译：manifest `request` → provider 请求（skillrunner job/sequence、generic-http、pass-through）。 |
| `hostApi.ts` | 687 | Workflow Host API v12 的显式组合与投影（member-level，仅此一处组装）。 |
| `loaderContracts.ts` | 595 | Manifest JSON Schema 校验、语义校验、provider 归一化、`LoaderDiagnostic` 工厂/排序。 |
| `workflowHostErrorContract.ts` | 579 | Host 错误 schema、错误码/详情白名单、strict-JSON 断言、`assertWorkflowCallNotCanceled`。 |
| `file.ts` | 541 | `file` host 能力实现（读写/拷贝/移动/删除/stat/list/picker）。 |
| `workflowHostContract.ts` | 471 | 协议清单、版本常量、结构/能力/版本一致性检查器。 |
| `packageHookBundler.ts` | 432 | 把包内 `.mjs` hook 及其依赖打包成单脚本（带指纹缓存），供 scope 执行。 |
| `bibliography.ts` | 399 | `bibliography` host 能力实现（格式列表、渲染）。 |
| `localization.ts` | 331 | 工作流显示文案本地化、core 工作流判定、显示排序。 |
| `clipboard.ts` | 234 | `clipboard` host 能力实现（交互模式约束）。 |
| `workflowStoredAttachmentImport.ts` | 226 | stored attachment 的校验、managed staging（创建 attachment 前完成）。 |
| `zipBundleReader.ts` | 208 | `ZipBundleReader`：结果 bundle 的 zip 读取（供 resultContext）。 |
| `zoteroHostAccessOptions.ts` | 171 | `zoteroHostAccess` run option 归一化、`autoApproveWrites`/`required` 解析、SkillRunner runtime option 剥离兼容开关。 |
| `workflowInputMaterialization.ts` | 152 | 工作流输入物化为本地文件 + `createWorkflowInputMaterializer` scope 绑定。 |
| `workflowLoggingOwner.ts` | 150 | `logging.appendRuntimeLog` owner（绑定 workflowId/packageId）。 |
| `manifestContract.ts` | 114 | Manifest → `WorkflowManifestContract` 投影、provider↔backend 兼容类型推导。 |
| `errorMeta.ts` | 83 | hook 失败元信息附着/读取与错误摘要（capabilitySource、executionMode）。 |
| `helpers.ts` | 50 | `HookHelpers` 工厂（resolveItemRef、basename、toHtmlNote、generated note readiness）。 |
| `triggerPolicy.ts` | 9 | 选择必需性策略（`canWorkflowRunWithoutSelection` / `requiresWorkflowSelection`）。 |

### 2.2 `src/modules/workflow/`（25 文件 / 14,900 行）

**`productionExecution.ts`（1 文件 / 58 行）** —— 生产依赖注入装配：把 `preparationSeam` / `runSeam` / `applySeam` / `submissionSeam` 的抽象依赖绑到真实实现（`productionExecution.ts:22/29/37/45/53`）。

**`catalog/`（9 文件）**

| 文件 | 角色 |
| --- | --- |
| `workflowRuntime.ts` | 注册表状态机：目录解析（默认/官方/开发本地/用户）、`rescanWorkflowRegistry`、多来源合并优先级、skill 依赖过滤、状态文件写出。 |
| `builtinWorkflowSync.ts` | 内置工作流同步（启动时把随包内容落到官方目录）与同步结果诊断。 |
| `contentPackageSubscription.ts` | 内容包订阅：feed 解析、channel、semver 兼容门禁、下载/校验/解包/提升、安装状态持久化。 |
| `pluginSkillRegistry.ts` | skill 目录扫描与注册表（`skills_builtin` / 用户 `skills` 根、diagnostics）。 |
| `workflowProductStore.ts` | 工作流"产物"注册与存储（skill run feedback、`ProductStorageApi`）。 |
| `workflowPackageDiagnostics.ts` | 包/hook 运行期诊断发射（debug 门控、runtime capability 摘要）。 |
| `workflowRuntimeBridge.ts` | 运行期桥接安装（供非 catalog 路径访问注册表）。 |
| `workflowRequestKind.ts` | 由 manifest/请求解析 request kind。 |
| `workflowVisibility.ts` | `debug_only` 与非调试环境的可见性过滤。 |

**`settings/`（10 文件）**

| 文件 | 角色 |
| --- | --- |
| `backendManager.ts` | 后端配置管理对话框与持久化（最大文件，91 KB）、行级动作、ACP/SkillRunner 探针、`persistBackendsConfig`。 |
| `workflowSettings.ts` | 工作流设置读写 SSOT：pref 缓存、revision、`getWorkflowSettings`/`updateWorkflowSettings`、UI 描述符、执行上下文解析、参数 schema 本地化。 |
| `workflowSettingsDomain.ts` | 设置领域模型：`WorkflowSettingsDocument` v2、normalize、merge、参数校验、required 检查。 |
| `workflowSettingsDialog.ts` | 设置对话框（经典实现）。 |
| `workflowSettingsWebDialog.ts` | 设置对话框（Web/HTML 实现）。 |
| `workflowSettingsDialogModel.ts` | 对话框视图模型/初始状态。 |
| `workflowSettingsNormalizer.ts` | `normalizeSettings` hook 的持久化期/执行期调用封装。 |
| `workflowSettingsOptionLocalization.ts` | 参数选项本地化。 |
| `workflowParameterOptions.ts` | 动态参数选项解析（optionsSource）。 |
| `genericHttpBackendPresets.ts` | generic-http 后端预设。 |

**`ui/`（5 文件）**

| 文件 | 角色 |
| --- | --- |
| `workflowExecute.ts` | 触发主流程：选择上下文快照 → 设置门 → 准备 → 去重守卫 → 提交 → 汇总通知（`executeWorkflowFromCurrentSelection:78`）。 |
| `workflowMenu.ts` | 菜单/统一入口与弹窗重建（`triggerWorkflowFromUnifiedEntry:233`、`rebuildWorkflowActionPopup:268`）。 |
| `workflowEditorHost.ts` | `editor.openSession` host 能力：编辑器渲染器注册、会话打开/桥接。 |
| `workflowDebugProbe.ts` | 调试探针：检查 host API 能力摘要与版本（`:173`、`:210`）。 |
| `selectionSample.ts` | 选择样本构造（设置门预览用）。 |

### 2.3 `src/modules/workflowExecution/`（23 文件 / 9,412 行）

| 文件 | 行数 | 角色 |
| --- | --- | --- |
| `sequenceRuntime.ts` | 2082 | `skillrunner.sequence.v1` 执行器：步骤循环、handoff 绑定、短路径、步骤级 apply、deferred/恢复、终态结果构建。 |
| `applySeam.ts` | 1172 | 回写 seam：逐 job 调 `applyResult` hook、apply 诊断归类、ACP/SkillRunner apply 状态同步、`WorkflowApplySummary` 汇总。 |
| `runSeam.ts` | 1053 | 运行 seam：建 `JobQueueManager`、派发 provider（单发/序列）、进度事件记录、终态观察、提交流程焦点。 |
| `preparationSeam.ts` | 968 | 准备 seam：选择/参数预览、输入规划、批量单元构建、`buildPreparedWorkflowUnitExecution`、SkillRunner host bridge env 注入。 |
| `sequenceStateStore.ts` | 874 | 序列运行状态持久化与事件状态机（`SequenceRunState` v2、`applySequenceRunEvent`、旧格式迁移）。 |
| `feedbackSeam.ts` | 621 | 用户反馈：toast/progress/通知 owner、开始/等待/完成摘要、去重。 |
| `resultContext.ts` | 589 | 结果上下文：result.json 定位与解析、bundle reader、artifact 解析、诊断警告。 |
| `duplicateGuardSeam.ts` | 370 | 重复输入守卫：按 input unit identity 跳过已在队列/运行中的单元。 |
| `terminalResolution.ts` | 327 | job 终态判定：本地终态 vs canonical（provider/apply 证据）终态级联、序列槽位状态。 |
| `submissionSeam.ts` | 262 | 提交 seam：提交队列入队、单元执行编排（build → run → apply）、单元结果分类。 |
| `artifactManifest.ts` | 200 | 输出 artifact manifest 校验（路径集合、诊断）。 |
| `workflowExecuteMessage.ts` | 190 | 面向用户的本地化消息构建（开始/等待/完成/失败）。 |
| `contracts.ts` | 185 | 各 seam 的公共类型（`WorkflowRunState`、`WorkflowJobOutcome`、`WorkflowApplySummary`、preflight 状态）。 |
| `bundleIO.ts` | 114 | 运行时文件读写/删除/临时目录的薄封装（统一走 runtimePersistence）。 |
| `messageFormatter.ts` | 92 | `WorkflowMessageFormatter` 实现（本地化文本）。 |
| `sequenceStepApply.ts` | 76 | 单个序列步骤的 applyResult 调用（把 apply 工作流包装为独立 job 语义）。 |
| `applyDiagnostics.ts` | 58 | apply hook 返回值的诊断规约（warning 数量上限、code 截断）。 |
| `resultEnvelope.ts` | 45 | 结果信封解包（`unwrapSkillRunnerResultJson`）。 |
| `acpSequenceStepLifecycle.ts` | 45 | ACP skill-run 的 apply 状态与 controller detach 适配器。 |
| `valuePath.ts` | 37 | dot-path 取值与原始值相等比较（短路径/handoff 判定用）。 |
| `requestMeta.ts` | 29 | 请求元信息：target parent ref、task name、input unit identity。 |
| `runConcurrency.ts` | 18 | 按 provider 解析派发并发度。 |
| `feedbackPolicy.ts` | 5 | `manifest.execution.feedback.showNotifications !== false` 策略。 |

---

## 3. 契约（`src/workflows/types.ts` 核心 DTO / 接口）

### 3.1 核心 DTO 分组（名称 + 用途，不给大段定义）

**JSON 与引用基元**
- `JsonValue` / `JsonObject` / `JsonPrimitive`（`:10-12`）——strict JSON 边界。
- `ResourceRef`（`:14`）——资源不透明引用。
- `StableIssueDto`（`:19`）——稳定问题码 DTO。
- `PortableItemRef` / `PortableCollectionRef` / `PortableSavedSearchRef`（`:42/:47/:52`）——可移植宿主引用（Host 公共输入只接受它们）。
- `NavigationLibraryViewRef` / `ReaderLocation` / `NavigationResult`（`:57/:68/:73`）——导航目标与结果。

**环境与宿主身份**
- `AddonIdentityDto`（`:90`）、`WorkflowEnvironmentInfo`（`:96`）。
- `WorkflowAddonOwner` / `WorkflowEnvironmentOwner`（`:171/:175`）。
- `WorkflowCallControl`（`:893`）——每次 Host 调用的取消 signal + 可信窗口 target。

**Library 读取 DTO**：`ItemSummaryDto` 系列（`:236-291`）、`RegularItemDetailDto`（`:291`）、`NoteSummaryDto`/`NoteDetailDto`/`ManagedNoteDetailDto`（`:303/:313/:331`）、`NotePayloadSummaryDto`/`NotePayloadValueDto`（`:374/:391`）、`LibraryPageRequestDto`（`:396`）与各类分页 DTO（`:401/:410/:443/:472`）、`AttachmentDetailDto`（`:420`）、`AnnotationDetailDto`（`:452`）、`CollectionDto`（`:698`）、`SavedSearchDto`（`:751`）、遍历 DTO（`LibraryTraversalRequestDto:773` / `...BatchDto:787` / `...ResultDto:812`）、`SelectedItemsPageDto`（`:841`）、`CurrentViewDto`（`:873`）、`MaterializedPaperDto`（`:564`）。
- `WorkflowHostLiveReadAdapters`（`:1799`）——live read 的 member-level `Pick` 契约（broker 子集）。

**Mutation（canonical 写入）**
- `MutationOperation`（`:941`）、`MutationPreviewOperation`（`:972`）。
- `MutationEntityRef` / `MutationChangeDto`（`:991/:995`）。
- `MutationReceipt`（`:1009`）、`MutationAttemptStatus`/`MutationPhase`/`MutationRecovery`/`MutationAttemptError`/`MutationAttemptReport`（`:1020-1058`）。
- `MutationExecutionResult<TResult>`（`:1069`）——outcome/attempt/receipt/result 四段式。
- 各 operation 结果 DTO（`:1080-1124`）、请求 DTO（`:1124-1261`）、`MutationRequestByOperation`（`:1261`）、`MutationResultByOperation`（`:1321`）。
- 预览计划：`ItemChangeTypePlan`（`:1357`）、`ItemPermanentRemovePlan`（`:1379`）、`CollectionRemovePlan`（`:1400`）、`MutationPreviewResult`（`:1445`）、`MutationOperationObservation`（`:1454`）。

**Notes / Managed notes / 文献产物**
- `NoteContentInput`（`:1462`）、`NoteCreateRequestDto`（`:1472`）、`NoteUpdateContentRequestDto`（`:1484`）、`NoteRemoveRequestDto`（`:1489`）。
- `LogicalNotePayloadDto`（`:1494`）、`NotePayloadUpsertRequestDto`（`:1501`）。
- `ManagedNoteKind`（`:323`）、`ManagedNoteWriteTargetDto`（`:1507`）、`ManagedNoteWriteRequestDto`（`:1511`）。
- `LiteratureDigestUpsertRequestDto`（`:1517`）、`LiteratureReferencesUpsertRequestDto`（`:1523`）、`LiteratureCitationAnalysisUpsertRequestDto`（`:1529`）、`LiteratureScoreUpsertRequestDto`（`:1535`）、`LiteratureArtifactApplyAnalysisRequestDto`（`:1541`）、对应结果 DTO（`:1559-1569`）。

**Attachments / Files / Archive / Resources**
- `WorkflowFileRef`（`:1591`）、`StoredFileInput`/`CompanionFileInput`（`:1597/:1601`）、`AttachmentPlacementDto`（`:1605`）、`WorkflowAttachmentSourceDto`（`:1612`）、`AttachmentContentManifestDto`（`:1622`）、`CanonicalStoredAttachmentSourceDto`（`:1639`）、`CanonicalAttachmentSourceDto`（`:1646`）。
- attachment 请求/结果 DTO（`:1651-1710`）。
- `WorkflowFileStatDto`（`:2189`）、`WorkflowFileListRequestDto`/`...EntryDto`/`...ResultDto`（`:2196/:2202/:2209`）、`WorkflowFileRemoveResultDto`（`:2216`）、`WorkflowFileCopyRequestDto`（`:2225`）、`WorkflowFileMoveRequestDto`（`:2230`）、`WorkflowMakeDirectoryRequestDto`（`:2236`）、`WorkflowInputFileMaterializationRequestDto`（`:2240`）、`WorkflowMaterializedFileDto`（`:2242`）。
- picker：`FilePickerFilterDto`（`:2247`）、`FilePickerRequestDto`（`:2251`）、`SaveFilePickerRequestDto`（`:2256`）。
- archive：`WorkflowArchiveEntryDto`（`:2259`）、measure/write/extract 请求与结果（`:2261-2273`）。
- resources：`WorkflowResourceFile`（`:2118`）、`WorkflowResourceApi`（`:2154`）、`WorkflowResourceMaterializeFileRequestDto`（`:2131`）、`WorkflowResourceAllocationRequestDto`/`...Dto`（`:2276/:2281`）、`WorkflowResourcePublishRequestDto`（`:2286`）、`WorkflowResourceOutputDescriptorDto`（`:2293`）。

**其他主机能力 DTO**：`PreparedNoteImageRef`/`PrepareNoteImageRequestDto`/`PreparedNoteImageDto`（`:102/:107/:121`）、`BibliographyFormatRef`/`...Dto`/`BibliographyRenderRequestDto`/`...ResultDto`（`:130-149`）、`WorkflowToastRequestDto`（`:157`）、`WorkflowRuntimeLogRequestDto`（`:162`）、`StatusTagKey`/`Value`/`StatusTagTransitionRequestDto`/`...ResultDto`（`:1715-1733`）、`WorkflowEditorSessionRequest`/`...Result`（`:2296/:2312`）、`WorkflowResearchBundleApi`（`:2178`）、`HookHelpers`（`:2713`）。

**Host API 本体**：`WorkflowHostApiV12`（`:2317-2604`），`WorkflowHostApi = WorkflowHostApiV12`（`:2726`）。

**清单与请求规格**：`WorkflowManifest`（`:2682`）、`WorkflowPackageManifest`（`:2706`）、`WorkflowRequestSpec`（`:2617`）、`WorkflowResultSpec`（`:2606`）、`WorkflowHooksSpec`（`:1932`）、`WorkflowDisplaySpec`（`:1927`）、`WorkflowTriggerSpec`（`:2076`）、`WorkflowExecutionSpec`（`:2080`）、`WorkflowInputsSpec`（`:2066`）、`WorkflowValidateSelectionSpec`（`:2060`）、`WorkflowSelectionRequirements`/`Selector`/`Filter`（`:1959/:1973/:1991`）、`WorkflowResourceRequirement`（`:2097`）、`WorkflowParameterSchema`（`:1887`）、`WorkflowI18nSpec`/`WorkflowPackageI18nSpec`（`:1912/:1917`）、`WorkflowLocalizationResources`（`:1922`）。

**Hook 与运行上下文**：`WorkflowHooksModule`（`:3031`）＝ `preflight?` + `buildRequest?` + `normalizeSettings?` + `applyResult`（必填）；`PreflightHook`（`:2944`）、`BuildRequestHook`（`:2954`）、`ApplyResultHook`（`:2974`）、`NormalizeWorkflowSettingsHook`（`:3000`）；`WorkflowPreflightOutcome`（`:2919`，四分支 `continue` / `replace-units` / `short-circuit-apply` / `skip`）；`WorkflowRuntimeContext`（`:2844`）、`WorkflowRuntimeInfrastructureContext`（`:2871`）；`WorkflowResultContext`（`:1858` 再导出）；`LoadedWorkflow`（`:3044`）、`LoadedWorkflows`（`:3058`）；`ResolvedBuildStrategy` / `WorkflowHookExecutionMode`（`:3038/:3039`）。

### 3.2 Host API 版本号常量与 capability 声明（事实）

- **版本号**：`WORKFLOW_HOST_API_VERSION = 12`，定义 `workflowHostContract.ts:175`（取自 `:55` 的 manifest `version`）。所有投影写入 `version: WORKFLOW_HOST_API_VERSION`（`hostApi.ts:315`、`runtime.ts:738`）。
- **22 个 capability group**（`workflowHostContract.ts:54-173`，`DeclaredWorkflowHostCapability` 定义在 `:365-368`）：

  `addon`、`environment`、`context`、`library`、`metadata`、`mutations`、`managedNotes`、`literatureArtifacts`、`notes`、`images`、`attachments`、`bibliography`、`researchBundles`、`statusTags`、`file`、`archive`、`resources`、`clipboard`、`editor`、`notifications`、`logging`、`synthesis`。

  其中 `interactionMode` 是 `["oneOf","interactive","non_interactive"]`（`:56`），`WorkflowHostCapabilitySummary` 额外派生一个 `saveFile` 布尔（`:370-375`、`:420`，判据 `file.pickSaveFile` 是否函数）。

- **交互受限成员**：`WorkflowInteractionMember`（`workflowHostErrorContract.ts:38-50`）列出 12 个要求交互模式的能力（`context.getCurrentView`、4 个 picker、4 个 clipboard、`editor.openSession`、`notifications.toast`），非交互模式下抛 `interaction_required`（`hostApi.ts:61-67`）。

### 3.3 Diagnostic flag / inspection 结构（事实）

- `WorkflowHostCandidateInspection`（`workflowHostContract.ts:16-23`）：`missingPaths` / `unexpectedPaths` / `nonFunctionPaths` / `nonObjectPaths` / `invalidValuePaths`，是**形状级**差异报告。
- `WorkflowHostContractConformance`（`:377-385`）：`missingCapabilities` / `unexpectedCapabilities` / `versionMismatch{expected,actual}`，是**能力级**门禁结构（仅测试使用）。
- `WorkflowHostContractVariant`＝`"interactive" | "non-interactive"`（`:3`），`inspectWorkflowHostContractVariants`（`:329`）额外检查两变体形状一致性（`variantShapeMismatchPaths`）。
- **运行期 capability flag 摘要**：`summarizeWorkflowRuntimeCapabilities`（`modules/workflow/catalog/workflowPackageDiagnostics.ts:22-48`）输出 `zotero` / `addon` / `fetch` / `Buffer` / `btoa` / `atob` / `TextEncoder` / `TextDecoder` / `FileReader` / `navigator` 十个布尔；用于 hook 起止与失败日志（`runtime.ts:666/761/794`）与包预编译日志（`loader.ts:215-228`）。
- **诊断开关**：`isWorkflowPackageDiagnosticsEnabled()` ⇒ `isDebugModeEnabled()`（`workflowPackageDiagnostics.ts:119-121`）；`enableWorkflowPackageDiagnosticsForDebugMode()`（`:123`）提升 runtime log 等级到 debug。
- **Loader 诊断**：`LoaderDiagnosticLevel`（`warning|error`）与 8 个 `LoaderDiagnosticCategory`（`loaderContracts.ts:7-19`）：`manifest_parse_error`、`manifest_validation_error`、`hook_missing_error`、`hook_import_error`、`hook_export_error`、`scan_path_error`、`scan_runtime_warning`、`skill_dependency_missing`。最后一项由注册表补入（`modules/workflow/catalog/workflowRuntime.ts:516-522`）。
- **Apply 诊断**：`WorkflowApplyDiagnostics`（`types.ts:2965-2968`，`warningCount` + `warningCodeCounts`），规约函数 `applyDiagnostics.ts`（上限：1,000,000 计数、20 个 code、96 字符 code 长度），命中时日志升级为 `warn`（`applySeam.ts:828-841`）。
- **hook 失败元信息**：`WorkflowHookFailureMeta` + `summarizeWorkflowExecutionError`（`workflows/errorMeta.ts:1-60`），附着 capabilitySource / executionMode（`runtime.ts:774-781`）。

### 3.4 错误契约

`WorkflowHostErrorCode` 11 个码（`workflowHostErrorContract.ts:11-22`）：`invalid_request`、`invalid_ref`、`not_found`、`unsupported_operation`、`interaction_required`、`permission_denied`、`resource_limited`、`conflict`、`unavailable`、`canceled`、`execution_failed`。`WorkflowHostTargetKind` 12 类（`:24-36`）。per-code 详情白名单 `WorkflowHostErrorDetailsByCode`（`:52`）与 strict-JSON 边界 `WorkflowHostStrictJsonBounds`（`:167`），断言函数 `assertWorkflowHostStrictJsonValue`（`:309`）、`assertWorkflowHostErrorDetails`（`:443`）、工厂 `createWorkflowHostError`（`:568`）。取消：`assertWorkflowCallNotCanceled`（`:556`），`canceled.reason ∈ {caller_signal, host_shutdown}`（`:283`）。错误 schema 常量：`zotero-agents.workflow-host-error.v1`（`:8`）。

---

## 4. 主要流程：「加载工作流包 → 校验兼容性 → 准备输入 → 执行 → 产出」

以「用户在 Zotero 中点击菜单触发一个工作流包内的工作流」为主轴。每步给符号。

### 阶段 A：注册表扫描与加载

| # | 步骤 | 符号 / 位置 |
| --- | --- | --- |
| A1 | 解析生效工作流目录（pref `workflowDir` → 测试 override → 默认） | `modules/workflow/catalog/workflowRuntime.ts:437 getEffectiveWorkflowDir`；pref 键见 `addon/prefs.js:25` |
| A2 | 扫描注册表（官方 / dev-local / 用户三来源并行） | `workflowRuntime.ts:551 rescanWorkflowRegistry` → `:341 loadMergedWorkflowManifests` |
| A3 | 三来源各自加载 | `src/workflows/loader.ts:973 loadWorkflowManifests(official \| dev-local \| user)` |
| A4 | 官方目录用 `workflows_builtin/manifest.json` 的 `files` 顶层目录做白名单过滤 | `loader.ts:692 filterDirectoryEntriesByOfficialManifest`（读 `manifest.json` 的 `files`，`:708-723`） |
| A5 | 判定包 or 单工作流：有 `workflow-package.json` 走包，否则读 `workflow.json` | `loader.ts:663 collectWorkflowCandidates` |
| A6 | 包：解析包清单 → 加载包 i18n → 逐个 `workflows[]` 解析子 manifest | `loader.ts:575 collectPackageWorkflowCandidates`（`:582` 包清单、`:595` i18n、`:601-626` 子 manifest） |
| A7 | 单：解析 `workflow.json` | `loader.ts:630 collectSingleWorkflowCandidate` |
| A8 | Manifest JSON Schema 校验 + 序列/输入规划语义校验 | `loaderContracts.ts:424 parseWorkflowManifestFromText`（`:443` schema、`:456-458` 语义）；schema 文件 `src/schemas/workflow.schema.json`（`schemaVersion` 常量 2）、`src/schemas/workflow-package.schema.json` |
| A9 | provider 归一化 | `loaderContracts.ts:184 normalizeManifestProvider` |
| A10 | 决定构建策略（`hook` / `declarative` / null） | `loaderContracts.ts:411 resolveBuildStrategy` |
| A11 | 加载 hooks（4 个 hook 各自：路径校验 → 存在性 → 模块导入 → 导出存在性 → 执行模式一致性） | `loader.ts:738 loadHooks`；包 hook 必须 `.mjs`：`:766-777 assertPackageHookPath`；模式冲突抛错：`:754-764 assignExecutionMode` |
| A12 | 包 hook 预编译：打包依赖图 + 写入临时脚本 + `loadSubScript` 到受控 scope | `loader.ts:237 importPrecompiledPackageHooksModule`、`packageHookBundler.ts:372 bundlePackageHookScript`、`loader.ts:191 createHostHookScope` |
| A13 | 内容摘要（用于审计身份） | `loader.ts:452 computeWorkflowContentDigest` |
| A14 | 装配 `LoadedWorkflow`（含 `hookExecutionMode`、`contentDigest`） | `loader.ts:1073-1085`；类型 `types.ts:3044` |
| A15 | 多来源合并：官方 → dev-local → 用户（后者覆盖） | `workflowRuntime.ts:365-…`（`loadMergedWorkflowManifests` 内 `byWorkflowId` 三段写入） |
| A16 | skill 依赖过滤：manifest 引用的 `skill_id` 必须在生效 skill 注册表中 | `workflowRuntime.ts:477 collectSkillRunnerSkillDependencies`、`:502 filterLoadedWorkflowsBySkillDependencies` |
| A17 | 注册表状态落盘（诊断 JSON） | `workflowRuntime.ts:337 persistWorkflowRegistryStatus`（路径 `stateDir/workflow-registry-status.json`，`:209-214`） |

### 阶段 B：兼容性校验（现状）

| # | 步骤 | 符号 / 位置 |
| --- | --- | --- |
| B1 | 编译期：manifest 与 `WorkflowHostApiV12` 双向精确匹配断言 | `workflowHostContract.ts:198-203 _WorkflowHostManifestMatchesApi` |
| B2 | 运行期（仅诊断）：hook 起止时汇总 host API 能力摘要与版本 | `runtime.ts:648-673`、`loader.ts:211-234 summarizeHostHookScope` |
| B3 | 运行期（仅诊断）：hook runtime 的 web-global 能力摘要 | `workflowPackageDiagnostics.ts:22` |
| B4 | 内容包级（真正门禁）：安装/更新前查 `requires.plugin` / `requires.content_api` / `requires.zotero` 的 semver 满足性 | `contentPackageSubscription.ts:702-750`；常量 `:206 CONTENT_API_VERSION = "3.0.0"`；不兼容结构 `:316` |
| B5 | （缺失）工作流包声明 Host API 版本的字段与门禁 | 见 §1.3 与疑点 9.1 |

### 阶段 C：触发与输入准备

| # | 步骤 | 符号 / 位置 |
| --- | --- | --- |
| C1 | 菜单/统一入口触发 | `modules/workflow/ui/workflowMenu.ts:233 triggerWorkflowFromUnifiedEntry` |
| C2 | 触发主流程入口 | `modules/workflow/ui/workflowExecute.ts:78 executeWorkflowFromCurrentSelection` |
| C3 | 捕获并锁定选择上下文快照（经 broker，失败即中止） | `workflowExecute.ts:105 readSelectionContext(createZoteroHostCapabilityBroker(...))` |
| C4 | 设置门（可配置则弹 Web 对话框；确认后写回持久设置） | `workflowExecute.ts:147-255`；`updateWorkflowSettings`（`settings/workflowSettings.ts:580`） |
| C5 | 准备 seam | `workflowExecution/preparationSeam.ts:366 runWorkflowPreparationSeam` |
| C6 | 选择必需性检查（无选择且不允许无选择 → halted） | `preparationSeam.ts:399-425` + `workflows/triggerPolicy.ts:3 canWorkflowRunWithoutSelection` |
| C7 | 解析生效执行选项（保存值 + run-once override + 预览） | `settings/workflowSettings.ts:1136 resolveWorkflowExecutionOptionsPreview`（在 `preparationSeam.ts:464` 调用） |
| C8 | 输入规划：候选 → 过滤 → 分组 → 单元 | `preparationSeam.ts` → `workflows/runtime.ts:850 planWorkflowExecutionUnits` → `workflowInputPlanning.ts:1120 planWorkflowInput` |
| C9 | 无有效单元 → 抛 `createNoValidInputUnitsError` | `runtime.ts:151`、`:870-877` |
| C10 | 单元级请求构建（hook 优先） | `preparationSeam.ts:813 buildPreparedWorkflowUnitExecution` → `runtime.ts:891 executeBuildRequests`；hook 分支 `runtime.ts:961-977` |
| C11 | 声明式分支 | `runtime.ts`（无 `buildRequest` 时）→ `declarativeRequestCompiler.ts:651 compileDeclarativeRequest` |
| C12 | preflight hook 产出四分支结果（可替换单元 / 短路 apply / 跳过 / 继续） | `runtime.ts:330 assertPreflightOutcome`、`types.ts:2919-2942`；preflight 单元解析 `runtime.ts:392 resolvePreflightUnitSelection` |
| C13 | 请求适配执行上下文（SkillRunner host bridge env 注入、upload 路径映射） | `preparationSeam.ts:859 adaptRequestsForExecutionContext`、`workflows/zoteroHostAccessOptions.ts`（runtime option 注入/剥离） |
| C14 | skill 显示名解析 | `preparationSeam.ts:865 resolveSkillRunnerSkillDisplayById` |

### 阶段 D：提交与执行

| # | 步骤 | 符号 / 位置 |
| --- | --- | --- |
| D1 | 重复输入守卫 | `workflowExecution/duplicateGuardSeam.ts`（在 `workflowExecute.ts:271` 调用，生产依赖 `productionExecution.ts:37`） |
| D2 | 提交 seam | `workflowExecution/submissionSeam.ts:128 submitPreparedWorkflowUnits`（生产依赖 `productionExecution.ts:53`） |
| D3 | 单元执行编排：build → run → apply | `submissionSeam.ts:69 executePreparedWorkflowUnit`（`:78` build、`:90` run、`:94` 等终态、`:109` apply） |
| D4 | 运行 seam：建队列、派发、观察终态 | `workflowExecution/runSeam.ts:473 runWorkflowExecutionSeam` |
| D5 | 序列请求 → 序列执行器 | `runSeam.ts:623 executeSkillRunnerSequence`（步骤级 apply 回调构造在 `:561-608`） |
| D6 | 序列执行器 | `sequenceRuntime.ts:1955 executeSkillRunnerSequence` → `:1582 executeSequenceFromState` |
| D7 | 单发请求 → provider | `runSeam.ts:647-…`（`ProviderOrchestrationContext` + `executeWithProvider`） |
| D8 | 进度事件记录与上报 | `runSeam.ts:183 applySkillRunnerProgressEvent`、`:302 recordSingleSkillRunnerProgress`、`:322 recordSequenceStepSkillRunnerProgress` |
| D9 | 终态观察 | `runSeam.ts:387 observeWorkflowRunTerminal` + `terminalResolution.ts:158 resolveWorkflowJobTerminalResolution` |
| D10 | 结果上下文（result.json / bundle / artifacts） | `resultContext.ts:442 createWorkflowResultContext`；bundle 读取 `workflows/zipBundleReader.ts:56 ZipBundleReader` |
| D11 | 回写 seam | `workflowExecution/applySeam.ts:255 runWorkflowApplySeam`；hook 调用 `:769 executeApplyResult`（生产实现 `runtime.ts:1212 executeApplyResult`） |
| D12 | apply 诊断规约与日志分级 | `applySeam.ts:779/942 normalizeWorkflowApplyDiagnostics` |
| D13 | 汇总：`WorkflowApplySummary{succeeded,failed,pending,failureReasons,jobOutcomes}` | `contracts.ts:159-165`；汇总展示 `workflowExecute.ts:331-357` |

### 阶段 E：产出与反馈

- job outcome 语义：`WorkflowJobOutcome`（`contracts.ts:147-157`，含 `terminalState: succeeded|failed|canceled`、`sequenceRunId`）。
- 单元结果分类：`submissionSeam.ts:113-124`（failed > 0 → failed；pending > 0 → failed + `workflow-unit-terminal-result-pending`；否则 succeeded）。
- 用户反馈：`feedbackSeam.ts:457 emitWorkflowStartToast`、`:488 emitWorkflowWaitingToast`、`:519 emitWorkflowJobToasts`、`:584 emitWorkflowFinishSummary`。
- 运行日志：`workflows/workflowLoggingOwner.ts:125 createWorkflowLoggingOwner` → `logging.appendRuntimeLog` host 成员。

---

## 5. 序列与步骤执行（`sequenceRuntime.ts` / `sequenceStateStore.ts`）

### 5.1 请求与状态模型

- 序列请求契约：`request.kind === "skillrunner.sequence.v1"`，步骤字段在 `types.ts:2637-2678`（`id` / `skill_id` / `mode` / `input` / `parameter` / `fetch_type` / `workspace` / `apply_result.on_failure` / `handoff.bindings` / `include_if` / `short_circuit`）；provider 侧类型 `SkillRunnerSequenceRequestV1`（`src/providers/contracts.ts:115`）。
- 运行状态：`SequenceRunState`（`sequenceStateStore.ts:50-70`），`schemaVersion: "2.0.0"`，字段含 `sequenceRunId` / `workflowRunId` / `jobId` / `backendId|Type` / `request`（已持久化投影）/ `currentStepIndex` / `finalStepId` / `terminalStepId` / `status` / `steps[]`。
- 状态枚举：`SequenceRunStateStatus`（`:21-27`）＝ `running_step` / `waiting_interaction` / `continuing` / `completed` / `failed` / `canceled`；终态判定 `:530-532 isTerminalSequenceRunStatus`。
- 步骤状态：`SequenceStepRunState`（`:29-48`），含 `status: "running" | ProviderExecutionResult["status"]`、`result`、`output`、`applyResult{status: succeeded|failed|skipped}`、`lifecycleSettledAt`。
- 事件：`SequenceRunEvent`（`:74-137`）14 种（step.started / request_created / succeeded / waiting / terminal / apply_result / lifecycle_settled，run.continuing / waiting_interaction / terminal）。状态迁移唯一入口 `applySequenceRunEvent`（`:572`）。
- 持久化：`serializeSequenceState` → `upsertWorkflowSequenceRunStoreEntry`（`:403-421`），底层在 `src/modules/pluginStateStore/runTables.ts`（导出见 `src/modules/pluginStateStore.ts:797`）；旧格式迁移 `:423-455`（meta key `SEQUENCE_STATE_MIGRATION_META_KEY`，`:376`）。schema 常量 `workflow.sequence.state.v2`（`:375`）。
- 订阅/查询：`subscribeSequenceRunStateStore`（`:834`）、`listSequenceRunStates`（`:843`）、`getSequenceRunStateByStepRequest`（`:851`）、`getSequenceStepIndexByRequestId`（`:866`）、`initializeSequenceRunState`（`:781`）。

### 5.2 调度循环

`executeSequenceFromState`（`sequenceRuntime.ts:1582`）是唯一调度器：

1. 后端白名单校验：仅 ACP 或 skillrunner（`:1599-1607`），step request kind 由 `:796 resolveStepRequestKind` 决定。
2. 从状态恢复 `outputsByStep`（`:735 outputsByStepFromState`）、上一已完成步骤（`:764 findPreviousStepId`）、可复用 workspace requestId（`:778 findReusableSkillRunnerRequestId`）。
3. `for index = startIndex … steps.length`（`:1620-1943`）：
   - `sequence.step.started` 事件（`:1626`）。
   - 附件绑定解析 `:154 resolveSequenceAttachmentBindings`；分发态请求投影 `:287 resolveSequenceRequestForDispatch`。
   - 构建步骤请求 `:557 buildStepRequest`（含 handoff 目标改写 `:452 applyHandoffBindings`、JSON Pointer 取值 `:364 parseJsonPointer` / `:376 getJsonPointer` / `:394 getHandoffSourceValue`）。
   - 进度上下文 `:330 buildSequenceStepProgressContext`；日志 `sequence-step-start`（`:1658`）。
   - `executeWithProvider` 调用（`:1705`）；`request-created` 事件写回状态（`:1712-1719`）。
4. 成功后：`outputsByStep.set`（`:1897-1902`）→ `sequence.step.succeeded`（`:1903`）→ `onSequenceStepSucceeded`（`:1911`）→ `:1249 advanceSuccessfulSequenceStep`（内部先 `applyAndSettleSuccessfulSequenceStep`）→ 若返回终态结果则结束，否则继续（`:1940-1942` 更新 previousStepId / workspaceRequestId）。
5. 循环自然结束仍未命中 final step → `sequence.run.terminal`(failed) + 抛错（`:1944-1952`）。

短路径（short-circuit）：`:515 matchesShortCircuitRule` + `:534 stepSucceededCompletesRun`；终态步骤 id 记入 `terminalStepId`，结果里带 `short_circuited` 元数据（`:1322-1333`、`:1380-1401`）。

### 5.3 失败 / 重试 / 取消 / 部分成功（表达方式）

**失败**
- 抛错路径：ACP 记录为 `failed` 时写 `sequence.step.terminal{status:"failed"}` 并向上抛（`:1734-1756`）；非 ACP 或不可恢复时写 terminal failed 并抛（`:1828-1842`）。
- provider 返回非成功：`:1870-1895` 依 `failed`/`canceled` 写 `sequence.step.terminal` 并抛统一错误。
- apply 失败分级由 `apply_result.on_failure` 决定，默认 `continue`：`:507-513 resolveStepApplyFailureMode`（`fail_sequence` 才中断）。
- apply 回调缺失记 `skipped` 而非失败（`:1006-1032`）。

**重试（实际是"重新接管/延续"，非自动重试）**
- ACP `failed_retriable` → 构造成 `deferred` 结果（`detachReason: "waiting"`, `continuationOwner: "recovery"`）写入 `sequence.step.waiting`，**return 而非抛错**（`:1757-1789`）。
- SkillRunner 观察者失败且可恢复 → 同样 deferred（`detachReason: "observer_failure"`）（`:1791-1827`）。
- provider 直接返回 `deferred` → `:1846-1869` 写 waiting 并返回。
- 延续入口：`:2022 continueSequenceFromIndex`（要求状态非终态；`completed` 直接回放终态结果，`failed`/`canceled` 抛错 `sequence run is already terminal`，`:2043-2050`）。
- 幂等接管：`:1561 acceptCompletedSequenceStep` 用 `completedSequenceStepAcceptanceInFlight`（`:1420`）对同一 `sequenceRunId` 串行化，避免并发重复 accept。

**取消**
- `ProviderExecutionResult.status === "canceled"` → `sequence.step.terminal{status:"canceled"}` + `sequence-step-canceled` 进度事件 + 抛错（`:1870-1895`）。
- ACP 记录 `canceled` → 同路径（`:1736-1755`）。
- 状态机终态 `canceled`（`:21-27`）与 job 侧 `terminalState: "canceled"`（`contracts.ts:151`）对应。
- Host 调用级取消：`WorkflowCallControl.signal` + `assertWorkflowCallNotCanceled`（`workflowHostErrorContract.ts:556`）；hook 运行期由 `createCancellationController()` 持有并在 finally 中 abort（`runtime.ts:615-630`、`:820`）。

**部分成功**
- 状态层面：每个步骤独立记录 `status` 与 `applyResult.status`；`succeeded` 的步骤结果保留在 `outputsByStep`，即使后续步骤失败也不回滚（`sequenceRuntime.ts:1897`、`:1380-1401 buildTerminalSequenceResultFromState`）。
- 汇总层面：`WorkflowApplySummary.jobOutcomes` 逐 job 记录成功/失败/取消（`contracts.ts:147-165`）；`applySeam.ts:266-318` 逐 job 累加 `succeeded/failed/pending`。
- 单元层面：`submissionSeam.ts:113-124` 只要有一个 job failed 就整单元 failed，但已成功 job 的 apply 结果仍然保留在 `applySummary.jobOutcomes`。
- 注意：`pending > 0` 也被归类为 failed（`reasonCode: workflow-unit-terminal-result-pending`），即"未终态"不视为成功。

**超时**：序列层未发现独立超时器；轮询间隔/超时在 manifest `request.poll`（`types.ts:2633-2636`）声明，由 provider 层消费（本次未深入 provider）。

---

## 6. 设置与默认值

### 6.1 工作流设置的读写

- **存储**：Zotero pref 键 `workflowSettingsJson`（`settings/workflowSettings.ts:71`；默认值声明 `addon/prefs.js:3`），实际键名前缀为 `config.prefsPrefix`（`src/utils/prefs.ts:60-64 getPrefName`）。读写包装 `src/utils/prefs.ts:71 getPref` / `:81 setPref`（均走 `Zotero.Prefs.*(..., true)`，即全局分支）。
- **文档模型**：`WorkflowSettingsDocument`（`settings/workflowSettingsDomain.ts:38`），`WORKFLOW_SETTINGS_SCHEMA_VERSION = 2`（`:36`）；记录类型 `WorkflowSettingsRecord = Record<workflowId, WorkflowExecutionOptions>`（`:34`）。
- **读写 API**：`getWorkflowSettings`（`workflowSettings.ts:573`）、`updateWorkflowSettings`（`:580`，做 merge → `normalizeSettings` hook → 清 `runOptions`）、`clearWorkflowSettings`（`:607`）、`listWorkflowSettingsRecord`（`:617`）。
- **缓存与 revision**：进程内缓存 `workflowSettingsCache`（`:132`）+ `workflowSettingsRevision`（`:133`）；读诊断计数 `workflowSettingsReadDiagnostics`（`:124-130`），测试读取 `getWorkflowSettingsReadDiagnosticsForTests`（`:223`）。缓存以原始文本比对判定命中（`:170-197`）。
- **归一化钩子**：`applyPersistedWorkflowSettingsNormalizer`（`settings/workflowSettingsNormalizer.ts:53`）与 `applyExecutionWorkflowParamsNormalizer`（`:84`）分别对应 hook 的 `phase:"persisted"` / `phase:"execution"` 两分支（签名见 `types.ts:3000-3029`）。
- **参数 schema 归一化**：`normalizeWorkflowParamsBySchema`（`workflowSettingsDomain.ts:266`）、required 检查 `listMissingRequiredWorkflowParameters`（`:345`）/ `assertRequiredWorkflowParameters`（`:363`）。
- **run-once override**（不落盘）：`setRunOnceWorkflowOverrides`（`workflowSettings.ts:998`）、`clearRunOnceWorkflowOverrides`（`:1006`）、`resetRunOnceOverridesForSettingsOpen`（`:1010`）；持久化时显式剔除 `runOptions`（`:599`）+ `stripRunOptionsForPersistence`（`ui/workflowExecute.ts:252`）。
- **对话框**：经典 `workflowSettingsDialog.ts`，Web `workflowSettingsWebDialog.ts`（`ui/workflowExecute.ts:180 openWorkflowSettingsWebDialog`）；UI 描述符 `buildWorkflowSettingsUiDescriptor`（`workflowSettings.ts:824`）、可配置判定 `isWorkflowConfigurable`（`:986`）。

### 6.2 `backendManager.ts`（91 KB，最大文件）

- 职责：后端配置对话框与持久化。关键导出：`collectBackendsFromDialog`（`:1602`）、`collectBackendsFromDraftRows`（`:1806`）、`persistBackendsConfig`（`:2052`）、`openBackendManagerDialog`（`:2580`）。
- 行级动作与探针：`getBackendRowActionKindsForType`（`:833`）、`resolveSkillRunnerManagementLaunchPayloadFromRow`（`:1305`）、`launchSkillRunnerManagementFromRow`（`:1466`）、`refreshSkillRunnerModelCacheFromRow`（`:1520`）、`refreshAcpRuntimeOptionsFromRow`（`:1551`）、`persistAcpBackendProbeResultFromRow`（`:1578`）。
- 配置持久化位置：`backendsConfigJson` pref（`addon/prefs.js:2`）；另一处同键常量在 `src/backends/registry.ts:29 const WORKFLOW_SETTINGS_PREF_KEY = "workflowSettingsJson"`（**注意**：该常量名与 workflow settings 同名，需核查是否复用/漂移，见疑点 9.4）。

### 6.3 持久化位置汇总（事实）

| 内容 | 位置 | 证据 |
| --- | --- | --- |
| 工作流设置 | pref `workflowSettingsJson` | `addon/prefs.js:3`、`workflowSettings.ts:71` |
| 后端配置 | pref `backendsConfigJson` | `addon/prefs.js:2` |
| 工作流目录 / skill 目录 | pref `workflowDir` / `skillDir` | `addon/prefs.js:25-26`、`workflowRuntime.ts:438/251` |
| 内容 feed / channel | pref `contentStable/Beta/DevFeedUrl`(+`MirrorUrl`)、`contentFeedChannel` | `addon/prefs.js:28-…`、`contentPackageSubscription.ts:355-375` |
| 序列运行状态 | `pluginStateStore` run tables（SQLite），payload schema `workflow.sequence.state.v2` | `sequenceStateStore.ts:403-421`、`:375`、`pluginStateStore/runTables.ts` |
| 注册表诊断 | `<stateDir>/workflow-registry-status.json` | `workflowRuntime.ts:209-214` |
| 内容包安装状态 | `<runtime root>/content/…/content-package-install-state.json` | `contentPackageSubscription.ts:202`、`:389 getContentPackageInstallStatePath` |
| 官方内容根 | `<runtime root>/content/official/{workflows,skills}` | `contentPackageSubscription.ts:377-386` |
| 开发本地内容根 | 环境变量 `ZOTERO_AGENTS_CONTENT_DEV_ROOT` 或 `<root>/content/dev-local` | `workflowRuntime.ts:189-194`，子目录探测 `:262-277` |
| skill 注册表子目录约定 | `skills_builtin` / `skills` | `pluginSkillRegistry.ts:30-31 PLUGIN_SKILL_BUILTIN_ROOT/PLUGIN_SKILL_USER_ROOT` |

**设置优先级**（`loadMergedWorkflowManifests`）：官方（`workflowSourceKind: "official"`）→ dev-local → 用户，后者按 `workflowId` 覆盖前者（`workflowRuntime.ts:346-359` 调用、`:365-…` 三次 `byWorkflowId.set`）。**事实**：同名 `workflowId` 后写者胜，无版本比较。

---

## 7. 内容包约定

### 7.1 `workflows_builtin/` 结构

顶层（事实，`ls workflows_builtin/`）：

- `manifest.json` —— 随包文件白名单（`version: 1`，`files: [...]` 共 162 项，`find` 实文件 163）。**事实**：该文件**没有 JSON Schema**，只有手写校验（`scripts/content-package/check-builtin-workflow-manifest.ts:47-102`、`modules/workflow/catalog/builtinWorkflowSync.ts:459-483`）。引擎在扫描官方目录时用它的**顶层目录集合**做白名单过滤（`loader.ts:697-723`）。
- 4 个工作流包（文件数 / 包内工作流数）：`literature-workbench-package`（103 / 18）、`workflow-debug-probe`（30 / 19）、`synthesis-layer`（22 / 4）、`mineru`（7 / 1）。每个包顶层含 `workflow-package.json`（+ `locales/`、`hooks/`、`lib/`、`README.md`）。
- **事实**：`workflows_builtin/` 下共有 73 个 `.mjs`，其中 42 个位于各包 `hooks/` 目录（其余在 `lib/`）；hook 一律 `.mjs`，没有其它扩展名。

包内布局（以 `workflow-debug-probe` 为例）：

```
workflow-debug-probe/
  workflow-package.json      # 包清单
  workflow.json              # 包自带的一个工作流
  README.md
  hooks/                     # 包级共享 hook（.mjs）
    applyResult.mjs
    applySequenceProbeResult.mjs
    buildDebugApplyContractRequest.mjs
    ...
  debug-apply-single-result/workflow.json     # 子工作流（每个一个目录 + workflow.json）
  debug-sequence-linear-probe/workflow.json
  ...
```

`literature-workbench-package` 额外有 `lib/*.mjs`（如 `bindings.mjs`、`referenceQualityGate.mjs`、`digestPayload.mjs`）与各子工作流的 `hooks/`、`README.md`。

**事实**：**不存在 `steps/` 或 `sequences/` 目录**；`skillrunner.sequence.v1` 的步骤内联在 `workflow.json` 的 `request.sequence.steps[]`（`types.ts:2637-2678`）。

**包清单格式**（`src/schemas/workflow-package.schema.json`，`additionalProperties: false`）：

| 字段 | 必填 | 含义 |
| --- | --- | --- |
| `id` | ✅ | 包 id（`minLength: 1`），装载时写入每个子工作流的 `packageId`（`loader.ts:618`）。 |
| `version` | ✅ | 包版本字符串。**事实**：仅存储与展示，引擎不做版本比较（`loader.ts:601-626` 只用来遍历 `workflows`）。 |
| `workflows` | ✅ | 包内子工作流 manifest 的**相对包根路径**数组（`minItems: 1`），逐项 `joinPath(packageRootDir, relativePath)` 解析（`loader.ts:601-602`）。 |
| `i18n` | ❌ | `{ defaultLocale, locales: { <locale>: <相对路径> } }`，由 `loader.ts:518 loadPackageLocalizationResources` 加载（`:595` 调用）。 |

**实例**（`workflows_builtin/workflow-debug-probe/workflow-package.json`）：`{ id: "workflow-debug-probe", version: "0.2.0", workflows: [ "workflow.json", "debug-host-bridge-connectivity-probe/workflow.json", … 共 19 项 ] }`。

**子工作流 manifest 格式**（`src/schemas/workflow.schema.json`）：
- 必填：`schemaVersion`（`const 2`）、`id`、`label`、`provider`、`trigger`、`inputs`、`validateSelection`、`hooks`。
- 可选：`description`、`executionModes`、`supportedInvocationModes`、`resourceRequirements`、`version`、`display`、`taskNameTemplate`、`i18n`、`parameters`、`execution`、`result`、`request`、`backend`、`defaults`。
- `hooks.applyResult` **必填**（`types.ts:3035`）；`buildRequest` / `preflight` / `normalizeSettings` 可选（`types.ts:3031-3036`）。
- 约束：包内 hook 文件必须 `.mjs`（`loader.ts:766-777`）；`debug_only: true` 的工作流在非 debug 模式被隐藏（`loader.ts:1023-1024`、`modules/workflow/catalog/workflowVisibility.ts:15`）。
- **实例** `workflow-debug-probe/debug-apply-single-result/workflow.json`：`provider: "skillrunner"`、`debug_only: true`、`trigger.requiresSelection: false`、`inputs.member.kind: "selection"`、`inputs.grouping.mode: "all"`、`validateSelection.select.policy: "selection"`、`request.kind: "skillrunner.job.v1"`、`result.fetch.type: "result"`、`hooks.buildRequest/applyResult` 指向 `../hooks/*.mjs`（相对**工作流目录**，`loader.ts:780 joinPath(workflowRoot, …)`）。
- 序列实例 `debug-sequence-linear-probe/workflow.json`：`request.kind: "skillrunner.sequence.v1"`，3 步（`emit` → `check`（`handoff.bindings[].kind: "value"`, `target: "/input/handoff"`）→ `finalize`），步骤带 `workspace: "new" | "reuse-workflow"`、`parameter`。

### 7.2 `skills_src/` 与 `skills_builtin/` 的关系

- 目录（事实）：`skills_src/` 顶层 4 个目录 —— `topic-synthesis/`、`literature-deep-reading/`、`zotero-bridge-cli/`、`zotero-library-agent/`。`topic-synthesis/` 含 `contracts/`、`runtime/`、`templates/`、`renderer/`；`literature-deep-reading/` 含 `assets/`、`contracts/`、`renderer/`、`runtime/`、`templates/`。模板为 `.j2`（如 `skills_src/topic-synthesis/templates/fragments/scope.md.j2`）。
- **生成链路（事实，纠正"无脚本"的初判）**：只有两条 renderer，且**都未接入 npm script**（需手工 `npx tsx`）：
  - `skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts`（导出 `renderTopicSynthesisSkills`，默认 outRoot = `skills_builtin`）。
  - `skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts`（导出 `renderLiteratureDeepReadingSkill`）。
- **`skills_src/zotero-bridge-cli` 与 `zotero-library-agent` 不生成 `skills_builtin`**，它们生成 Host Bridge 表面 `addon/content/host-bridge-skills/**`（映射见 `contracts/host-bridge/surfaces.json:9-11,25-27`）。
- `skills_builtin/` 标准结构（以 `literature-analysis/` 为例）：`SKILL.md` + `assets/`（`input.schema.json`、`output.schema.json`、`parameter.schema.json`、`runner.json`、`core_instruction.md`、各 agent 配置 `claude_settings.json`/`codex_config.toml`/`gemini_settings.json`/`iflow_settings.json`、`render_schemas/*.schema.json`、`templates/`）+ `references/` + `scripts/` + `tests/`。
- **注册硬要求**：`assets/runner.json` 与 `SKILL.md` 缺一不可，否则该候选被判为 error 级诊断（`modules/workflow/catalog/pluginSkillRegistry.ts:327-346`，`missing_skill_md` / `missing_runner_json`）。注册入口 `pluginSkillRegistry.ts:623 scanPluginSkillRegistry`，根约定 `:30-31 PLUGIN_SKILL_BUILTIN_ROOT/PLUGIN_SKILL_USER_ROOT`，供 `workflowRuntime.ts:568-571` 求 `effectiveSkillIds` 以过滤工作流 skill 依赖。
- `literature-analysis` / `literature-explainer` / `literature-translator` 在仓库中是 **submodule**（`git` 层面），其内容不随本仓源码演进。

### 7.3 打包与发布（事实）

- **版本 SSOT**：根 `content-package.version.json`（侦察时 `version: 0.8.7`、`content_api: 3.0.0`、`requires: { plugin: ">=0.9.0", content_api: "^3.0.0", zotero: ">=7 <11" }`）。**事实**：skill / workflow 各自的 `version` 字段（如包清单的 `version: "0.2.0"`）**不参与**任何兼容门禁。
- 内容包 feed 构建：`scripts/content-package/build-content-package-feed.ts`，根目录 `workflows_builtin`（`:464`）与 `skills_builtin`（`:468`）；产物 zip 布局为 `content-package.json` + `workflows/<pkg>/…` + `skills/<skill>/…`；`debug_only` 内容仅在 dev 通道包含。
- 包内容 schema：`contentPackageSubscription.ts:54 ContentFeedDocument`（`zotero-agents.content-feed.v1`）、`:64 ContentPackageManifest`（`zotero-agents.content-package.v1`）、`:76 ContentPackageInstallState`（`zotero-agents.content-install-state.v1`）；`CONTENT_API_VERSION = "3.0.0"`（`:206`）。
- npm 入口：`build:content-feed`、`bump:content-package`、`release:content-package`（dispatch `.github/workflows/publish-content-feed.yml`）、`check:content-package-release`、`check:builtin-workflow-manifest`（`package.json` scripts）；发布 tag 形如 `official-workflows-v<version>`，资产仓 `leike0813/zotero-agents-workflows`。
- 安装流水线阶段：`ContentPackageInstallProgressStage`（`:173-182`）＝ check-feed → download-package → verify-package → extract-package → stage-content → promote-content → write-state → refresh-registry → complete。
- **兼容门禁位置**：`contentPackageSubscription.ts:702-750`（`plugin` / `content_api` / `zotero` 三项 semver），不兼容结构 `:316 ContentPackageIncompatibility`。

---

## 8. 测试覆盖

> 本节结论来自并行的只读子侦察，完整报告见同目录 `_scout-workflow-tests.md`（129 行，含逐文件 `路径:行号`）。

- **规模**：`tests/workflows/` 28 文件 / 379 个 `it/test`；`tests/workflow-*/` 11 目录 / 41 文件 / 约 208 个；合计 53 文件 / 约 587 用例。
- **分层**：全部运行在 Node + Zotero mock 层（`scripts/run-node-test-shards.ts:80`、`:437` 强制 `--require tests/setup/zotero-mock.ts`；5 个 workflow shard 定义 `:307-349`）。唯一 Zotero 层文件 `tests/zotero/workflow/lite/174-workflow-archive-zotero-runtime.test.ts` 在 mock 下 self-skip（`:23-25`）；`tests/zotero/workflow/full/` 不存在；E2E `tests/zotero/e2e/full/300-lisongtao-gold.zotero.test.ts` 全文 0 次 "workflow"。
- **运行命令**：`npm run test:node:workflow`（`package.json:150`）；另有 `test:zotero:workflow`（实际零用例通过）。
- **关键覆盖点**：loader 扫描注册（`tests/workflows/20`、`41`、`130`）；Host API v12 治理（`187:134/174/204`）；序列取消与重试（`48:203/255/4034/4096`、`162:675/704/1245`）；settings（`49`、`ui/35`、`ui/50`）；输入规划 v2（`173:84/117/262`）；apply seam（`55:104/135/174/771`、`109`、`162:1531`）；host bridge 工作流（`host-bridge/108:256/331/421`）。
- **零直接覆盖模块**：`src/workflows/{errorMeta,triggerPolicy,zoteroHostAccessOptions}.ts`、`src/modules/workflowExecution/{acpSequenceStepLifecycle,feedbackPolicy,requestMeta,resultEnvelope,runConcurrency,sequenceStepApply,valuePath}.ts`。
- **文档漂移**：`AGENTS.md` 目录说明中的 `tests/core/`、`tests/node/` 目录实际不存在；声称的 `tests/workflow-*/` 中 `tests/workflow-tag-vocabulary/` 只有 helper、零测试文件。

---

## 9. 疑点清单（只列待核查项，附证据路径）

**9.1 Host API 版本兼容无运行时门禁（高优先）**
- 证据：`inspectWorkflowHostContract` / `inspectWorkflowHostContractVariants` 仅被 `tests/workflows/187-workflow-host-contract-governance.test.ts:7-8` 引用，`src/` 内无调用者（`rg` 全仓结果）。
- 证据：`src/schemas/workflow.schema.json` 无 `hostApiVersion`；`types.ts:2682-2704 WorkflowManifest` 无该字段。
- 待核查：内容包升级导致 Host API 破坏性变更时，靠什么拒绝旧包/新包？是否只靠 `content_api` semver（`contentPackageSubscription.ts:734-743`）？

**9.2 `WORKFLOW_HOST_API_MANIFEST` 与 `WorkflowHostApiV12` 的一致性只有编译期保证**
- 证据：`workflowHostContract.ts:198-203`；运行时 `inspectWorkflowHostCandidate` 未接入生产路径。若有人绕过类型断言（`as`、动态构造），运行时无检测。
- 待核查：`hostApi.ts` 投影中是否存在 `as` 强转点会掩盖成员缺失（例如 `:393-397` 的 `as WorkflowHostApiV12["mutations"]["preview"]`）。

**9.3 `workflows_builtin/manifest.json` 与真实文件的漂移风险（当前一致，但门禁薄弱）**
- 已核实（本次实测）：`manifest.json.files` 162 条相对路径 + `manifest.json` 自身 = `find workflows_builtin -type f` 的 163，**集合差为空**，当前无漂移。
- 风险仍在：`loader.ts:697-723` 用 `files` 的**顶层目录**做过滤，若新增包忘记登记，整包会被静默跳过（只产生 warning 而非 error）；`scripts/content-package/check-builtin-workflow-manifest.ts:47-102` 只校验 `version` 合法与 `files` 非空，不校验集合等价。

**9.4 常量命名重名**
- 证据：`src/backends/registry.ts:29 const WORKFLOW_SETTINGS_PREF_KEY = "workflowSettingsJson"` 与 `settings/workflowSettings.ts:71` 同名同值但各自私有定义；`backends/registry.ts` 是否也读写工作流设置需核查（职责越界风险）。

**9.5 序列并发接管语义**
- 证据：`sequenceRuntime.ts:1420 completedSequenceStepAcceptanceInFlight` + `:1561 acceptCompletedSequenceStep` 用进程内 Map 串行化；进程重启后该保护消失。
- 待核查：重启 + 多触发源（前台 / recovery 观察者）同时到达时，是否只依赖 `sequenceStateStore` 的事件幂等（`:549 requestIdentityConflict`）？

**9.6 `pending` 归类为失败**
- 证据：`submissionSeam.ts:119-123`（`pending > 0` → `status: "failed"`，`reasonCode: "workflow-unit-terminal-result-pending"`）。
- 待核查：这是有意的"未终态即失败"，还是把"稍后完成"误报为失败？与 `terminalResolution.ts:103-121` 的 `local-ready`/`pending` 设计意图是否一致。

**9.7 `skillrunner.sequence.v1` 仅支持 ACP / skillrunner**
- 证据：`sequenceRuntime.ts:1599-1607` 抛错；`providers/acp/provider.ts:211` 反向声明该 kind 必须由 workflow runtime 编排。
- 待核查：generic-http / pass-through 是否在未来需要序列能力（`declarativeRequestCompiler.ts` 已支持 `GenericHttpStepsRequestV1`）。若需要，当前硬编码白名单是设计约束还是遗漏。

**9.8 `skills_src` → `skills_builtin` 渲染器未接入 CI / npm script**
- 证据：只有两个 renderer（`skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts`、`skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts`），`package.json` 无对应 script；`rg -n "skills_src" scripts/` 无命中。
- 待核查：源码与 `skills_builtin/` 是否已漂移（无自动化门禁）；是否应加 `check` 类脚本。补充事实：`skills_builtin/{literature-analysis,literature-explainer,literature-translator}` 是 submodule，不受渲染器管理。

**9.8b 发布脚本引用了磁盘上不存在的 skill**
- 证据：`scripts/content-package/publish-skills.ps1:69-74` 引用 `skills_builtin/zotero-bridge-cli`、`skills_builtin/zotero-library-agent`，但 `ls skills_builtin/` 无这两个目录（它们生成的是 `addon/content/host-bridge-skills/**`）。
- 待核查：该 .ps1 是否仍在维护路径上，或是历史遗留；`.public` 清单只列 `zotero-bridge-cli`，与脚本注释"4 个默认 skill"不符。

**9.8c 非 git 回退遍历可能把 `__pycache__` 带入包**
- 证据：`scripts/content-package/build-content-package-feed.ts:178-182` 存在非 git 回退遍历；多个 skill 目录含未跟踪 `__pycache__/*.pyc`。
- 待核查：在无 git 环境（或 git 不可用）打包时是否会污染发布产物。当前默认路径按 git tracked 过滤，暂不入包（推测）。

**9.9 工作流设置与后端配置的写入竞态**
- 证据：`workflowSettings.ts:203-216 writeSettingsRecord` 为"整体重写 pref + 更新缓存"，无跨进程/跨窗口锁；同一 pref 被设置对话框与执行门两处写（`ui/workflowExecute.ts:250`）。
- 待核查：多主窗口同时改写时的丢更新风险。

**9.10 loader 的失败容忍度**
- 证据：单个工作流任何 hook 导入/导出失败都会被降级为 warning 并跳过（`loader.ts:1086-1107`），`LoadedWorkflows.errors` 只有在目录不可读时才非空（`:986-1000`）。
- 待核查：官方包内工作流被跳过时，用户是否只能从 `workflow-registry-status.json` 或 debug 日志发现（`workflowRuntime.ts:337`）。

**9.11 `applySeam` 的终态判定与 `runSeam` 的观察是否有重复事实源**
- 证据：`runSeam.ts:387 observeWorkflowRunTerminal` 与 `applySeam.ts:282 resolveWorkflowJobTerminalResolution` 都调同一个 resolver；但 `applySeam` 还会读取 `job.result`、`job.state`、ACP/SkillRunner run store（`terminalResolution.ts:1-8` 三个来源）。
- 待核查：三来源不一致时（provider 说 succeeded、apply 说 failed、job 说 succeeded）的优先级是否已有测试锁定（`tests/workflows/162-*` 可能覆盖）。

**9.12 `feedbackPolicy.ts` 与 `manifest.execution.feedback` 的默认值一致性**
- 证据：`feedbackPolicy.ts:1-4` 以 `!== false` 为默认显示；`workflow-debug-probe/debug-apply-single-result/workflow.json` 显式 `showNotifications: true`。
- 待核查：`execution.feedback` 在 schema 中的定义与其它 feedback 字段（若有）是否一致。

---

## 10. 未覆盖范围

本次侦察**未**覆盖或仅浅触以下内容，后续如需可单独开侦察：

1. **Provider 层实现细节**：`src/providers/{acp,skillrunner,generic-http,pass-through}/` 的请求编码、轮询、上传映射（`providers/skillrunner/uploadMapping`）、`executeWithProvider` 内部（`runSeam.ts` 依赖注入的真实实现）。
2. **Host Bridge 侧工作流投影**：`src/modules/hostBridge/workflow/*`（`hostBridgeWorkflowAgentRun.ts`、`hostBridgeWorkflowResources.ts`、`hostBridgeWorkflowControl.ts`）与 `hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts` 的对外协议；`AGENTS.md` 硬约束提到的 Bridge/MCP workflow 暴露面未逐条核对。
3. **`zoteroHostCapabilityBroker` 本体**：`src/modules/zoteroHostCapabilityBroker.ts` 的 admission/FIFO/native slice 语义（`hostApi.ts` 只做投影，broker 是 SSOT）。
4. **Synthesis 宿主 API**：`modules/synthesisClient/workflowHostClient.ts` 与 `packages/synthesis-contracts` 的 DTO 语义。
5. **UI 渲染细节**：设置对话框（经典/Web 两套）、`workflowMenu.ts` 的菜单构建、`workflowEditorHost.ts` 的渲染器协议（仅取导出签名，未读实现）。
6. **CI / 发布 workflow 文件**：`.github/workflows/`（含 `publish-content-feed.yml`）未读；§9.8 的生成疑问未排除。
7. **`skills_builtin/*/SKILL.md` 内容与 skill 合约**（`input/output/parameter.schema.json`、`runner.json` 字段语义）；`skills_src/*/contracts` 与 `runtime/` 的实现。
8. **Profile / feed 层**：`profiles_src/`、`feeds/`、`profiles/` 的发布身份与版本清单。
9. **Agent 侧消费**：`skills_builtin/*/assets/{claude,codex,gemini,iflow}*` 配置如何被各 agent 读取。
10. **性能与并发**：队列并发上限（`settings/workflowSettingsDomain.ts:24 normalizeHostQueueMaxConcurrency`）、`runtime.ts` 的 host leaf scope 串行语义（仅见 `stagedLeafRunSequence` 计数，未读完整实现）。
11. **迁移与兼容历史**：`openspec/changes/archive` 中工作流相关变更的决策背景；`sequenceStateStore.ts` legacy 迁移（`:423-455`）的旧格式定义。
