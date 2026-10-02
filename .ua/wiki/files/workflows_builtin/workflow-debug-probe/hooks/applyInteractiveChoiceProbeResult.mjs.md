
# workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs -->

交互式选择探针的结果处理 hook，解析用户交互回复载荷并归一化为步骤输出，验证交互通道的往返契约。
源码：[workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 16–29 | 简单 | hook、探针、交互流程、结果校验 | 0 | 交互式选择探针结果处理：要求同时满足 ok 与 accepted_any_reply，输出 kind、message 与 warnings。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 16–29 | 交互式选择探针结果处理：要求同时满足 ok 与 accepted_any_reply，输出 kind、message 与 warnings。 |
