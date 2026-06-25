# Providers 组件说明

## 目标

提供“后端协议适配层”，将 Workflow 构建出的 provider-specific request 执行为统一结果。

## 当前实现

- Provider 注册中心：`src/providers/registry.ts`
- 内置 Provider：
  - `skillrunner`：`src/providers/skillrunner/provider.ts`
  - `acp`：`src/providers/acp/provider.ts`
  - `generic-http`：`src/providers/generic-http/provider.ts`
  - `pass-through`：`src/providers/pass-through/provider.ts`
- Backend 兼容性：先由 workflow `provider` 派生候选 backend type；`request.kind` 不参与兼容性推断。
- Provider 执行解析：在已选定 backend 后，按 `requestKind + backend.type` 解析具体 Provider。

## 输入

- `requestKind`：由 Workflow manifest/request 与 backend.type 共同决定，仅描述请求协议/形状
- `request`：由 `compileDeclarativeRequest` 或 `hooks.buildRequest` 产出
- `backend`：由 backend registry + workflow settings 解析出的 profile；对本地 provider（如 `pass-through`）可为 runtime 构建的虚拟 backend（`local://...`）
- `providerOptions`：运行时选项（持久化或 run-once 覆盖）
- `onProgress?`：可选运行进度回调（用于 running 阶段元数据增量同步）

## 输出

统一返回 `ProviderExecutionResult`：

- `status: "succeeded"`
- `requestId: string`
- `fetchType: "bundle" | "result"`
- `bundleBytes?`
- `resultJson?`
- `responseJson?`

## Runtime 选项能力

- Provider 可声明可调选项 schema（如 skillrunner 的 `engine/provider_id/model/effort/no_cache/interactive_auto_reply/hard_timeout_seconds`）
- Provider 可返回动态枚举（如 `model` 随 `engine` 变化）
- Provider 负责对 runtime options 做 normalize
- `providerOptions` 是提交时运行期 override。对于同名 runtime option，合法的
  `providerOptions` 值覆盖 workflow 编译出的 request payload 中已有的
  `runtime_options` 值。
- SkillRunner 的 engine/model 枚举来源：
  - backend 实时拉取并按 backend 维度缓存（优先）
  - 静态内置目录（兜底）
  - 刷新策略：startup 首刷 + 每小时自动刷新 + Backend Manager 行级手动刷新

## skillrunner 语义（当前）

- 支持 request kind：
  - `skillrunner.job.v1`
- 当前支持的运行时选项：
  - `engine` — 推理引擎
  - `provider_id` — 引擎内提供者选择
  - `model` — 模型选择（随 engine/provider 动态刷新）
  - `effort` — 推理努力度（如 `"default"` / `"high"`）
  - `no_cache` — 是否绕过缓存
  - `interactive_auto_reply` — 交互模式自动回复
  - `hard_timeout_seconds` — 任务硬超时
- 执行链分两阶段：
  - 提交阶段（Provider/Queue）：`POST /v1/jobs` -> `POST /v1/jobs/{request_id}/upload` -> `request-ready`
  - 收敛阶段（Reconciler）：观察后端状态、确认终态、获取 `/result` 或 `/bundle`、规范化结果、执行 deferred apply
- progress 事件：
  - create 成功后发出 `request-created`（含 `requestId`），只用于本地审计和后续 upload 关联
  - upload/初始化成功后发出 `request-ready`，这是 SkillRunner run 第一次进入可见投影的边界
- deferred 语义：
  - Provider 在 `request-ready` 后返回 `status=deferred`
  - 任务后续状态推进由后台收敛器负责，Provider 不继续等待终态，也不获取 result/bundle
- 终态处理：
  - `succeeded`：收敛器获取并规范化 result/bundle，写入 result/handoff projection，并触发一次 deferred apply
  - `failed` / `canceled`：收敛器写入终态并停止追踪
- apply 状态：
  - run state 与 apply state 分离；terminal success 后仍可能处于 `pending` / `running` / `failed` apply
  - result 解析、bundle 产物缺失、Host Bridge、apply hook 等 Host 侧异常必须写成可见 failed 或 retry state
- mixed-input 合同：
  - `parameter` 保持 object
  - `input` 允许任意 JSON（string/array/object）
  - 当存在 `upload_files` 时，`input` 必须是 object，且每个 `upload_files[].key` 都要在 `input.<key>` 显式声明文件相对路径
  - `input.<key>` 路径必须是 `uploads/` 根下相对路径（不含 `uploads/` 前缀）；provider 会按该路径写入 zip entry
- 执行模式透传：
  - workflow `execution.skillrunner_mode` 会映射为 `/v1/jobs` create body 的 `runtime_options.execution_mode`
  - 主链路仍是 `/v1/jobs*`，management API 仅用于观察与交互（reply/auth-import）
- 状态机 SSOT：
  - 统一消费模块：`src/modules/skillRunnerProviderStateMachine.ts`
  - 详细文档见：`doc/components/skillrunner-provider-state-machine-ssot.md`

## SkillRunner 管理 UI 与管理 API（当前）

- Backend Manager 为 `type=skillrunner` 的 profile 提供“进入管理页面”动作。
- 插件在 Zotero 对话框内直接加载 `${baseUrl}/ui`，复用后端原生管理 UI。
- 该能力与 provider 执行链解耦：不影响 `skillrunner.job.v1` 请求与执行语义。
- Dashboard 内置 SkillRunner 观察页使用 jobs 语义（`/v1/jobs/*`）读取 run/chat/pending 并支持 reply/cancel；management API 仅保留 run 列表与管理视图能力。
- SkillRunner run workspace 从 `SkillRunnerRunStore` 读取投影；新提交 run 不自动选中，当前 run 切换只由用户动作驱动。
- UI chat stream 使用每 backend 最多两条 foreground stream 的 MRU warm pool；stream 状态不驱动业务终态。
- management API 的鉴权使用 backend profile 可选字段 `management_auth`（仅 SkillRunner）：
  - 支持 `none` 与 `basic`
  - 首次访问时可弹窗采集 basic 凭据
  - 401 时触发重新输入并覆盖保存
