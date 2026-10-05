
# src/dashboard
> 目录聚合页：9 个文件、35 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/dashboard/backendManagerApp.ts](../../files/src/dashboard/backendManagerApp.ts.md) | 文件 | 6 | 后端管理对话框页面的 controller 与引导入口：持有宿主 postMessage 通道，把 BackendManagerSnapshot 投影成草稿与视图，并按"文本编辑不重渲染、结构编辑才重渲染"的规则驱动区域刷新。 |
| [src/dashboard/backendManagerRenderer.ts](../../files/src/dashboard/backendManagerRenderer.ts.md) | 文件 | 1 | 后端管理对话框的 chrome renderer：在页面根容器下建立 header/body/footer 与两个预设对话框共五个 managed mount，每个 mount 挂独立 Preact root，使单个区域重渲染不会清空兄弟区域。 |
| [src/dashboard/dashboardApp.ts](../../files/src/dashboard/dashboardApp.ts.md) | 文件 | 4 | Dashboard 页面入口：负责引导启动、与宿主建立 postMessage 通道、发送 action，并把 DashboardSnapshot 投影为面板 DTO 后交给 chrome renderer 渲染。 |
| [src/dashboard/dashboardChromeRenderer.ts](../../files/src/dashboard/dashboardChromeRenderer.ts.md) | 文件 | 3 | Dashboard 页面的 chrome renderer：在 tabbar / main / toast 三个页面骨架容器下，为每个 surface 建立独立的 Preact 挂载点；未选中的 surface 渲染为 null，保证切换标签不会残留旧树。 |
| [src/dashboard/dashboardDomUtils.ts](../../files/src/dashboard/dashboardDomUtils.ts.md) | 文件 | 8 | Dashboard 页面侧的 DOM 与格式化工具集：时间/字节格式化、HTML 转义、状态与日志级别的 badge class 映射、toast 提示与剪贴板复制；刻意不含任何区域语义，由 panel model 组合成视图数据。 |
| [src/dashboard/dashboardLabels.ts](../../files/src/dashboard/dashboardLabels.ts.md) | 文件 | 1 | Dashboard 页面的宿主标签解析器：宿主标签优先，其次显式 fallback，最后回退到 key 本身；未解析的裸 task-dashboard-* key 视为未翻译。 |
| [src/dashboard/dashboardPanelModel.ts](../../files/src/dashboard/dashboardPanelModel.ts.md) | 文件 | 10 | Dashboard 的纯投影层：把 DashboardSnapshot 加本地 UI 状态投影为 DashboardPanel DTO，并为每个区域提供 equality selector，使各区域的 Preact memo 边界只比较自己的可见内容与展开状态。 |
| [src/dashboard/dashboardTypes.ts](../../files/src/dashboard/dashboardTypes.ts.md) | 文件 | 0 | Dashboard 页面侧的 panel DTO 与 controller 状态类型：把各区域导出的 render-ready selection 类型组装成 chrome renderer 消费的 DashboardPanel，并定义动作通道与本地 UI 状态形状。 |
| [src/dashboard/workflowSettingsDialogApp.ts](../../files/src/dashboard/workflowSettingsDialogApp.ts.md) | 文件 | 2 | 独立工作流设置对话框的页面入口：建立 workflow-settings-dialog postMessage 通道，接收宿主快照后投影为 selection 并交给对话框区域渲染。 |

## 子目录
- [components](dashboard/components.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/dashboard/components](dashboard/components.md) | 35 |
| [src/shared](shared.md) | 7 |
