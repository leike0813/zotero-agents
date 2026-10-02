
# workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs -->

调试探针工作流的通用结果回写 hook，按结果模式分派到产物提交或纯回显路径。
源码：[workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 1–19 | 中等 | hook、桥接、入口、调试探针 | 0 | 调试探针的桥接入口：从运行时取出 addon 上的 workflowDebugProbe bridge，校验 selectionContext 后把执行委派给 bridge.run。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 1–19 | 调试探针的桥接入口：从运行时取出 addon 上的 workflowDebugProbe bridge，校验 selectionContext 后把执行委派给 bridge.run。 |
