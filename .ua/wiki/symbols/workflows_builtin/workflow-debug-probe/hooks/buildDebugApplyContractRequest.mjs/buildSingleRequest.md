
# buildSingleRequest
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:buildSingleRequest -->

构造单个 skillrunner.job.v1 请求：选定探针 skill、目标父条目、fetch_type 与轮询参数。
类型：函数  
复杂度：中等  
入边数：2  
标签：请求构造、skillrunner、单步任务  
所属文件：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md)
源码：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:53](../../../../../../../workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs#L53)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildRequestImpl](buildRequestImpl.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:137–308 | 按工作流 ID 分派构造单步 job 或多步 sequence 请求，覆盖 bundle/result 模式、workspace 新建与复用、交互式步骤等全部调试场景。 |
| [buildRequest](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs:53–64 | 已有父条目场景的请求构造入口：解析选中的唯一父条目后委派 buildSingleRequest 以 bundle 模式发起调试任务。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildStepParameter](buildStepParameter.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:43–51 | 生成步骤参数：workflow/step/run 标识与可读消息，result 模式额外附带调试标签。 |
