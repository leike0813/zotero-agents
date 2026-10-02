
# buildRequestImpl
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildRequestImpl -->

按工作流 ID 分派构造单步 job 或多步 sequence 请求，覆盖 bundle/result 模式、workspace 新建与复用、交互式步骤等全部调试场景。
类型：函数  
复杂度：复杂  
入边数：1  
标签：请求构造、分派、序列编排、调试探针  
所属文件：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md)
源码：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:137](../../../../../../../workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs#L137)

## 语言要点

以 workflowId 的 switch 集中枚举所有调试变体，使各探针共享同一父条目创建与参数结构。

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildRequest](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:310–312 | 请求构造的公开入口，容错地委派到内部实现 buildRequestImpl。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildSequenceRequest](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:113–135 | 组装 skillrunner.sequence.v1 序列请求，绑定目标父条目、步骤列表、最终步骤 ID 与更长的轮询超时。 |
| [buildSequenceStep](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:81–111 | 构造序列中的一个步骤声明，包含 skill、workspace 策略、fetch_type、可选 apply_result 契约与步骤参数。 |
| [buildSingleRequest](buildSingleRequest.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:53–79 | 构造单个 skillrunner.job.v1 请求：选定探针 skill、目标父条目、fetch_type 与轮询参数。 |
| [createTestParent](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:21–41 | 为每次调试运行创建一条临时期刊条目作为目标父条目，并返回条目、标题与工作流 ID。 |
| [randomRunKey](randomRunKey.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:9–11 | 生成短随机 run key，用于区分同一次调试运行产生的条目、标签与附件。 |
| [resolveWorkflowParams](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:13–19 | 从执行选项读取 run_result_step / skip_result_step 开关，控制序列是否追加或跳过结果步骤。 |
