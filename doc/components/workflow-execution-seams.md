# Workflow Execution Seams

## Overview

`src/modules/workflowExecution/` 包含 15 个文件，实现工作流执行流水线的各个独立阶段（seam）。每个 seam 是一个可测试的边界，通过合约类型（`contracts.ts`）解耦，支持依赖注入覆写。

```
Preparation ──► DuplicateGuard ──► Run (enqueue) ──► Provider Execute ──► Apply ──► Feedback
     │                │                  │                                  │
     │                │                  ▼                                  │
     │                │         deferredCompletionTracker                   │
     │                │         sequenceRuntime (+ sequenceStateStore)       │
     │                │         sequenceStepApply                           │
     │                │                                                      │
     ▼                ▼                                                      ▼
  contracts.ts    requestMeta.ts          bundleIO.ts               resultContext.ts
                                          runConcurrency.ts         messageFormatter.ts
                                          feedbackPolicy.ts
```

配套文档：
- `doc/architecture-flow.md` — 执行主链路总览
- `doc/components/workflow-settings-single-source-submit-flow-ssot.md` — Settings Gate 阶段

## 合约类型层（contracts.ts）

纯类型定义，无实现逻辑：

| 类型 | 用途 |
|------|------|
| `WorkflowExecutionContext` | 运行时上下文，解析自 workflow settings（包含 backend、providerId、requestKind、providerOptions、runOptions） |
| `PreparedWorkflowExecution` | 准备阶段输出：`{ workflow, requests, skippedByFilter, executionContext }` |
| `PreparationSeamResult` | 判别联合：`{ status: "ready"; prepared }` 或 `{ status: "halted" }` |
| `WorkflowRunState` | 运行阶段状态：`{ workflow, requests, queue, jobIds, runId, totalJobs, idlePromise }` |
| `WorkflowJobOutcome` | 单一作业结果：`{ index, taskLabel, succeeded, terminalState?, reason?, structuredApplyResult?, jobId, requestId? }` |
| `WorkflowApplySummary` | Apply 阶段汇总：`{ succeeded, failed, pending, failureReasons, jobOutcomes, reconcileOwnedPendingJobs }` |
| `WorkflowToastPayload` | Toast 载荷：`{ text, type, semantic? }` |
| `WorkflowPresentationArgs` | 展示参数：`{ workflowLabel, totalJobs, messageFormatter }` |

## 1. Preparation Seam（preparationSeam.ts）

### 导出

```typescript
async function runWorkflowPreparationSeam(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflow: LoadedWorkflow;
    messageFormatter: WorkflowMessageFormatter;
    executionOptionsOverride?: WorkflowExecutionOptions;
    selectedItemsOverride?: Zotero.Item[];
    suppressUiFeedback?: boolean;
  },
  deps?: Partial<PreparationDeps>,
): Promise<PreparationSeamResult>
```

### 职责

检查选中项 → 构建 SelectionContext → 执行 `executeBuildRequests()` 生成请求 → 解析 `resolveWorkflowExecutionContext()` → 返回 ready 或 halted。

如果选中项为空且 workflow 不支持无选择运行（`canWorkflowRunWithoutSelection`），立即返回 halted。

### 依赖注入

```typescript
type PreparationDeps = {
  appendRuntimeLog;
  resolveWorkflowExecutionContext;
  resolveWorkflowExecutionOptionsPreview;
  buildSelectionContext;
  executeBuildRequests;
  alertWindow;
};
```

### 关键行为

- **零请求**：生产了零个请求时，返回 halted 并显示跳过摘要
- **NO_VALID_INPUT_UNITS**：`executeBuildRequests` 抛出该错误时，解析跳过的单元数并返回 halted
- **请求适配**：`adaptRequestsForExecutionContext()` 处理两种适配：
  - `ACP_SKILL_RUN_REQUEST_KIND` → `adaptSkillRunnerJobToAcpSkillRun()` 转换请求格式
  - `skillrunner.job.v1` + 后端不支持 ZoteroHostAccess → `stripZoteroHostAccessRuntimeOptionFromRequest()`
