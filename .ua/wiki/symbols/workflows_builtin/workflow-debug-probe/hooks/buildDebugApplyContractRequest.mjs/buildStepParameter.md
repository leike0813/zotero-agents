
# buildStepParameter
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildStepParameter -->

生成步骤参数：workflow/step/run 标识与可读消息，result 模式额外附带调试标签。
类型：函数  
复杂度：简单  
入边数：2  
标签：参数构造、调试标记、工具函数  
所属文件：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md)
源码：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:43](../../../../../../../workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs#L43)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildSequenceStep](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:81–111 | 构造序列中的一个步骤声明，包含 skill、workspace 策略、fetch_type、可选 apply_result 契约与步骤参数。 |
| [buildSingleRequest](buildSingleRequest.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:53–79 | 构造单个 skillrunner.job.v1 请求：选定探针 skill、目标父条目、fetch_type 与轮询参数。 |

## 调用

该符号没有记录对外调用。
