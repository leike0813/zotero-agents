
# createAcpRuntimeMonotonicClock
<!-- node: function:src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts:createAcpRuntimeMonotonicClock -->

创建单调不回退的时钟，优先使用 performance.now 并以 Date.now 兜底，保证 trace 时间戳严格递增。
类型：函数  
复杂度：简单  
入边数：2  
标签：单调时钟、trace、工具函数  
所属文件：[src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts.md)
源码：[src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts:7](../../../../../../../../src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts#L7)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [replayAcpRuntimeSemanticTrace](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts.md) | src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts:245–405 | 按 trace 事件顺序回放单个运行，注入逻辑时间间隙并驱动目标执行，产出带度量的事件时间线。 |
| [armAcpRuntimeSemanticTraceRecorder](../../../../../../files/src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts.md) | src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:208–272 | 预备录制器：校验 debug 可用性、取得 recording 模式独占并绑定 owner 限额。 |

## 调用

该符号没有记录对外调用。
