
# reportCitationGraphCrashJournalPhase
<!-- node: function:src/synthesis/components/citationGraphCrashReporter.ts:reportCitationGraphCrashJournalPhase -->

把图生命周期阶段转发给宿主注入的崩溃日志 bridge，是否保留由插件侧 recorder 决定。
类型：函数  
复杂度：简单  
入边数：2  
标签：crash-reporter、bridge、diagnostics  
所属文件：[src/synthesis/components/citationGraphCrashReporter.ts](../../../../../files/src/synthesis/components/citationGraphCrashReporter.ts.md)
源码：[src/synthesis/components/citationGraphCrashReporter.ts:16](../../../../../../../src/synthesis/components/citationGraphCrashReporter.ts#L16)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [sigmaIsland.ts](../../../../../files/src/synthesis/components/graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts:— | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisWorkbenchApp.ts](../../../../../files/src/synthesis/synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts:— | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |

## 调用

该符号没有记录对外调用。
