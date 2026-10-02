
# src/modules/workflowExecution/resultEnvelope.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/resultEnvelope.ts -->

解包 SkillRunner 返回结果的外层信封，识别带有 success_source / repair_level / artifacts 等特征字段时取出内部 data，否则按 result 嵌套逐层下探。
源码：[src/modules/workflowExecution/resultEnvelope.ts](../../../../../../src/modules/workflowExecution/resultEnvelope.ts)

## 符号（1）
<!-- node: function:src/modules/workflowExecution/resultEnvelope.ts:unwrapSkillRunnerResultJson -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| unwrapSkillRunnerResultJson | 函数 | 24–45 | 简单 | result、envelope、unwrapping、skillrunner | 1 | 识别并解包 SkillRunner 结果信封，取出内部真实结果对象。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](../../providers/skillrunner/client.ts.md) | src/providers/skillrunner/client.ts | SkillRunner HTTP 客户端：封装 job/bundle/result 与 http.steps 全套 REST 交互，含超时控制、连接治理、结果路径解析与运行态重连收敛。 |
| [resultContext.ts](resultContext.ts.md) | src/modules/workflowExecution/resultContext.ts | 构造工作流结果上下文：按多种候选路径与命名空间前缀定位 result.json / 产物文件并读取解析，为 apply 阶段提供统一的产物访问能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| unwrapSkillRunnerResultJson | 函数 | 24–45 | 识别并解包 SkillRunner 结果信封，取出内部真实结果对象。 |
