
# createDashboardChromeRenderer
<!-- node: function:src/dashboard/dashboardChromeRenderer.ts:createDashboardChromeRenderer -->

创建 Dashboard chrome renderer：建立各 surface 的 managed mount，按 selectedTabKey 互斥渲染，暴露 toast 与复制能力，并把区域动作回传 controller。
类型：函数  
复杂度：复杂  
入边数：1  
标签：renderer、factory、preact、region-mount  
所属文件：[src/dashboard/dashboardChromeRenderer.ts](../../../../files/src/dashboard/dashboardChromeRenderer.ts.md)
源码：[src/dashboard/dashboardChromeRenderer.ts:149](../../../../../../src/dashboard/dashboardChromeRenderer.ts#L149)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createDashboardController](../../../../files/src/dashboard/dashboardApp.ts.md) | src/dashboard/dashboardApp.ts:71–229 | Dashboard 核心 controller：接收宿主 init/snapshot 消息，合并本地 UI 状态，投影面板 DTO 并驱动 chrome renderer，同时处理页面本地动作。 |

## 调用

该符号没有记录对外调用。
