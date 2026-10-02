
# workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs -->

序列探针的结果处理 hook，从序列执行结果中提取最终 payload 供后续步骤或工作流输出使用。
源码：[workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 16–33 | 简单 | hook、探针、结果校验、序列执行 | 0 | 序列探针结果处理：要求 status 为 ok，输出 probeId、checks 与序列信息，失败时带上 probe_id 与 status 抛出错误。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 16–33 | 序列探针结果处理：要求 status 为 ok，输出 probeId、checks 与序列信息，失败时带上 probe_id 与 status 抛出错误。 |
