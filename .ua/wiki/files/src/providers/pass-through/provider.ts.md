
# src/providers/pass-through/provider.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/pass-through](../../../../modules/src/providers/pass-through.md)
<!-- node: file:src/providers/pass-through/provider.ts -->

透传 Provider：不发起真实网络调用，仅做请求契约校验与结果回显，用于验证工作流声明与后端契约链路是否连通。

规模：102 行
源码：[src/providers/pass-through/provider.ts](../../../../../../src/providers/pass-through/provider.ts)

## 符号（1）
<!-- node: class:src/providers/pass-through/provider.ts:PassThroughProvider -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| PassThroughProvider | 类 | 16–102 | 中等 | provider、passthrough、contract-validation | 0 | PassThrough Provider 实现：接受 pass-through 请求 kind，本地生成 request id 并立即回显请求元信息，不触碰任何外部服务。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [runtimeLogManager.ts](../../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](../types.ts.md) | src/providers/types.ts | Provider 层类型契约：定义 Provider 接口、supports/execute 参数、编排上下文与进度事件判别联合。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.ts](../registry.ts.md) | src/providers/registry.ts | Provider 注册表：集中登记四个内置 provider，按后端类型解析 provider，校验请求契约并执行请求，是工作流与 Provider 之间的唯一调度入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| PassThroughProvider | 类 | 16–102 | PassThrough Provider 实现：接受 pass-through 请求 kind，本地生成 request id 并立即回显请求元信息，不触碰任何外部服务。 |
