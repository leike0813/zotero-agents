
# src/schemas/workflow.schema.json
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/schemas](../../../modules/src/schemas.md)
<!-- node: config:src/schemas/workflow.schema.json -->

单个工作流定义的 JSON Schema，完整描述 task/step 声明、输入物化、输入输出契约与构建策略等结构。
源码：[src/schemas/workflow.schema.json](../../../../../src/schemas/workflow.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [loaderContracts.ts](../workflows/loaderContracts.ts.md) | src/workflows/loaderContracts.ts | 工作流 manifest 契约：基于 JSON Schema 校验 manifest 形状，并补充选择计数、输入规划与序列步骤等跨字段语义校验。 |