- **Execution Context 空值**：`resolveWorkflowExecutionContext` 返回空值时记录错误日志并返回 halted
- 所有 halted 路径都受 `shouldShowWorkflowNotifications()` 控制 UI 反馈

## 2. Duplicate Guard Seam（duplicateGuardSeam.ts）

### 导出

```typescript
async function runWorkflowDuplicateGuardSeam(
  args: {
    win: _ZoteroTypes.MainWindow;
    workflowId: string;
    workflowLabel: string;
    requests: unknown[];
  },
  deps?: Partial<DuplicateGuardDeps>,
): Promise<DuplicateGuardResult>

type DuplicateGuardResult = {
  allowedRequests: unknown[];
  skippedByDuplicate: number;
  skippedRecords: Array<{ index: number; taskLabel: string; inputUnitIdentity: string }>;
};
```

### 职责

遍历每个请求，解析其输入单元身份 → 检查 `listActiveWorkflowTasks()` 中是否有相同 `workflowId` + `inputUnitIdentity` 的活跃任务 → 有冲突时弹确认框让用户决定。

### 输入身份解析

委托给 `requestMeta.resolveInputUnitIdentityFromRequest()`，生成格式：
- `attachment-key:<key>`（优先）
- `attachment-id:<id>`
- `attachment-path:<path>`
- `parent-id:<id>`
- `""`（空字符串 = 无法做重复检查，直接放行）

### 确认 UI

使用 `Zotero.Prompt.confirm()`（`defaultButton: 1` = "否"），回退到 `window.confirm()`。用户选"否"时该请求被跳过。

### 依赖注入

```typescript
type DuplicateGuardDeps = {
  listActiveWorkflowTasks;
  appendRuntimeLog;
  confirmDuplicateSubmission;  // 可替换确认 UI 逻辑
};
```

## 3. Run Seam（runSeam.ts）

### 导出

```typescript
function runWorkflowExecutionSeam(
  args: { prepared: PreparedWorkflowExecution },
  deps?: Partial<RunSeamDeps>,
): WorkflowRunState
```

### 职责

创建 `JobQueueManager` → 按 `resolveWorkflowDispatchConcurrency()` 计算并发度 → 入队所有请求 → 返回 `WorkflowRunState`（含 `idlePromise: queue.waitForIdle()`）。

### 调度路由

根据 `requestKind` 决定执行策略：

| Request Kind | 执行路径 |
|-------------|---------|
| `skillrunner.sequence.v1` | `executeSkillRunnerSequence()`；声明 `apply_result` 的 step 在成功后由 `sequenceStepApply` 立即执行对应 workflow 的 `applyResult` |
| 其他 | `executeWithProvider()` |

### Job 元数据

每个 job 入队时附加的 meta：

```typescript
{
  index, runId, workflowLabel, taskName,
  inputUnitIdentity, inputUnitLabel, targetParentID,
  providerId, requestKind, backendId, backendType,
  backendBaseUrl, engine,
}
```

### 进度事件处理

`onJobProgress` 处理 `request-created` 事件：

- 记录 `job.meta.requestId`
- 调用 `ensureSkillRunnerRecoverableContext()` 建立恢复上下文
- 根据 backend type 和 skillrunner_mode 决定 UI 行为：
  - `skillrunner` + `interactive` → `openAssistantWorkspaceSidebar({ tab: "skillrunner" })`
  - `acp` + `interactive` → `openAssistantWorkspaceSidebar({ tab: "acp-skills" })` + `selectAcpSkillRun()`

### runId 格式

`"run-{Date.now().toString(36)}-{random(8)}"`

### 依赖注入

```typescript
type RunSeamDeps = {
  createQueue;
  executeWithProvider;
  appendRuntimeLog;
  recordWorkflowTaskUpdate;
  recordTaskDashboardHistoryFromJob;
  ensureSkillRunnerRecoverableContext;
  openAssistantWorkspaceSidebar;
  focusSkillRunnerWorkspace;
  selectAcpSkillRun;
};
```

