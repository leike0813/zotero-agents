
# randomRunKey
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:randomRunKey -->

生成短随机 run key，用于区分同一次调试运行产生的条目、标签与附件。
类型：函数  
复杂度：简单  
入边数：2  
标签：工具函数、随机标识、调试标记  
所属文件：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs.md)
源码：[workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:9](../../../../../../../workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs#L9)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildRequestImpl](buildRequestImpl.md) | workflows_builtin/workflow-debug-probe/hooks/buildDebugApplyContractRequest.mjs:137–308 | 按工作流 ID 分派构造单步 job 或多步 sequence 请求，覆盖 bundle/result 模式、workspace 新建与复用、交互式步骤等全部调试场景。 |
| [buildRequest](../../../../../files/workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/buildExistingParentDebugApplyRequest.mjs:53–64 | 已有父条目场景的请求构造入口：解析选中的唯一父条目后委派 buildSingleRequest 以 bundle 模式发起调试任务。 |

## 调用

该符号没有记录对外调用。
