
# buildHostBridgeWorkflowAgentRunHandoff
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:buildHostBridgeWorkflowAgentRunHandoff -->

组装完整 handoff 载荷：请求投影、选区文件、目录条目、协议指引、输出契约与 apply-back 指令一次性成型。
类型：函数  
复杂度：复杂  
入边数：1  
标签：host-bridge、agent-run、handoff、core  
所属文件：[src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md)
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:551](../../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts#L551)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildHostBridgeWorkflowAgentRun](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:1502–1544 | 组装 Agent Run 交接：锁定选区、构造命名空间与准备请求，并调用 handoff 构建器产出载荷。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [buildApplyBackInstructions](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:518–549 | 生成 apply-back 指令，说明 Agent 如何回传结果包以及被拒绝时的处理路径。 |
| [buildProtocolGuide](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:388–473 | 生成 Agent 侧协议指引文本，说明交接结构、字段语义与必须遵守的调用顺序。 |
| [collectSelectedFilesFromContext](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:177–216 | 从锁定的选区上下文中收集可传给 Agent 的文件条目，校验 portable ref 完整性。 |
| [projectAgentRunRequest](../../../../../../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts:229–312 | 把工作流请求投影为 Agent 侧请求视图，剔除宿主内部标识并保留 portable ref。 |
