
# workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe/workflow.json
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe](../../../../modules/workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe.md)
<!-- node: config:workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe/workflow.json -->

调试探针工作流包「线性序列」变体的声明文件，描述以线性顺序串联多个探针步骤的执行图，用于回归验证 workflow 引擎的顺序调度语义。
源码：[workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe/workflow.json](../../../../../../workflows_builtin/workflow-debug-probe/debug-sequence-linear-probe/workflow.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../hooks/applyResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs | 调试探针工作流的通用结果回写 hook，按结果模式分派到产物提交或纯回显路径。 |
| [applySequenceProbeResult.mjs](../hooks/applySequenceProbeResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs | 序列探针的结果处理 hook，从序列执行结果中提取最终 payload 供后续步骤或工作流输出使用。 |
| [buildDebugApplyContractRequest.mjs](../hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs | 调试 apply 契约的请求构造器，生成单步与序列两种 apply 请求（目标父条目、参数、产物声明），是本调试探针包中逻辑最密集的模块。 |
