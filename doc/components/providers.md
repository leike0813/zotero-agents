# Providers 组件说明

## 目标

提供“后端协议适配层”，将 Workflow 构建出的 provider-specific request 执行为统一结果。

## 当前实现

- Provider 注册中心：`src/providers/registry.ts`
- 内置 Provider：
  - `skillrunner`：`src/providers/skillrunner/provider.ts`
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

- Provider 可声明可调选项 schema（如 skillrunner 的 `engine/model/no_cache`）
- Provider 可返回动态枚举（如 `model` 随 `engine` 变化）
- Provider 负责对 runtime options 做 normalize
- SkillRunner 的 engine/model 枚举来源：
  - backend 实时拉取并按 backend 维度缓存（优先）
  - 静态内置目录（兜底）
  - 刷新策略：startup 首刷 + 每小时自动刷新 + Backend Manager 行级手动刷新

## skillrunner 语义（当前）

- 支持 request kind：
  - `skillrunner.job.v1`
- 执行链分两阶段：
  - 提交阶段（Provider/Queue）：`POST /v1/jobs` -> `POST /v1/jobs/{request_id}/upload` -> 首轮轮询
  - 收敛阶段（Reconciler）：对 deferred 任务持续轮询后端状态，直至终态
- progress 事件：
  - create 成功后发出 `request-created`（含 `requestId`）
  - 供 JobQueue 在 running 阶段写回 `job.meta.requestId`，让 Dashboard 立即可见 run 入口
- deferred 语义：
  - 当后端进入 `waiting_user` / `waiting_auth`（或其他非终态）时，Provider 返回 `status=deferred`
  - 任务后续状态推进由后台收敛器负责，前端不再用本地超时推断终态
- 终态处理：
  - `succeeded`：收敛器触发一次 `applyResult`
  - `failed` / `canceled`：收敛器写入终态并停止追踪
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
