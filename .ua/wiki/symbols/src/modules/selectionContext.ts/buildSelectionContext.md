
# buildSelectionContext
<!-- node: function:src/modules/selectionContext.ts:buildSelectionContext -->

构造锁定后的选区上下文快照，是工作流设置、准备与执行三阶段共用的唯一输入。
类型：函数  
复杂度：简单  
入边数：3  
标签：selection、broker、core  
所属文件：[src/modules/selectionContext.ts](../../../../files/src/modules/selectionContext.ts.md)
源码：[src/modules/selectionContext.ts:139](../../../../../../src/modules/selectionContext.ts#L139)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildHostBridgeWorkflowAgentRun](../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:1502–1544 | 组装 Agent Run 交接：锁定选区、构造命名空间与准备请求，并调用 handoff 构建器产出载荷。 |
| [submitHostBridgeWorkflow](../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:2070–2249 | 工作流提交主路径：解析请求、准备资源、解析审批权限、进入提交队列并返回提交视图。 |
| [readSelectionContext](../../../../files/src/modules/selectionContext.ts.md) | src/modules/selectionContext.ts:152–190 | 读取已锁定的选区事实并按调用方请求投影，basis 不匹配时失败而非回退到 ambient 状态。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [lockSelection](../../../../files/src/modules/selectionContext.ts.md) | src/modules/selectionContext.ts:80–100 | 向 Broker 请求一次分页获取并立即锁定有序 canonical 事实，锁定后不再随宿主选择变化。 |
