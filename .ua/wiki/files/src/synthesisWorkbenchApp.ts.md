
# src/synthesisWorkbenchApp.ts
所属分层：[页面与交互界面](../../layers/ui-surface.md)  
所属目录：[src](../../modules/src.md)
<!-- node: file:src/synthesisWorkbenchApp.ts -->

Synthesis 工作台页面 bundle 入口：注入图谱 vendor 后调用 bootstrapSynthesisWorkbench 启动工作台。
源码：[src/synthesisWorkbenchApp.ts](../../../../src/synthesisWorkbenchApp.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sigmaIsland.ts](synthesis/components/graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisGraphVendors.ts](shared/synthesisGraphVendors.ts.md) | src/shared/synthesisGraphVendors.ts | 在页面入口处一次性组装 citation graph 所需的 graphology / Sigma 浏览器 vendor。 |
| [synthesisWorkbenchApp.ts](synthesis/synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
