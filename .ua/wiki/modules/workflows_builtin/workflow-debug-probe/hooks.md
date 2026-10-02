
# workflows_builtin/workflow-debug-probe/hooks
> 目录聚合页：9 个文件、33 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs.md) | 文件 | 14 | 调试 apply 契约的产物回写 hook，负责把 apply 阶段生成的 bundle（产物文件、manifest、附件源）解析、校验并写入 Zotero，同时处理单条与序列两种结果模式。 |
| [workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs.md) | 文件 | 2 | 在已有父条目上下文上复用 bundle 回写逻辑的薄包装 hook，解析请求指定的父条目后委托给通用 applyDebugApplyContractResult 实现。 |
| [workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applyHostBridgeConnectivityProbeResult.mjs.md) | 文件 | 1 | Host Bridge 连通性探针的结果处理 hook，校验探针返回的 payload 结构并将其转换为工作流步骤输出。 |
| [workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applyHostQueueProbeResult.mjs.md) | 文件 | 1 | 宿主队列探针的最小结果处理 hook，直接把宿主队列状态回填为步骤输出，用于观察排队行为。 |
| [workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applyInteractiveChoiceProbeResult.mjs.md) | 文件 | 1 | 交互式选择探针的结果处理 hook，解析用户交互回复载荷并归一化为步骤输出，验证交互通道的往返契约。 |
| [workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applyResult.mjs.md) | 文件 | 1 | 调试探针工作流的通用结果回写 hook，按结果模式分派到产物提交或纯回显路径。 |
| [workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/applySequenceProbeResult.mjs.md) | 文件 | 1 | 序列探针的结果处理 hook，从序列执行结果中提取最终 payload 供后续步骤或工作流输出使用。 |
| [workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | 文件 | 9 | 调试 apply 契约的请求构造器，生成单步与序列两种 apply 请求（目标父条目、参数、产物声明），是本调试探针包中逻辑最密集的模块。 |
| [workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs](../../../files/workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs.md) | 文件 | 3 | 针对已有父条目场景构造 apply 请求的构建器，从工作流参数与选中条目解析出目标父条目后调用通用契约请求构造逻辑。 |
