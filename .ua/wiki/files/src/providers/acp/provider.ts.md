
# src/providers/acp/provider.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/acp](../../../../modules/src/providers/acp.md)
<!-- node: file:src/providers/acp/provider.ts -->

ACP Provider：把工作流请求转交 ACP 后端执行，负责模型选项折叠、SkillRun 编排调用与运行时选项归一。

规模：265 行
源码：[src/providers/acp/provider.ts](../../../../../../src/providers/acp/provider.ts)

## 符号（2）
<!-- node: class:src/providers/acp/provider.ts:AcpProvider -->
<!-- node: function:src/providers/acp/provider.ts:toPositiveInteger -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AcpProvider | 类 | 27–252 | 复杂 | provider、acp、backend-adapter、orchestration | 0 | ACP 协议 Provider 实现：声明支持的请求种类与运行时选项 schema，折叠 provider 作用域的模型选择，并委托 ACP SkillRunner 编排器执行任务。 |
| toPositiveInteger | 函数 | 254–265 | 简单 | normalization、utility、pure | 0 | 把任意输入归一为正整数，非法或非正值回退到给定默认值。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpModelOptionFolding.ts](../../modules/acp/chat/acpModelOptionFolding.ts.md) | src/modules/acp/chat/acpModelOptionFolding.ts | ACP 模型选项折叠模块：把后端返回的扁平模型列表按 provider 与 reasoning effort 分组折叠，供聊天面板渲染并保证选中值能还原为原始 model id。 |
| [acpSessionConfigOptions.ts](../../modules/acp/chat/acpSessionConfigOptions.ts.md) | src/modules/acp/chat/acpSessionConfigOptions.ts | ACP 会话运行时选项（mode / 模型 / 推理强度）的归一化与读模型：把后端 config options 折叠成可选列表，并推导当前选择与 reasoning 来源。 |
| [acpSkillRunnerOrchestrator.ts](../../modules/acp/skillRun/acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [contracts.ts](../contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [runtimeLogManager.ts](../../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |
| [types.ts](../types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.ts](../registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| AcpProvider | 类 | 27–252 | ACP 协议 Provider 实现：声明支持的请求种类与运行时选项 schema，折叠 provider 作用域的模型选择，并委托 ACP SkillRunner 编排器执行任务。 |
