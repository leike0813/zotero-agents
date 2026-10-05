
# src/providers/registry.ts
所属分层：[Agent 协议与后端运行时](../../../layers/agent-runtime.md)  
所属目录：[src/providers](../../../modules/src/providers.md)
<!-- node: file:src/providers/registry.ts -->

Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。

规模：221 行
源码：[src/providers/registry.ts](../../../../../src/providers/registry.ts)

## 符号（7）
<!-- node: function:src/providers/registry.ts:createDefaultProviders -->
<!-- node: function:src/providers/registry.ts:executeWithProvider -->
<!-- node: function:src/providers/registry.ts:normalizeProviderRuntimeOptions -->
<!-- node: function:src/providers/registry.ts:normalizeWithSchema -->
<!-- node: function:src/providers/registry.ts:registerProvider -->
<!-- node: function:src/providers/registry.ts:resolveProvider -->
<!-- node: function:src/providers/registry.ts:resolveProviderById -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createDefaultProviders | 函数 | 22–29 | 简单 | factory、provider、bootstrap | 1 | 构造内置 provider 默认集合：SkillRunner、ACP、Generic HTTP 与 PassThrough。 |
| executeWithProvider | 函数 | 155–221 | 复杂 | provider、dispatch、contract、entry-point | 0 | 经 provider 执行请求的主入口：完成 kind/backend/provider 三重契约校验、运行时选项归一、调用 execute 并归一执行结果。 |
| normalizeProviderRuntimeOptions | 函数 | 116–127 | 中等 | normalization、provider、entry-point | 0 | Provider 运行时选项归一入口，解析出目标 provider 后应用其 schema。 |
| [normalizeWithSchema](../../../symbols/src/providers/registry.ts/normalizeWithSchema.md) | 函数 | 63–114 | 复杂 | normalization、schema、validation | 1 | 按 provider 声明的运行时选项 schema 归一运行时选项：裁剪未知键、按类型强转、枚举越界回退默认值。 |
| registerProvider | 函数 | 38–48 | 简单 | provider、registry、mutation | 0 | 注册或替换一个 provider 定义，重复注册时按 id 去重。 |
| resolveProvider | 函数 | 129–153 | 中等 | provider、resolution、contract | 0 | 按请求的 provider 标识与后端类型解析出可执行的 provider，并在不匹配时抛出契约错误。 |
| [resolveProviderById](../../../symbols/src/providers/registry.ts/resolveProviderById.md) | 函数 | 54–61 | 简单 | provider、resolution、query | 3 | 按 provider id 从注册表解析出 provider 实例。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [provider.ts](acp/provider.ts.md) | src/providers/acp/provider.ts | ACP Provider：把工作流请求转交 ACP 后端执行，负责模型选项折叠、SkillRun 编排调用与运行时选项归一。 |
| [provider.ts](generic-http/provider.ts.md) | src/providers/generic-http/provider.ts | 通用 HTTP Provider：按声明式请求对任意 REST 后端发起调用，支持模板插值、JSON path 提取、多步骤编排、上传与轮询。 |
| [provider.ts](pass-through/provider.ts.md) | src/providers/pass-through/provider.ts | 透传 Provider：不发起真实网络调用，仅做请求契约校验与结果回显，用于验证工作流声明与后端契约链路是否连通。 |
| [provider.ts](skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [requestContracts.ts](requestContracts.ts.md) | src/providers/requestContracts.ts | Provider 请求契约校验层：为每种 request kind 定义 provider/backend 兼容矩阵与负载校验规则，并在调度前断言契约成立。 |
| [runtimeLogManager.ts](../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [profile.ts](profile.ts.md) | src/providers/profile.ts | Provider Profile 层：把后端实例投影为可校验、可指纹化的 provider profile，并按 provider 运行时选项 schema 校验取值。 |
| [runSeam.ts](../modules/workflowExecution/runSeam.ts.md) | src/modules/workflowExecution/runSeam.ts | 工作流运行 seam：把已构建的执行单元投递给 Provider 队列，处理前台聚焦、SkillRunner 进度事件、任务仪表盘历史记录以及终态观察与 ACP 语义 trace 记录。 |
| [skillRunnerForegroundContinuation.ts](../modules/skillRunner/run/skillRunnerForegroundContinuation.ts.md) | src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts | SkillRunner 前台续跑引擎：在 sequence 步骤之间驱动后续任务、应用结果、推进根状态并收敛终态，是 SkillRunner 兼容路径的执行核心。 |
| [workflowDebugProbe.ts](../modules/workflow/ui/workflowDebugProbe.ts.md) | src/modules/workflow/ui/workflowDebugProbe.ts | 工作流调试探针：汇总运行时能力、Workflow Host 契约版本、工作流注册表与输入规划等检查项，执行后以对话框展示结果并可复制报告。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](../modules/workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| executeWithProvider | 函数 | 155–221 | 经 provider 执行请求的主入口：完成 kind/backend/provider 三重契约校验、运行时选项归一、调用 execute 并归一执行结果。 |
| normalizeProviderRuntimeOptions | 函数 | 116–127 | Provider 运行时选项归一入口，解析出目标 provider 后应用其 schema。 |
| registerProvider | 函数 | 38–48 | 注册或替换一个 provider 定义，重复注册时按 id 去重。 |
| resolveProvider | 函数 | 129–153 | 按请求的 provider 标识与后端类型解析出可执行的 provider，并在不匹配时抛出契约错误。 |
| [resolveProviderById](../../../symbols/src/providers/registry.ts/resolveProviderById.md) | 函数 | 54–61 | 按 provider id 从注册表解析出 provider 实例。 |
