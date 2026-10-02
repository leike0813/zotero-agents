
# src/modules/workflowExecution/valuePath.ts
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflowExecution](../../../../modules/src/modules/workflowExecution.md)
<!-- node: file:src/modules/workflowExecution/valuePath.ts -->

工作流执行期的通用取值工具：比较原始值相等性并按点分路径安全读取对象属性。

规模：37 行
源码：[src/modules/workflowExecution/valuePath.ts](../../../../../../src/modules/workflowExecution/valuePath.ts)

## 符号（2）
<!-- node: function:src/modules/workflowExecution/valuePath.ts:getDotPath -->
<!-- node: function:src/modules/workflowExecution/valuePath.ts:primitiveEquals -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getDotPath | 函数 | 21–37 | 简单 | utility、value-access、pure | 0 | 按点分路径从源对象逐层安全取值，路径非法或中间层非普通对象时返回 undefined。 |
| primitiveEquals | 函数 | 9–19 | 简单 | utility、comparison、pure | 0 | 仅对 null/字符串/数字/布尔做严格相等比较，复合值一律返回 false，避免误判对象等价。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sequenceRuntime.ts](sequenceRuntime.ts.md) | src/modules/workflowExecution/sequenceRuntime.ts | SkillRunner 序列工作流的运行时状态机：逐步构建步骤请求、注入 handoff 绑定与附件映射、驱动 apply 与生命周期收敛，并处理断点续跑与终态结果组装。 |
| [sequenceStateStore.ts](sequenceStateStore.ts.md) | src/modules/workflowExecution/sequenceStateStore.ts | 序列运行状态的持久化 store：解析与校验持久化条目、迁移旧格式、按事件归约更新 run 状态，并向订阅者广播变更供 UI 观察。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getDotPath | 函数 | 21–37 | 按点分路径从源对象逐层安全取值，路径非法或中间层非普通对象时返回 undefined。 |
| primitiveEquals | 函数 | 9–19 | 仅对 null/字符串/数字/布尔做严格相等比较，复合值一律返回 false，避免误判对象等价。 |
