
# workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs -->

宿主队列探针的最小结果处理 hook，直接把宿主队列状态回填为步骤输出，用于观察排队行为。
源码：[workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 1–7 | 简单 | hook、探针、任务队列、透传 | 0 | 宿主队列探针结果处理：仅校验 ok 字段，成功即返回已应用标记。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 1–7 | 宿主队列探针结果处理：仅校验 ok 字段，成功即返回已应用标记。 |
