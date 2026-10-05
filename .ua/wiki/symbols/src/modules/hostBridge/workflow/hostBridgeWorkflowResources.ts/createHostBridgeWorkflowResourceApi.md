
# createHostBridgeWorkflowResourceApi
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:createHostBridgeWorkflowResourceApi -->

构造工作流资源 API：注册输出文件、登记输入引用并提供受 slot 约束的读写操作，交互缺失时返回 typed 错误。
类型：函数  
复杂度：复杂  
入边数：1  
标签：host-bridge、resources、api-handler、core  
所属文件：[src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts.md)
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:476](../../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts#L476)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [submitHostBridgeWorkflow](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:2070–2249 | 工作流提交主路径：解析请求、准备资源、解析审批权限、进入提交队列并返回提交视图。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createWorkflowRunResourceStore](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts:32–167 | 创建一次运行独立的资源存储，维护输入输出槽位到文件句柄的映射并在运行结束后统一释放。 |
