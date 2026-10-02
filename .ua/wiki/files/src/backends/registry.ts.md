
# src/backends/registry.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/backends](../../../modules/src/backends.md)
<!-- node: file:src/backends/registry.ts -->

后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。
源码：[src/backends/registry.ts](../../../../../src/backends/registry.ts)

## 符号（10）
<!-- node: function:src/backends/registry.ts:applyBackendIdMappingToTaskHistory -->
<!-- node: function:src/backends/registry.ts:applyBackendIdMappingToWorkflowSettings -->
<!-- node: function:src/backends/registry.ts:cloneBackendInstance -->
<!-- node: function:src/backends/registry.ts:listBackendsForProvider -->
<!-- node: function:src/backends/registry.ts:listBackendsForWorkflow -->
<!-- node: function:src/backends/registry.ts:loadBackendsRegistrySync -->
<!-- node: function:src/backends/registry.ts:normalizeBackendEntry -->
<!-- node: function:src/backends/registry.ts:normalizeBackendsDocument -->
<!-- node: function:src/backends/registry.ts:resolveBackendForWorkflow -->
<!-- node: function:src/backends/registry.ts:syncBackendReferenceState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyBackendIdMappingToTaskHistory | 函数 | 325–388 | 中等 | backends、migration、task-history、consistency | 0 | 把后端 id 映射应用到任务历史记录的重命名前缀上，保持历史任务可追溯。 |
| applyBackendIdMappingToWorkflowSettings | 函数 | 261–308 | 中等 | backends、migration、workflow、consistency | 0 | 后端 id 变更后重写工作流设置中的引用，避免历史配置指向已删除的后端。 |
| cloneBackendInstance | 函数 | 53–108 | 中等 | backends、utility、immutability | 0 | 深拷贝后端实例，隔离调用方对共享注册表对象的意外修改。 |
| listBackendsForProvider | 函数 | 839–849 | 简单 | backends、query、provider | 0 | 按 provider 类型列出后端实例，供 provider 层枚举可用连接。 |
| listBackendsForWorkflow | 函数 | 851–867 | 简单 | backends、query、workflow、catalog | 1 | 列出与某个工作流 manifest 兼容的后端，供设置页与 Host Bridge 目录使用。 |
| loadBackendsRegistrySync | 函数 | 720–799 | 中等 | backends、registry、persistence、cache | 0 | 同步加载并缓存 backends 注册表，读取失败时降级为默认后端并记录读诊断。 |
| normalizeBackendEntry | 函数 | 405–695 | 复杂 | normalization、backends、validation、core | 0 | 把一条松散的后端配置归一化为完整的后端实例，补齐 ACP 模型、reasoning effort、SkillRunner endpoint 等字段并剔除非法值。 |
| normalizeBackendsDocument | 函数 | 239–259 | 简单 | normalization、backends、validation、schema | 1 | 归一化整份 backends 文档，校验 schema 版本并把旧格式条目升级为当前形状。 |
| resolveBackendForWorkflow | 函数 | 869–934 | 中等 | backends、resolution、workflow、core | 0 | 为指定工作流挑选可用的后端实例，按兼容性优先级排序并支持按 id 显式指定。 |
| syncBackendReferenceState | 函数 | 697–711 | 简单 | backends、consistency、persistence、workflow | 0 | 同步工作流设置与任务历史中的后端引用状态，是 id 映射落盘的统一入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [identity.ts](identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [manifestContract.ts](../workflows/manifestContract.ts.md) | src/workflows/manifestContract.ts | 工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。 |
| [prefs.ts](../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [types.ts](types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [workflowSettingsDomain.ts](../modules/workflow/settings/workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [acpSessionManager.ts](../modules/acp/chat/acpSessionManager.ts.md) | src/modules/acp/chat/acpSessionManager.ts | ACP Chat 领域核心：按 backendId+conversationId 维护会话 runtime，负责连接、attach、prompt 发送与取消、权限审批、模型与模式切换、快照持久化节流与 workspace 事件派发。 |
| [acpSkillRunRecovery.ts](../modules/acp/skillRun/acpSkillRunRecovery.ts.md) | src/modules/acp/skillRun/acpSkillRunRecovery.ts | ACP skill run 恢复模块：在插件重启或会话中断后，从持久化记录重建 skill run 上下文、继续未完成的 sequence step，并回放已有结果。 |
| [acpSkillsWorkspaceSurface.ts](../modules/acp/skillRun/acpSkillsWorkspaceSurface.ts.md) | src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts | ACP Skills 工作区 surface adapter：将 skill run 状态与交互投影为 publication kinds，并读取各 workspace 区域内容、准备 owner 切换导航。 |
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [dashboardRuntime.ts](../modules/dashboard/dashboardRuntime.ts.md) | src/modules/dashboard/dashboardRuntime.ts | Task Dashboard 运行时：管理后端行读取、signature 计算与工作流摘要缓存，按需重建快照并驱动 Dashboard 页面数据源。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [hostBridgeDiagnosticsRoutes.ts](../modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts.md) | src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [hostBridgeWorkflowControl.ts](../modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [managementAuth.ts](managementAuth.ts.md) | src/backends/managementAuth.ts | 后端管理认证模块：读写 backends 配置中的管理凭据，生成 Basic Auth 头，保证管理面请求不被明文散落。 |
| [modelCache.ts](../providers/skillrunner/modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |
| [profile.ts](../providers/profile.ts.md) | src/providers/profile.ts | Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。 |
| [skillRunnerAutoReplyObserver.ts](../modules/skillRunner/run/skillRunnerAutoReplyObserver.ts.md) | src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts | SkillRunner 自动回复观察器：监控等待用户输入的 run，在用户回复前先接管交接，并在回复失败后重新对账，避免同一 run 被双重驱动。 |
| [skillRunnerBackendReachabilityCoordinator.ts](../modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts | 后端可达性探测的调度协调器：周期性扫描已配置后端、通过 management client 发起轻量探针，并把判定为长期不可达的后端自动禁用并弹出提示 toast。 |
| [skillRunnerForegroundContinuation.ts](../modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerRunDialog.ts](../modules/skillRunner/surface/skillRunnerRunDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerRunDialog.ts | SkillRunner 运行工作台的核心模块：管理运行条目与观察器、把后端事件与聊天历史投影为工作区视图模型、处理用户交互动作（回复、鉴权、权限、取消等），并向 Assistant Workspace 发布快照与 transcript 区域。 |
| [skillRunnerRunStore.ts](../modules/skillRunner/run/skillRunnerRunStore.ts.md) | src/modules/skillRunner/run/skillRunnerRunStore.ts | SkillRunner run 存储：run 记录与事件的唯一持久化 owner，负责记录创建、事件追加、状态投影与按 request/runKey 的查询。 |
| [skillRunnerTaskReconciler.ts](../modules/skillRunner/run/skillRunnerTaskReconciler.ts.md) | src/modules/skillRunner/run/skillRunnerTaskReconciler.ts | 任务台账对账器：周期性向后端查询运行终态，把结果回写到 jobQueue、taskRuntime 与 Dashboard 历史等本地台账，清理后端已遗忘的上下文，并处理后端不可用时的恢复与转交。 |
| [workflowExecute.ts](../modules/workflow/ui/workflowExecute.ts.md) | src/modules/workflow/ui/workflowExecute.ts | 工作流执行 UI 入口：读取当前选择与设置，经过 preparation seam 生成执行单元、duplicate guard 判重后交给 submission seam 提交，并处理不可运行/缺参数等前置失败。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsWebDialog.ts](../modules/workflow/settings/workflowSettingsWebDialog.ts.md) | src/modules/workflow/settings/workflowSettingsWebDialog.ts | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| listBackendsForProvider | 函数 | 839–849 | 按 provider 类型列出后端实例，供 provider 层枚举可用连接。 |
| listBackendsForWorkflow | 函数 | 851–867 | 列出与某个工作流 manifest 兼容的后端，供设置页与 Host Bridge 目录使用。 |
| loadBackendsRegistrySync | 函数 | 720–799 | 同步加载并缓存 backends 注册表，读取失败时降级为默认后端并记录读诊断。 |
| resolveBackendForWorkflow | 函数 | 869–934 | 为指定工作流挑选可用的后端实例，按兼容性优先级排序并支持按 id 显式指定。 |
| syncBackendReferenceState | 函数 | 697–711 | 同步工作流设置与任务历史中的后端引用状态，是 id 映射落盘的统一入口。 |
