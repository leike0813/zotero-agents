
# src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts -->

请求适配器：把 SkillRunner 风格的 job 记录转换为统一的 ACP skill run 请求对象，屏蔽两种后端形态的差异。
源码：[src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts](../../../../../../../src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts)

## 符号（1）
<!-- node: function:src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts:adaptSkillRunnerJobToAcpSkillRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| adaptSkillRunnerJobToAcpSkillRun | 函数 | 40–128 | 中等 | acp、adapters、skillrunner、core | 0 | 把 SkillRunner job 映射为 ACP skill run 请求，补齐 skill 名、输入参数与 Zotero 宿主访问选项。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostAccessOptions.ts](../../../workflows/zoteroHostAccessOptions.ts.md) | src/workflows/zoteroHostAccessOptions.ts | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [preparationSeam.ts](../../workflowExecution/preparationSeam.ts.md) | src/modules/workflowExecution/preparationSeam.ts | 工作流 preparation seam：解析执行上下文、按选择与输入规划生成执行请求与执行单元，处理 SkillRunner Host Bridge 运行环境注入、Skill 展示名解析与无有效输入的降级路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| adaptSkillRunnerJobToAcpSkillRun | 函数 | 40–128 | 把 SkillRunner job 映射为 ACP skill run 请求，补齐 skill 名、输入参数与 Zotero 宿主访问选项。 |
