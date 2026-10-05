
# runAcpRuntimeReplayMatrix
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:runAcpRuntimeReplayMatrix -->

运行完整回放矩阵：遍历 phase 与 cadence 组合、逐个执行并聚合 surface 摘要，是回放流程的主入口。
类型：函数  
复杂度：复杂  
入边数：1  
标签：回放、矩阵、主入口  
所属文件：[src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts.md)
源码：[src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:950](../../../../../../../../src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts#L950)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [startAcpRuntimeReplayController](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayController.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayController.ts:268–401 | 启动一次回放：取得诊断模式独占、构造生产端口与目标、执行矩阵并在终态释放模式与资源。 |

## 调用

该符号没有记录对外调用。
