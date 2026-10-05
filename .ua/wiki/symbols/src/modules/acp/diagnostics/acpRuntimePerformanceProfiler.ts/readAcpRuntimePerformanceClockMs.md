
# readAcpRuntimePerformanceClockMs
<!-- node: function:src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:readAcpRuntimePerformanceClockMs -->

读取单调递增的高精度时钟，供所有耗时测量统一取时。
类型：函数  
复杂度：简单  
入边数：2  
标签：timer、clock、profiler、utility  
所属文件：[src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts](../../../../../../files/src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts.md)
源码：[src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts:318](../../../../../../../../src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts#L318)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [readProfiledTranscriptPage](../../../../../../files/src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts.md) | src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:154–204 | 在 profiler 计时包裹下读取 transcript 分页，记录该次读取的耗时样本。 |
| [registerWorkspacePublication](../../../../../../files/src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts.md) | src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts:316–344 | 注册一条工作区发布记录并纳入生命周期裁剪，防止无界增长。 |

## 调用

该符号没有记录对外调用。
