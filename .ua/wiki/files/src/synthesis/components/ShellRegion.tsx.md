
# src/synthesis/components/ShellRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/ShellRegion.tsx -->

Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。
源码：[src/synthesis/components/ShellRegion.tsx](../../../../../../src/synthesis/components/ShellRegion.tsx)

## 符号（2）
<!-- node: function:src/synthesis/components/ShellRegion.tsx:ShellRegion -->
<!-- node: function:src/synthesis/components/ShellRegion.tsx:TopbarRegion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ShellRegion | 函数 | 34–89 | 中等 | shell、navigation、preact、memoized | 0 | 渲染侧栏外壳：品牌标识、库名称、折叠开关与导航标签列表。 |
| TopbarRegion | 函数 | 102–116 | 简单 | shell、topbar、preact、memoized | 0 | 渲染顶栏标题区域。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchChromeRenderer.ts](../synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [synthesisWorkbenchPanelModel.ts](../synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](../synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ShellRegion | 函数 | 34–89 | 渲染侧栏外壳：品牌标识、库名称、折叠开关与导航标签列表。 |
| TopbarRegion | 函数 | 102–116 | 渲染顶栏标题区域。 |
