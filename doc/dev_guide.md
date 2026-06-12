# Zotero-Skills 开发指南（当前实现）

本文档只描述“已经实现并在代码中生效”的架构与约束。

## 1. 开发流程

- 使用 TDD：先写测试，再实现
- 改动后至少执行类型检查
- 交付前执行 Zotero 环境回归测试

## 2. 测试入口

- `npm run test`：Zotero lite
- `npm run test:full`：Zotero full
- `npm run test:node`：Node lite
- `npm run test:node:full`：Node full

`lite/full` 具体规则见 `doc/testing-framework.md`。

## 3. 核心组件（当前）

- `src/modules/selectionContext.ts`：选择上下文构建
- `src/workflows/*`：workflow 加载与请求构建
- `src/backends/*`：backend profile 读取与解析
- `src/providers/*`：provider 执行层
- `src/jobQueue/manager.ts`：任务队列
- `src/modules/workflowExecute.ts`：执行主链路
- `src/modules/*Dialog.ts`：设置/Dashboard/日志窗口
- `src/modules/taskDashboardHistory.ts`：Dashboard 历史持久层（30 天保留）
- `src/modules/skillRunnerManagementDialog.ts`：SkillRunner 管理页内嵌宿主
- `src/providers/skillrunner/managementClient.ts`：SkillRunner 管理 API 客户端（Dashboard 观察页）
- `src/modules/workflowDebugProbe.ts`：Debug Probe 诊断 workflow 支持
- `src/modules/workflowPackageDiagnostics.ts`：Workflow Package 诊断工具
- `src/modules/skillRunnerCtlBridge.ts`：SkillRunner 本地后端控制桥接
- `src/modules/skillRunnerTaskReconciler.ts`：SkillRunner 任务收敛器
- `src/modules/workflowExecution/deferredCompletionTracker.ts`：延迟完成追踪器

说明：`src/transport/` 当前未启用，网络逻辑在 provider 内部实现。

## 4. Backends 配置模型

不再使用文件型 `backends.json` 作为运行时主配置。当前使用：

- prefs key：`backendsConfigJson`
- 管理入口：Backend Manager 窗口

配置结构（示意）：

```json
{
  "backends": [
    {
      "id": "backend-skillrunner-primary",
      "type": "skillrunner",
      "baseUrl": "http://127.0.0.1:8030",
      "auth": { "kind": "none" },
      "defaults": { "timeout_ms": 600000 }
    }
  ]
}
```

约束：

- 整体 JSON 非法：阻断 workflow 执行
- 单条 backend 非法：仅影响绑定该 backend/provider 的 workflow
- SkillRunner profile 行支持“进入管理页面”，使用当前行 `baseUrl` 打开 `${baseUrl}/ui`
- SkillRunner 可选 `management_auth` 字段，仅用于 Dashboard 管理 API 调用，不影响执行链
- `management_auth.kind="basic"` 时凭据可由 Dashboard 首次访问弹窗采集并回写配置；401 时会提示重输并覆盖

## 5. Workflow 声明模型

当前 manifest 关键字段：

- `id`, `label`, `provider`, `hooks.applyResult`（核心）
- `inputs`（声明式一阶筛选）
- `request`（声明式请求）
- `parameters`（workflow 参数 schema）
- `execution` / `result`（执行与返回约束）

参数声明补充：

- `parameters.<key>.allowCustom` 可用于 `type=string` + `enum` 场景。
- `allowCustom=true` 时，`enum` 是推荐值集合，允许用户输入并保存枚举外字符串。
- 未声明 `allowCustom` 或为 `false` 时，`enum` 继续作为严格约束。

唯一契约来源（SSOT）：

- `src/schemas/workflow.schema.json`
- loader 在扫描 `workflow.json` 时直接使用该 schema 做结构校验
- 作者编写 manifest 时应以该 schema 为准，而不是阅读 loader 源码猜测规则

已废弃字段（出现即非法）：

- 顶层 `backend`, `defaults`
- `request.result`
- `request.create.engine/model/parameter/runtime_options`

## 6. Provider 模型

当前内置 provider：

- `skillrunner`
- `acp`
- `generic-http`
- `pass-through`

Provider 解析逻辑：

- workflow `provider` 是 backend 兼容性的唯一来源：`acp -> acp`，`skillrunner -> skillrunner/acp`，其他 provider 只匹配同名 backend type。
- `requestKind + backend.type` 只用于已选定 backend 后的 provider 执行解析，不用于推断 backend 兼容性。

Provider runtime options：

- 由 provider 自身声明 schema
- workflow settings 可配置 persisted/run-once 两套参数
- skillrunner 支持 `engine/provider_id/model/effort/no_cache/interactive_auto_reply/hard_timeout_seconds`（model 随 engine/provider 动态刷新）

SkillRunner skill source：

- `skillrunner.job.v1` 默认使用插件侧本地 skill 包路线：`request.create.skill_id`
  用于解析 `skills/` / `skills_builtin/` 中的同名 skill，插件运行时将该 skill
  目录打包上传给后端。
