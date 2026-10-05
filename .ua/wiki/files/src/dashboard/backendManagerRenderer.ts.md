
# src/dashboard/backendManagerRenderer.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/dashboard](../../../modules/src/dashboard.md)
<!-- node: file:src/dashboard/backendManagerRenderer.ts -->

后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。
源码：[src/dashboard/backendManagerRenderer.ts](../../../../../src/dashboard/backendManagerRenderer.ts)

## 符号（1）
<!-- node: function:src/dashboard/backendManagerRenderer.ts:createBackendManagerRenderer -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createBackendManagerRenderer | 函数 | 41–185 | 中等 | renderer、factory、preact、region-mount | 1 | 创建后端管理页的 chrome renderer：一次性 adopt 五个区域挂载点，按可见性分别 render 各区域，并提供切换 provider 后的 body 滚动位置恢复。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [BackendManagerRegion.tsx](components/BackendManagerRegion.tsx.md) | src/dashboard/components/BackendManagerRegion.tsx | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |
| [preactRegionMount.ts](../shared/preactRegionMount.ts.md) | src/shared/preactRegionMount.ts | 与页面无关的 managed-region 挂载辅助：为按区域独立渲染的 Preact 页面创建并定位 managed mount 子节点，并给区域容器打上通用 data 属性。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManagerApp.ts](backendManagerApp.ts.md) | src/dashboard/backendManagerApp.ts | 后端管理对话框页面的 controller 与引导入口：持有宿主 postMessage 通道，把 BackendManagerSnapshot 投影成草稿与视图，并按"文本编辑不重渲染、结构编辑才重渲染"的规则驱动区域刷新。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [BackendManagerRegion.tsx](components/BackendManagerRegion.tsx.md) | src/dashboard/components/BackendManagerRegion.tsx | 后端管理对话框的全部 Preact 区域组件：header/body/footer 主体区域加上 ACP 与通用 HTTP 两个预设对话框，负责后端行的命令、token、参数与环境变量编辑，以及 provider 预设的生成与落盘。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createBackendManagerRenderer | 函数 | 41–185 | 创建后端管理页的 chrome renderer：一次性 adopt 五个区域挂载点，按可见性分别 render 各区域，并提供切换 provider 后的 body 滚动位置恢复。 |
