
# src/workflows/workflowLoggingOwner.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/workflowLoggingOwner.ts -->

工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。

规模：150 行
源码：[src/workflows/workflowLoggingOwner.ts](../../../../../src/workflows/workflowLoggingOwner.ts)

## 符号（3）
<!-- node: function:src/workflows/workflowLoggingOwner.ts:createWorkflowLoggingOwner -->
<!-- node: function:src/workflows/workflowLoggingOwner.ts:sanitizeWorkflowLogMessage -->
<!-- node: function:src/workflows/workflowLoggingOwner.ts:validateWorkflowLogRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createWorkflowLoggingOwner | 函数 | 125–150 | 简单 | factory、logging、owner、exported | 1 | 创建工作流日志 owner，绑定运行身份与 runtime log 写入器。 |
| sanitizeWorkflowLogMessage | 函数 | 23–34 | 简单 | redaction、logging、security | 0 | 在写入前脱敏日志消息中的 token、secret、API key 与本机绝对路径。 |
| validateWorkflowLogRequest | 函数 | 36–123 | 中等 | validation、logging、json | 0 | 把日志请求校验为严格 JSON 结构，剔除非法字段与超长内容。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeLogManager.ts](../modules/runtimeLogManager.ts.md) | src/modules/runtimeLogManager.ts | 插件运行时日志的唯一事实源：负责日志条目的规范化、内存保留预算裁剪、跨运行时持久化与水合，以及由日志派生出诊断包、事件时间线和 incident 链，是问题排查与用户提交诊断信息的基础设施。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkflowLoggingOwner | 函数 | 125–150 | 创建工作流日志 owner，绑定运行身份与 runtime log 写入器。 |
