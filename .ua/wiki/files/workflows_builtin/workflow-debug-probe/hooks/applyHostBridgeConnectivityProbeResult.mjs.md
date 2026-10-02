
# workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs -->

Host Bridge 连通性探针的结果处理 hook，校验探针返回的 payload 结构并将其转换为工作流步骤输出。
源码：[workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 16–32 | 简单 | hook、探针、host-bridge、结果校验 | 0 | Host Bridge 连通性探针结果处理：要求 ok 为 true，输出 checks、connection 与 diagnostics，失败时报告 failure_code。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 16–32 | Host Bridge 连通性探针结果处理：要求 ok 为 true，输出 checks、connection 与 diagnostics，失败时报告 failure_code。 |