### Sequence Step Apply

`skillrunner.sequence.v1` 的 step 可以声明：

```json
{
  "apply_result": {
    "workflow_id": "literature-translator",
    "on_failure": "continue"
  }
}
```

声明后，run seam 在该 step 返回 successful provider result 后、启动下一
step 前解析目标 workflow 并调用其 `applyResult`。step apply 使用普通 apply 的
`bundleReader`、`resultContext`、target parent 和 step request，同时额外传入
`sequenceStep` 元数据。

`on_failure` 默认是 `continue`：失败会写入 runtime log、ACP run apply state 和
sequence state，但不阻止后续 step。声明 `fail_sequence` 时，step apply 失败会终止
sequence。

## 4. Apply Seam（applySeam.ts）

### 导出

```typescript
async function runWorkflowApplySeam(
  args: { runState: WorkflowRunState; messageFormatter: WorkflowMessageFormatter },
  deps?: Partial<ApplySeamDeps>,
): Promise<WorkflowApplySummary>
```

### 职责

遍历 `runState.jobIds`，对状态为 `succeeded` 且仍由最终 apply seam 拥有的作业调用 `executeApplyResult()`，汇总为 `WorkflowApplySummary`。

如果 `skillrunner.sequence.v1` 的 final step 已声明 `apply_result`，最终 apply seam
只记录 skipped final apply 结果，不重复调用父 workflow 的 apply hook。

### 作业状态处理

| 作业状态 | 汇总计数 | 说明 |
|---------|---------|------|
| `succeeded` | 计入 `succeeded` | 正常 apply 流程 |
| 非 succeeded（普通） | 计入 `failed` | `failureReasons` 记录原因 |
| 可恢复 skillrunner 请求 | 计入 `pending` | `hasRecoverableSkillRunnerRequest()` 判定 |
| ACP 可恢复非终态 | 计入 `pending` | `isAcpProviderResult()` + 状态检查 |

### 序列步骤处理

结果中带 `sequence` 元数据时：
- `sequence.workflow_run_id` 传递给 `markAcpSkillRunApplyResult()` 建立与 ACP run record 的关联
- 临时 bundle 路径（`buildTempBundlePath`）在 `finally` 块中通过 `removeFileIfExists` 清理

### reconcileOwnedPendingJobs

返回 `reconcileOwnedPendingJobs`（含 `requestId` 的 pending 作业列表），供上游决定后续操作（如注册 deferred completion tracker）。

### 依赖注入

```typescript
type ApplySeamDeps = {
  appendRuntimeLog;
  normalizeErrorMessage;
  executeApplyResult;
  buildTempBundlePath;
  writeBytes;
  removeFileIfExists;
  createUnavailableBundleReader;
  createDirectoryBundleReader;
  createZipBundleReader;
  createWorkflowResultContext;
};
```

## 5. Deferred Completion Tracker（deferredCompletionTracker.ts）

### 导出

```typescript
function registerDeferredWorkflowCompletion(args: {
  runId, win, workflowId, workflowLabel,
  totalJobs, skipped, succeeded, failed,
  failureReasons, pendingJobs, messageFormatter,
}): boolean

function settleDeferredWorkflowCompletion(args: {
  runId, requestId, succeeded, terminalState?, reason?
}): { handled: boolean; completed: boolean }
```

### 职责

管理异步（deferred）作业的完成跟踪。当一个 workflow 包含 pending 作业时，注册 tracker，在后续 `settleDeferredWorkflowCompletion` 调用中追踪每个 pending 作业的终态。

### 关键行为

- **缓冲机制**：`DEFERRED_OUTCOME_BUFFER_TTL_MS = 600000`（10 分钟）。在 tracker 注册之前到达的结果先缓冲，注册后回放
- **自动完成**：注册时如果所有 pending 作业已解决，立即完成
- **最终化**：`finalizeDeferredWorkflowRun` 在所有作业解决后发送 job toast + 完成摘要，然后从 `pendingRuns` 中移除
- **清理**：`pruneDeferredOutcomeState()` 在每次注册/解决调用时自动清理过期条目

