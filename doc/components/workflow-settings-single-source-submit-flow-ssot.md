# Workflow Settings Single-Source Submit Flow SSOT

## 1. Scope

本 SSOT 约束以下两类入口的 workflow 设置行为：

- 交互提交流程中的“提交前设置页”（独立网页弹窗）
- Dashboard 顶层 `Workflow选项` 页（持久配置管理）

不在本文件范围：

- provider 协议与请求格式定义
- workflow 业务逻辑本体

## 2. Single Source of Truth

### 2.1 Persisted Source

- 唯一持久化来源：`workflowSettingsJson`
- 持久字段：`backendId`、`workflowParams`、`providerOptions`

### 2.2 Submit Snapshot

- 执行时允许传入一次性 `executionOptionsOverride`
- 合并规则：`persisted <- override`
- 一次提交（一个 trigger）只解析一次 snapshot，并广播到同一 batch 所有 job

### 2.3 Resolved Execution Context

执行时解析出的完整上下文 `WorkflowExecutionContext`（`src/modules/workflowSettings.ts:55-62`）包含持久字段和运行时解析字段：

| 字段 | 来源 | 说明 |
|------|------|------|
| `backend` | backend registry + `backendId` | 由持久化的 `backendId` 解析出的 backend profile |
| `requestKind` | workflow manifest + backend type | 声明式请求编译结果 |
| `workflowParams` | 持久化 | 业务参数 |
| `providerOptions` | 持久化 + 一次性覆盖 | 运行期选项，支持持久化默认和 run-once 覆盖 |
| `runOptions` | workflow manifest + 一次性覆盖 | Zotero 主机访问策略、写入自动审批等运行期选项。**不持久化**——仅从 `WorkflowExecutionOptions` 的 `runOptions` 覆盖字段合并，`mergeExecutionOptions` 中 `override.runOptions` 完全替换 `base.runOptions` |
| `providerId` | 运行时解析 | 由 `resolveProvider` 根据 requestKind + 选定的 backend 解析得出。**不持久化** |

## 3. Configurability Predicate

workflow 被判定为“可配置”当且仅当以下任一维度可编辑：

- backend profile 维度可编辑
  - `requiresBackendProfile=true` 且 profile 数量不等于 1
- workflow parameter schema 非空
- provider runtime option schema 非空

当 `requiresBackendProfile=true` 且 profile 数量为 0 时，视为“可配置但阻塞提交”。

## 4. Interaction Contracts

### 4.1 Interactive Trigger Gate

- 交互入口（例如右键菜单执行 workflow）必须先经过设置门禁
- 判定无可配置项：直接提交
- 判定有可配置项：打开该 workflow 的提交前设置弹窗
- 用户取消：终止提交
- profile 缺失：弹窗内阻止确认

### 4.2 Submit Dialog Contract

弹窗返回结构：

```ts
{
  status: "confirmed" | "canceled" | "error";
  executionOptions?: WorkflowExecutionOptions;
  persist?: boolean;
  stage?: string;
  reason?: string;
}
```

规则：

- `persist=true`：先写入持久配置，再执行
- `persist=false`：只用于本次执行
- `status="error"`：必须中止提交，并给出显式失败反馈；不得静默吞掉

### 4.3 Dashboard Workflow Options Contract

- 顶层 tab：`workflow-options`
- 子 tab：仅显示“可配置 workflow”
- 编辑行为：防抖持久化（无确认按钮）
- 可观测保存状态：`saving` / `saved` / `error`
- 处于 `workflow-options` tab 时，周期刷新与任务变更刷新不得重建表单

### 4.4 SkillRunner Runtime Options Mode Contract

- `skillrunner_mode=interactive`
  - 显示并生效：`interactive_auto_reply`、`hard_timeout_seconds`
  - 隐藏并丢弃：`no_cache`
- `skillrunner_mode=auto`
  - 显示并生效：`no_cache`、`hard_timeout_seconds`
  - 隐藏并丢弃：`interactive_auto_reply`
- `hard_timeout_seconds` 仅允许正整数；空值表示后端默认

### 4.5 Submit Dialog Shape Contract

- 提交弹窗仅保留页面内 `确认/取消` 按钮
- 不允许框架层重复注入额外取消按钮
- 弹窗布局采用紧凑尺寸，不与 Dashboard 配置页等比

### 4.6 Pass-Through Configurable Workflow Param Contract

- `pass-through` workflow 允许通过 `workflowParams` 持久化其业务配置
- 这些参数在 settings gate、Dashboard workflow options、applyResult 执行阶段读取到的值必须一致
- `Tag Manager` 的 GitHub 订阅/发布配置属于此类参数，不得绕过 `workflowSettingsJson`

### 4.7 Remote Sync Failure Contract

- configurable workflow 若在 `applyResult` 阶段执行远端订阅/发布
- 则失败不得 silent fail
- 至少需要满足：
  - 写 runtime log
  - 给用户显式反馈
  - 不破坏本地已保存状态

### 4.8 Tag Manager Dual-SSOT Contract

- `Tag Manager` 在 GitHub 配置不完整时运行于本地模式：
  - `local committed vocabulary` 是 controlled vocab 真源
  - staged -> controlled 立即提交本地 committed vocab
- `Tag Manager` 在 GitHub 配置完整时运行于订阅模式：
  - `remote committed snapshot` 是 controlled vocab 真源
  - staged 仅承担 pending/outbox 语义
  - staged -> controlled 需要经过事务化批次发布成功后才进入 committed
- 订阅模式下：
  - 返回 controlled 页必须刷新 remote committed snapshot
  - 未成功发布的 staged 条目不得出现在 controlled 视图
  - `Save` 失败时必须保留 draft 并提示可重试

## 5. Invariants

1. 执行链不读取 run-once map。  
2. 交互触发 workflow 时，提交门禁不可绕过（除非显式非交互调用）。  
3. 同批次 job 的 execution snapshot 必须一致。  
4. Dashboard 与提交弹窗都必须基于同一 host 侧 descriptor（字段定义、默认值、profile 列表）。  
5. `openWorkflowSettings` 偏好事件必须路由到 Dashboard `workflow-options`，不再打开旧设置对话框。  
6. 数值字段非法输入不得落盘，必须给出字段级错误提示。  
7. 运行时文案语义统一为“默认配置 / default settings”，不得回退到“持久/persistent”。  
8. 提交前 settings gate 失败时，workflow trigger 不得 silent no-op，必须写 runtime log 并提示用户。  

## 6. Sequence (Interactive Trigger)

1. user trigger workflow  
2. resolve `isWorkflowConfigurable`  
3. if false -> execute directly  
4. if true -> open submit web dialog  
5. dialog confirm -> receive `{executionOptions, persist}`  
6. if `persist` -> `updateWorkflowSettings`  
7. run preparation seam with `executionOptionsOverride`  
8. build requests / dispatch

## 7. Compatibility Notes

- 旧 run-once API 保留兼容壳，返回/写入不再影响执行语义。
- 旧 workflow settings 对话框不在主路径调用链中，仅保留兼容窗口。
