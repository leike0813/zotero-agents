
# workflows_builtin/workflow-debug-probe/workflow.json
所属分层：[内置工作流包与 Skill 资产](../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe](../../../modules/workflows_builtin/workflow-debug-probe.md)
<!-- node: config:workflows_builtin/workflow-debug-probe/workflow.json -->

根调试探针工作流定义（schemaVersion 2，provider pass-through，debug_only），声明 selection 型输入、无需选择即可触发，并挂载 applyResult 钩子。
源码：[workflows_builtin/workflow-debug-probe/workflow.json](../../../../../workflows_builtin/workflow-debug-probe/workflow.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](hooks/applyResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs | 调试探针工作流的通用结果回写 hook，按结果模式分派到产物提交或纯回显路径。 |