### 测试接口

```typescript
function resetDeferredWorkflowCompletionTrackerForTests(): void
function setDeferredWorkflowCompletionTrackerDepsForTests(overrides?): void
```

## 6. Sequence Runtime（sequenceRuntime.ts + sequenceStateStore.ts）

### 导出

```typescript
type ExecuteWithProvider = (args: {
  requestKind, request, backend, providerOptions?,
  onProgress?, orchestrationContext?,
}) => Promise<ProviderExecutionResult>;

type StepOutput = { stepId, requestId, output, result };

function executeSkillRunnerSequence(args: {
  request, backend, providerOptions?, workflowId,
  workflowLabel?, workflowRunId, jobId,
  executeWithProvider, appendRuntimeLog, onProgress?,
}): Promise<ProviderExecutionResult>

function continueSkillRunnerSequence(args: {
  sequenceRunId, startIndex, backend, providerOptions?,
  executeWithProvider, appendRuntimeLog, onProgress?,
}): Promise<ProviderExecutionResult>
```

### 序列状态存储（sequenceStateStore.ts）

状态持久化在 `PLUGIN_TASK_DOMAIN_WORKFLOW_SEQUENCE` 域中，通过 `upsertPluginTaskContextEntry` 读写。

#### 核心类型

```typescript
type SequenceRunStateStatus = "running_step" | "waiting_recovery" | "continuing"
  | "completed" | "failed" | "canceled";

type SequenceStepRunState = {
  stepId, skillId, index, requestId?,
  status?: "running" | "succeeded" | "deferred" | "failed" | "canceled",
  output?, result?, updatedAt,
};
```

#### 状态管理函数

| 函数 | 用途 |
|------|------|
| `initializeSequenceRunState()` | 创建初始 state，status = `running_step`，生成每个 step 的空条目 |
| `getSequenceRunState()` | 按 sequenceRunId 查找 |
| `getSequenceRunStateByStepRequest()` | 按 step requestId 查找 |
| `recordSequenceStepStarted()` | 标记 step 开始，设置 step status = `running` |
| `recordSequenceStepRequestCreated()` | 记录 step 的 requestId，首次创建时设置 rootRequestId |
| `recordSequenceStepSucceeded()` | 记录 step output + result，step status = `succeeded` |
| `recordSequenceStepDeferred()` | 标记整个 sequence status = `waiting_recovery`，step status = `deferred` |
| `markSequenceRunContinuing()` | 恢复时标记 status = `continuing` |
| `markSequenceRunTerminal()` | 终态：`completed` / `failed` / `canceled` |
| `getSequenceStepIndexByRequestId()` | 按 requestId 查找 step index |

### 步骤间 Handoff 映射

`buildStepRequest()` 处理以下 handoff 字段：

| 字段 | 行为 |
|------|------|
| `from_step` | 指定前一步骤的 stepId |
| `input.*` | 从步骤 output 映射到 input |
| `parameter.*` | 从步骤 output 映射到 parameter |
| `pass_through` | 默认 `true`，将整个 output 放在 `input.handoff` 中 |
| `defaults.input` / `defaults.parameter` | 提供默认值 |
| `required` | 默认 `true`，output 缺失时抛出错误 |
| `workspace` | `"reuse-workflow"` 重用工作流工作区；其他值每个步骤独立工作区。ACP provider 内部仍会为每个 step 分配独立 runner-owned `resultJsonPath` / `inputManifestPath` 子空间。 |
| `fetch_type` | 默认为 `"result"` |

### 恢复路径

`continueSkillRunnerSequence()` 从指定的 `startIndex` 继续执行，调用前先 `markSequenceRunContinuing()`。

### 终止条件