- `management_auth` 仅用于 Dashboard 管理能力，不注入 `skillrunner.job.v1` 执行链请求。

## generic-http 语义（当前）

- 支持 request kind：
  - `generic-http.request.v1`（单请求）
  - `generic-http.steps.v1`（多步请求流水线）
- `generic-http.steps.v1` 能力：
  - 按声明顺序执行 `steps`
  - 支持变量提取与插值（`extract` + `{var}`）
  - 支持轮询语义（`repeat_until` + `poll.interval_ms/timeout_ms`）
  - 支持失败条件（`fail_when`）
  - 支持二进制上传/下载（`binary_from` / `response_type=bytes`）
- headers 合并优先级：
  - backend defaults headers
  - backend bearer auth（`Authorization: Bearer <token>`）
  - step/request headers（同名覆盖前者）
- 终态返回：
  - 最后一步为 bytes -> `fetchType="bundle"`
  - 否则 -> `fetchType="result"`

## pass-through 语义

- 固定 request kind：`pass-through.run.v1`
- 不发起网络请求，直接返回统一 `ProviderExecutionResult`
- `fetchType` 固定为 `result`
- `resultJson` 始终包含：
  - `selectionContext`（完整选择上下文）
  - `parameter`（workflow 参数）
  - `requestMeta`（`targetParentID/taskName/sourceAttachmentPaths`）

## acp 语义

- 支持 request kind：
  - `acp.prompt.v1`：向 ACP agent 发送单轮 prompt
  - `acp.skill.run.v1`：在 ACP 后端执行 skill run
  - `skillrunner.sequence.v1`：执行多步序列，由 workflow 运行时按目标 backend 编译为 ACP skill run 或 SkillRunner job step，provider 层不直接处理 sequence request
- `acp.prompt.v1` 语义：
  - 通过 sidecar global chat surface 处理
  - 支持 `hostContext` 传递上下文
- `acp.skill.run.v1` 语义：
  - 委托给 `executeAcpSkillRunnerJob` 处理
  - 支持 `input`、`parameter`、`runtime_options` 等标准负载字段
  - 支持 `runtime_options.workspace` 模式（`"new"` / `"reuse"`，句柄字段为 `workflow_run_id`）
  - 读取旧 ACP 请求时仍接受 `runtime_options.workflow_workspace` 作为 legacy fallback
- `skillrunner.sequence.v1` 语义：
  - 作为 ACP / SkillRunner 兼容工作流编排的序列请求
  - ACP backend step 使用 `runtime_options.workspace.workflow_run_id`
  - SkillRunner backend step 使用 `runtime_options.workspace.request_id`
  - SkillRunner step 0 不带 workspace reuse；step N 复用上一成功 SkillRunner step 的后端 `request_id`
  - SkillRunner sequence continuation 依赖 step execution、workspace reuse 与 required handoff，不依赖 Host-side apply 成功
  - provider 执行层对此 request kind 抛出错误（必须由 workflow 运行时编排处理）
  - 详细合同见 `doc/skillrunner-sequence-recovery-state-machine.md`
- Runtime options：
  - `acpModeId`：ACP 模式选择
  - `acpModelId`：ACP 模型选择
  - `acpReasoningEffort`：推理努力度
  - `autoApproveAcpPermissions`：是否自动审批 ACP 权限请求
  - `hard_timeout_seconds`：ACP SkillRunner-compatible run 的本地硬超时断连保护；仅接受正整数，空值表示使用 runner/default 合成结果
- ACP SkillRunner-compatible run 的 `hard_timeout_seconds` 覆盖优先级从低到高：
  1. `runner.json.runtime.default_options.hard_timeout_seconds`
  2. request payload `runtime_options.hard_timeout_seconds`
  3. `providerOptions.hard_timeout_seconds`
  若以上来源都没有合法正整数，则使用内置默认 `1200`。合成结果只用于 ACP
  本地执行控制，不回写原始 request payload。

## Backend 兼容性

- `provider = "acp"`：仅兼容 `type=acp` 的 backend。
- `provider = "skillrunner"`：当前兼容 `type=skillrunner` 与 `type=acp` 的 backend；这是本地 ACP skill-run bridge 的临时兼容规则。
- 其他 provider：仅兼容同名 backend type。
- `request.kind` 不用于推断兼容 backend；缺少 `provider` 的 workflow 为无效或不可执行状态。

## 失败语义

- `requestKind` 与 `backend.type` 不匹配：Provider 必须抛错（拒绝执行）
- payload `kind` 不符合 Provider 合同：Provider 必须抛错
- 上述错误会由 workflow 执行层汇总为失败条目并反馈到任务汇总消息

## 边界

- Provider 不做业务落库（由 Workflow `applyResult` + handlers 负责）
- Provider 不直接操作 UI
- Provider 不依赖 workflow 私有逻辑（只消费 request payload）

## 备注

`transport` 目录当前未启用。网络执行逻辑目前在 Provider 内部实现（例如 skillrunner client）。

## 测试点（TDD）

- registry 选择逻辑
- runtime options schema 与动态枚举
- provider 执行成功/失败路径
- provider 与 backend type 不匹配时的错误行为
