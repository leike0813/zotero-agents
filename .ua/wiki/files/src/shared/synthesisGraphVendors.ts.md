
# src/shared/synthesisGraphVendors.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/synthesisGraphVendors.ts -->

在页面入口处一次性组装 citation graph 所需的 graphology / Sigma 浏览器 vendor。
源码：[src/shared/synthesisGraphVendors.ts](../../../../../src/shared/synthesisGraphVendors.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [standaloneGraphApp.ts](../synthesis/standaloneGraphApp.ts.md) | src/synthesis/standaloneGraphApp.ts | 独立引用图谱页面的挂载入口：解析宿主快照、准备导出能力并把 GraphRegion 渲染到独立页面容器。 |
| [standaloneTopicApp.ts](../synthesis/standaloneTopicApp.ts.md) | src/synthesis/standaloneTopicApp.ts | 独立话题页面的挂载入口：组合 GraphRegion 与 ReaderRegion，只渲染所选话题所需的最小区域集合。 |
| [synthesisWorkbenchApp.ts](../synthesisWorkbenchApp.ts.md) | src/synthesisWorkbenchApp.ts | Synthesis 工作台页面 bundle 入口：注入图谱 vendor 后调用 bootstrapSynthesisWorkbench 启动工作台。 |
