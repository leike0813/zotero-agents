
# src/synthesis/components/HomeRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/HomeRegion.tsx -->

Synthesis Workbench 的 home / overview 表面：库洞察卡片、WebDAV 同步面板与热门主题网格。
源码：[src/synthesis/components/HomeRegion.tsx](../../../../../../src/synthesis/components/HomeRegion.tsx)

## 符号（14）
<!-- node: function:src/synthesis/components/HomeRegion.tsx:buildSyncLogLines -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:CommandButton -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:HomeRegion -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:InsightCard -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:narrowDiagnostics -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:narrowSyncOperationEntry -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:narrowSyncSelection -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:narrowSynthesisWorkbenchHomeTopicRow -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:projectSynthesisWorkbenchHomeSelection -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:sourceMaterialsLabel -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:SyncConflictPanel -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:SyncFeedbackLog -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:SyncPanel -->
<!-- node: function:src/synthesis/components/HomeRegion.tsx:TopicCard -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildSyncLogLines](../../../../symbols/src/synthesis/components/HomeRegion.tsx/buildSyncLogLines.md) | 函数 | 496–584 | 复杂 | sync、log、formatting | 1 | 把同步诊断与操作日志整理为可读的时间线文本行。 |
| CommandButton | 函数 | 444–480 | 中等 | button、host-command、sync | 0 | 同步面板动作按钮，按允许动作集与冲突动作集决定是否可用。 |
| HomeRegion | 函数 | 845–929 | 复杂 | home-region、preact、memoized | 0 | Home 表面区域组件：洞察卡片、同步面板与主题网格的组合渲染入口。 |
| InsightCard | 函数 | 429–442 | 简单 | card、insight、presentational | 1 | 库洞察指标卡片，展示单条洞察的标签、取值与说明。 |
| narrowDiagnostics | 函数 | 188–197 | 简单 | narrowing、sync、diagnostics | 0 | 收窄同步诊断条目为页面可消费的最小形状。 |
| narrowSyncOperationEntry | 函数 | 225–236 | 简单 | narrowing、sync、log | 0 | 把同步操作日志条目收窄为状态、时间与文案三元组。 |
| narrowSyncSelection | 函数 | 245–279 | 中等 | narrowing、sync、projection | 0 | 收窄同步面板所需的队列状态、远端配置与冲突处理能力。 |
| narrowSynthesisWorkbenchHomeTopicRow | 函数 | 199–218 | 中等 | narrowing、projection、home | 1 | 把主题 wire 行收窄为 home 主题卡片视图。 |
| [projectSynthesisWorkbenchHomeSelection](../../../../symbols/src/synthesis/components/HomeRegion.tsx/projectSynthesisWorkbenchHomeSelection.md) | 函数 | 285–363 | 复杂 | projection、home-region、selection | 1 | 由 wire 快照投影 Home 区域的完整 selection：洞察卡片、同步面板与热门主题网格。 |
| sourceMaterialsLabel | 函数 | 404–417 | 简单 | formatting、topic-row、home | 0 | 由来源材料完成度派生展示文案与色调。 |
| [SyncConflictPanel](../../../../symbols/src/synthesis/components/HomeRegion.tsx/SyncConflictPanel.md) | 函数 | 603–689 | 复杂 | conflict、sync、review | 1 | 渲染 WebDAV 冲突审阅面板，展示冲突资产的本地/远端哈希并提交解决动作。 |
| SyncFeedbackLog | 函数 | 586–601 | 简单 | sync、log、presentational | 1 | 渲染同步反馈日志区域。 |
| [SyncPanel](../../../../symbols/src/synthesis/components/HomeRegion.tsx/SyncPanel.md) | 函数 | 691–784 | 复杂 | sync、panel、controls | 1 | 渲染同步配置摘要、可用动作与暂停/恢复控制。 |
| TopicCard | 函数 | 786–841 | 中等 | card、topic、presentational | 1 | 热门主题卡片，展示定义、摘要、文献数与新鲜度。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [synthesisWorkbenchI18nContract.ts](../../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisSurfaceProjection.ts](../synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchChromeRenderer.ts](../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [projectSynthesisWorkbenchHomeSelection](../../../../symbols/src/synthesis/components/HomeRegion.tsx/projectSynthesisWorkbenchHomeSelection.md) | src/synthesis/components/HomeRegion.tsx | 由 wire 快照投影 Home 区域的完整 selection：洞察卡片、同步面板与热门主题网格。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| HomeRegion | 函数 | 845–929 | Home 表面区域组件：洞察卡片、同步面板与主题网格的组合渲染入口。 |
| narrowSynthesisWorkbenchHomeTopicRow | 函数 | 199–218 | 把主题 wire 行收窄为 home 主题卡片视图。 |
| [projectSynthesisWorkbenchHomeSelection](../../../../symbols/src/synthesis/components/HomeRegion.tsx/projectSynthesisWorkbenchHomeSelection.md) | 函数 | 285–363 | 由 wire 快照投影 Home 区域的完整 selection：洞察卡片、同步面板与热门主题网格。 |