- 遇到 `"deferred"` 状态 → 序列立即返回 deferred 结果
- 遇到非 succeeded、非 deferred 状态 → 序列标记为 failed
- `final_step_id` 对应步骤成功 → 通过 `buildSequenceResult()` 包装为最终结果（含所有中间步骤 output）

## 7. 支持模块

### 7.1 bundleIO.ts

结果 bundle 数据 I/O 抽象。

```typescript
type BundleReader = {
  readText: (entryPath: string) => Promise<string>;
  getExtractedDir?: () => Promise<string>;
};
```

| 工厂 | 行为 |
|------|------|
| `createUnavailableBundleReader(requestId)` | 所有读取抛出 `"bundle unavailable"` |
| `createDirectoryBundleReader(rootDir)` | 在根目录下读取文件，使用 `normalizeEntryPath` 路径清理 |
| `createZipBundleReader` | 来自 `zipBundleReader.ts` |

| 工具函数 | 行为 |
|---------|------|
| `buildTempBundlePath(requestId)` | `{tempDir}/zotero-skills-{requestId}-{timestamp}.zip` |
| `writeBytes(filePath, bytes)` | 使用 `IOUtils.write`，回退到 `fs/promises.writeFile` |
| `removeFileIfExists(filePath)` | 使用 `IOUtils.remove({ ignoreAbsent: true })`，回退到 `fs/promises.unlink` |

`normalizeEntryPath` 清理路径：反斜杠转正斜杠 → 去除前导斜杠 → 移除 `.` 和 `..` 段，防止目录遍历。

### 7.2 resultContext.ts

获取并解析工作流执行结果。

```typescript
type WorkflowResultContext = {
  resultJson: unknown;
  resultJsonSource: WorkflowResultJsonSource;
  workspaceDir?: string;
  resultJsonPath?: string;
  bundleReader: BundleReader;
  warnings: WorkflowResultResolutionWarning[];
  errors: WorkflowResultResolutionWarning[];
  resolveArtifact: (args: { fieldName?, rawPath?, fallbackPath? }) => Promise<WorkflowResolvedArtifact>;
  readArtifactText: (args: { fieldName?, rawPath?, fallbackPath? }) => Promise<WorkflowResolvedArtifact>;
};
```

#### resultJson 解析优先级

1. `runResult.resultJson`（内联）→ `kind: "run-result"`
2. `resultJsonPath` 本地文件 → `kind: "local-path"`；ACP run 这里是实际 runner-owned 结果路径，不等同于固定 `result/result.json`
3. bundle 条目（默认 `result/result.json`）→ `kind: "bundle-entry"`；这是 legacy/bundle fallback 入口，不是 ACP local result 的命名规则
4. 均不可用 → `kind: "unavailable"` + warning

#### resolveArtifact

扫描多个候选位置，返回第一个成功读取的内容。候选位置包括：
- 绝对路径 → 直接本地读取
- 相对路径 → `workspaceDir` + 路径 / bundle 条目
- 常见路径标记：`/uploads/`、`/artifacts/`、`/result/`、`/bundle/`

所有候选都失败时抛出完整候选列表的错误。

### 7.3 requestMeta.ts

从请求对象提取元数据供 seam 使用。

| 函数 | 返回值 | 回退链 |
|------|--------|--------|
| `resolveTargetParentIDFromRequest()` | `number \| null` | `request.targetParentID` |
| `resolveTaskNameFromRequest(request, index)` | `string` | `request.taskName` → 第一附件路径的基名 → 父项 Zotero 标题 → `"task-{index+1}"` |
| `resolveInputUnitIdentityFromRequest(request)` | `string` | `attachment-key:` → `attachment-id:` → `attachment-path:` → `parent-id:` → `""` |
| `resolveInputUnitLabelFromRequest(request, index)` | `string` | 委托给 `resolveTaskNameFromRequest` |

### 7.4 messageFormatter.ts

创建本地化消息格式化器。

```typescript
function createLocalizedMessageFormatter(): WorkflowMessageFormatter
```

返回的格式化器回调：

