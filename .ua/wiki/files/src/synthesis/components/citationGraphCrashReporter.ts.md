
# src/synthesis/components/citationGraphCrashReporter.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/citationGraphCrashReporter.ts -->

把 citation graph 生命周期阶段转发到崩溃日志记录的薄桥接。
源码：[src/synthesis/components/citationGraphCrashReporter.ts](../../../../../../src/synthesis/components/citationGraphCrashReporter.ts)

## 符号（1）
<!-- node: function:src/synthesis/components/citationGraphCrashReporter.ts:reportCitationGraphCrashJournalPhase -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [reportCitationGraphCrashJournalPhase](../../../../symbols/src/synthesis/components/citationGraphCrashReporter.ts/reportCitationGraphCrashJournalPhase.md) | 函数 | 16–26 | 简单 | crash-reporter、bridge、diagnostics | 2 | 把图生命周期阶段转发给宿主注入的崩溃日志 bridge，是否保留由插件侧 recorder 决定。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sigmaIsland.ts](graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisWorkbenchApp.ts](../synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [reportCitationGraphCrashJournalPhase](../../../../symbols/src/synthesis/components/citationGraphCrashReporter.ts/reportCitationGraphCrashJournalPhase.md) | 函数 | 16–26 | 把图生命周期阶段转发给宿主注入的崩溃日志 bridge，是否保留由插件侧 recorder 决定。 |