- 默认路线按当前 `reference/Skill-Runner` 源码执行：先 `POST /v1/jobs`
  且 create body 带 `skill_source="temp_upload"`、不带 `skill_id`，随后
  `POST /v1/jobs/{request_id}/upload` 上传 multipart 字段 `skill_package`；
  有输入文件时同一请求还会带字段 `file`。
- 若 workflow 确实要调用后端已安装 skill，可声明
  `request.create.skill_source="installed"`；此时 provider 保留旧行为，在
  `/v1/jobs` create body 中发送 `skill_id`，且不上传 `skill_package`。
- `reference/Skill-Runner/docs/api_reference.md` 中的 `/v1/temp-skill-runs`
  文档路线与当前参考后端源码不一致；本项目执行链路以当前源码中的
  `/v1/jobs + skill_source=temp_upload` 为准。

## 7. 执行链路

1. 从当前选择构建 `SelectionContext`
2. `executeBuildRequests` 产生每个合法输入单元的 request
3. 解析 workflow execution context（backend/profile/options）
4. JobQueue 执行 provider
5. 根据 provider 结果调用 `applyResult`
6. 汇总 succeeded/failed/skipped 消息

## 8. Dashboard 与日志窗口

Dashboard 当前能力：

- Browser-hosted 本地 Web 面板：
  - host：`src/modules/taskManagerDialog.ts`
  - web panel：`addon/content/dashboard/*`
  - host/web 桥接：`dashboard:init` / `dashboard:snapshot` / `dashboard:action`
- 整页 tab：
  - Home：总任务统计 + 当前运行任务表格
  - backend 页面：按 backend 分组表格与操作区
- Detail：
  - Generic HTTP：任务表格 + runtime logs 过滤
  - SkillRunner：run 表格、状态、聊天记录、pending、reply、cancel
- SkillRunner 观察链路：SSE 主通道 + history 补偿
- 历史持久化：本地 JSON，固定保留 30 天
- backend 视图数据源：running 任务 + 历史任务合并
- SkillRunner requestId 早可见：`/v1/jobs` create 后 progress 回写 `job.meta.requestId`
- Pass-through：不展示、不计数、不入历史

- 执行链与 Dashboard 边界：
  - Dashboard 的 management auth 不注入 provider 执行请求
  - provider 执行链仍走 `/v1/jobs*`

Dashboard 当前不支持：

- 后端 runs 的全量视图（当前仅展示本前端发起并落到本地历史的记录）

日志窗口当前能力：

- 独立日志窗口（右键菜单可打开）
- 运行时日志分级过滤（默认显示全部级别）
- 支持复制可读 JSON/NDJSON 诊断信息用于 issue 与调试

日志窗口边界：

- 仅保留运行时内存日志（插件会话结束后自然清理）

## 9. 文档索引

- 架构总览：`doc/architecture-flow.md`
- Workflows：`doc/components/workflows.md`
- Workflow Package Schema：`src/schemas/workflow-package.schema.json`
- Workflow Manifest Schema：`src/schemas/workflow.schema.json`
- Workflow Hook Helpers：`doc/components/workflow-hook-helpers.md`
- Zotero Host Capability Broker SSOT：`doc/components/zotero-host-capability-broker-ssot.md`
- Plugin Skill Registry / ACP Compatible SSOT：`doc/components/plugin-skill-registry-and-acp-compatible-ssot.md`
- Runtime Persistence Governance SSOT：`doc/components/runtime-persistence-governance-ssot.md`
- Synthesis Layer 文档入口：`doc/synthesis-layer/README.md`
- Synthesis Library SSOT / Sidecar Cache：`doc/synthesis-layer/library-ssot-and-sidecar-cache.md`
- Synthesis Layer 分域模型：`doc/synthesis-layer/domain-model.md`
- Synthesis Registry/Citation Graph：`doc/synthesis-layer/registry-and-citation-graph.md`
- Synthesis Topics/Discovery：`doc/synthesis-layer/topics-and-discovery.md`
- Synthesis Runtime/Rebuild：`doc/synthesis-layer/runtime-and-rebuild.md`
- Providers：`doc/components/providers.md`
- Selection/Context：`doc/components/selection-context.md`
- Selection/Context Schema：`doc/components/selection-context.schema.json`
- Handlers：`doc/components/handlers.md`
- Job Queue：`doc/components/job-queue.md`
- Transport：`doc/components/transport.md`
- Local Cache（占位设计）：`doc/components/local-cache.md`
- UI Shell：`doc/components/ui-shell.md`
- Mock：`doc/components/zotero-mock.md`
- 测试：`doc/testing-framework.md`
- SkillRunner 状态机 SSOT：`doc/components/skillrunner-provider-state-machine-ssot.md`
- 本地后端一键部署状态机：`doc/components/skillrunner-local-runtime-oneclick-state-machine-ssot.md`