| 回调 | 用途 |
|------|------|
| `summary({ workflowLabel, succeeded, failed, skipped })` | 完成摘要文本 |
| `failureReasonsTitle` | 字符串常量 |
| `overflow(count)` | "还有 N 个失败" |
| `unknownError` | 字符串常量 |
| `startToast({ workflowLabel, totalJobs })` | 开始 toast |
| `waitingToast({ workflowLabel, pendingJobs })` | 等待 toast |
| `jobToastSuccess({ workflowLabel, taskLabel, index, total })` | 成功 toast |
| `jobToastFailed({ workflowLabel, taskLabel, index, total, reason })` | 失败 toast |
| `jobToastCanceled({ workflowLabel, taskLabel, index, total })` | 取消 toast |

### 7.5 feedbackSeam.ts + feedbackPolicy.ts

#### 通知策略

```typescript
function shouldShowWorkflowNotifications(manifest: WorkflowManifest): boolean
```
默认为 `true`。仅 `manifest.execution.feedback.showNotifications === false` 时抑制。

#### Toast 管理

| 常量 | 值 | 用途 |
|------|-----|------|
| `WORKFLOW_TOAST_CLOSE_DELAY_MS` | 2000 | 2 秒自动关闭 |
| `MAX_VISIBLE_WORKFLOW_TOASTS` | 3 | 有界 toast 上限 |

`visibleWorkflowToasts: ProgressWindowInstance[]` 全局数组管理活动 toast，超出上限时移除最旧的。

#### Toast 类型

| 类型 | 关键参数 | 粘性 |
|------|---------|------|
| `WORKFLOW_TOAST_OPTIONS` | `{ sticky: false, bounded: true }` | 否（开始 toast） |
| `STICKY_BOUNDED_TOAST_OPTIONS` | `{ sticky: true, bounded: true }` | 是（job toast / 完成摘要） |

#### 函数链

```
emitWorkflowStartToast(...args)
 → showWorkflowToast({ text, type: "default", semantic: "start" })

emitWorkflowWaitingToast(...args)
 → showWorkflowToast({ text, type: "default", semantic: "waiting" })

emitWorkflowJobToasts(...args)
 → selectWorkflowJobOutcomesForToasts()  // 多作业时仅显示失败的
 → 逐个 showWorkflowToast()

emitWorkflowFinishSummary(...args)
 → shouldEmitWorkflowFinishSummaryToast()  // 全成功 + 单作业时不显示完成摘要
 → showWorkflowToast({ text, type, semantic })
```

辅助函数：`alertWindow(win, message)` 通过 toast 显示错误消息。

### 7.6 runConcurrency.ts

```typescript
const FULL_PARALLEL_PROVIDER_IDS = new Set(["skillrunner", "generic-http"]);

function resolveWorkflowDispatchConcurrency(args: {
  providerId: string;
  requestCount: number;
}): number
```

- `skillrunner` / `generic-http` → 并发度 = `requestCount`（全并行入队）
- 其他 provider → 并发度 = `1`（顺序执行）

## 流水线集成

`doc/architecture-flow.md` 的流程图中各阶段与 seam 的对应关系：

| 流程图步骤 | Seam | 文件 |
|-----------|------|------|
| Build SelectionContext + Build Requests | Preparation | `preparationSeam.ts` |
| Settings Gate | 外部模块 | `workflow-settings-single-source-submit-flow-ssot.md` |
| Provider Resolution | Preparation | `preparationSeam.ts`（调用 `resolveWorkflowExecutionContext`） |
| Duplicate Guard | Duplicate Guard | `duplicateGuardSeam.ts` |
| JobQueue Enqueue | Run | `runSeam.ts` |
| Provider Execute | 外部委托 | `providers/registry.ts` |
| applyResult Hook | Apply | `applySeam.ts` |
| Deferred Completion | Deferred Completion Tracker | `deferredCompletionTracker.ts` |
| Finish Message | Feedback | `feedbackSeam.ts` |
