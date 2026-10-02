
# src/synthesis/components/ChromeRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/synthesis/components](../../../../modules/src/synthesis/components.md)
<!-- node: file:src/synthesis/components/ChromeRegion.tsx -->

Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。
源码：[src/synthesis/components/ChromeRegion.tsx](../../../../../../src/synthesis/components/ChromeRegion.tsx)

## 符号（2）
<!-- node: function:src/synthesis/components/ChromeRegion.tsx:ChromeRegion -->
<!-- node: function:src/synthesis/components/ChromeRegion.tsx:StatusbarProgress -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ChromeRegion | 函数 | 80–245 | 中等 | chrome-region、statusbar、preact、memoized | 0 | 渲染底部动作状态栏与后台任务弹层的后台作业列表，并上报打开作业等意图。 |
| StatusbarProgress | 函数 | 59–77 | 简单 | progress、statusbar、presentational | 1 | 状态栏进度指示组件，按确定/不确定两种模式渲染进度条。 |

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
| ChromeRegion | 函数 | 80–245 | 渲染底部动作状态栏与后台任务弹层的后台作业列表，并上报打开作业等意图。 |
