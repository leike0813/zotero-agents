
# src/synthesis/synthesisWorkbenchPanelModel.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/synthesisWorkbenchPanelModel.ts -->

工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。
源码：[src/synthesis/synthesisWorkbenchPanelModel.ts](../../../../../src/synthesis/synthesisWorkbenchPanelModel.ts)

## 符号（18）
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:backgroundJobStatusbarOperation -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:createSynthesisWorkbenchText -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:listActiveActionOperations -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:listSynthesisWorkbenchBackgroundJobs -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:nextStatusbarExpiryDelayMs -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:progressLabel -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectChrome -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectJobView -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectShell -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectSidecar -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectSurfacePlaceholder -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectSynthesisWorkbenchPanel -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:projectTopbar -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:resolveTimedStatusbarEntry -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:sourceLabelForJob -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:statusLabelForJob -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:synthesisWorkbenchChromeSignatureInput -->
<!-- node: function:src/synthesis/synthesisWorkbenchPanelModel.ts:synthesisWorkbenchSurfaceForTab -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| backgroundJobStatusbarOperation | 函数 | 423–437 | 简单 | projection、status-bar、background-job | 0 | 把后台作业映射为状态栏操作项。 |
| createSynthesisWorkbenchText | 函数 | 52–60 | 简单 | factory、i18n、panel-model | 0 | 创建面板文案解析器，绑定 locale 与消息表。 |
| listActiveActionOperations | 函数 | 303–331 | 中等 | status-bar、action、projection | 0 | 列出生效中的 action 操作及其显示优先级。 |
| listSynthesisWorkbenchBackgroundJobs | 函数 | 343–365 | 中等 | background-job、projection、sorting | 0 | 列出后台作业并按优先级排序，输出可投影的作业视图。 |
| nextStatusbarExpiryDelayMs | 函数 | 276–286 | 简单 | status-bar、timer、utility | 0 | 计算下一条状态栏条目的过期延迟，用于安排定时刷新。 |
| progressLabel | 函数 | 389–399 | 简单 | i18n、background-job、formatting | 0 | 生成作业进度文案与百分比。 |
| projectChrome | 函数 | 439–556 | 复杂 | projection、panel-model、chrome | 0 | 投影 chrome 区域 DTO：顶栏、状态栏、命令与作业视图。 |
| projectJobView | 函数 | 401–421 | 中等 | projection、background-job、panel-model | 0 | 把后台作业记录投影为面板可见的作业视图。 |
| projectShell | 函数 | 187–215 | 简单 | projection、panel-model、shell | 0 | 投影页面外壳 DTO：标签、侧栏与返回入口状态。 |
| projectSidecar | 函数 | 562–649 | 复杂 | projection、panel-model、sidecar | 0 | 投影 sidecar 指示区域 DTO：连接状态、错误与诊断信息。 |
| projectSurfacePlaceholder | 函数 | 655–674 | 简单 | projection、placeholder、panel-model | 0 | 投影 surface 占位态，保留旧内容与错误诊断分离。 |
| projectSynthesisWorkbenchPanel | 函数 | 680–721 | 中等 | projection、panel-model、orchestration | 0 | 投影完整工作台面板 DTO：shell、chrome、sidecar 与当前 surface。 |
| projectTopbar | 函数 | 217–228 | 简单 | projection、panel-model、topbar | 0 | 投影顶栏 DTO：当前 surface、状态与可用命令。 |
| resolveTimedStatusbarEntry | 函数 | 255–273 | 中等 | status-bar、time、projection | 0 | 按过期时间解析当前应展示的状态栏条目。 |
| sourceLabelForJob | 函数 | 378–387 | 简单 | i18n、background-job、formatting | 0 | 生成后台作业来源文案。 |
| statusLabelForJob | 函数 | 367–376 | 简单 | i18n、background-job、formatting | 0 | 生成后台作业状态文案。 |
| synthesisWorkbenchChromeSignatureInput | 函数 | 759–776 | 中等 | memoization、signature、panel-model | 0 | 构造 chrome 区域的稳定 signature 输入，只包含用户可见内容与折叠状态。 |
| synthesisWorkbenchSurfaceForTab | 函数 | 66–74 | 简单 | utility、mapping、panel-model | 0 | 把 tab 映射为对应业务 surface 名称。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ChromeRegion.tsx](components/ChromeRegion.tsx.md) | src/synthesis/components/ChromeRegion.tsx | Synthesis Workbench 页面的 chrome 区域：底部动作状态栏、后台任务弹层与 sidecar 运行指示。 |
| [registryTypes.ts](components/registry/registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [ReviewCenterRegion.tsx](components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [ShellRegion.tsx](components/ShellRegion.tsx.md) | src/synthesis/components/ShellRegion.tsx | Synthesis Workbench 页面的侧栏与顶栏外壳：导航标签、库标识与折叠开关。 |
| [synthesisSurfaceProjection.ts](synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchI18nContract.ts](../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |
| [synthesisWorkbenchWireContract.ts](../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registryProjection.ts](registryProjection.ts.md) | src/synthesis/registryProjection.ts | 注册表区域选择态投影：把 wire 快照与本地 registry 行合成审阅选择 DTO，并提供空审阅状态的常量。 |
| [synthesisExportProjection.ts](synthesisExportProjection.ts.md) | src/synthesis/synthesisExportProjection.ts | 导出能力投影：把当前图选择与阅读器选择整理为可导出的 payload，供 standalone 与导出按钮复用。 |
| [synthesisSurfaceProjection.ts](synthesisSurfaceProjection.ts.md) | src/synthesis/synthesisSurfaceProjection.ts | 业务面（surface）统一投影入口：按当前 tab 把 wire 快照投影为 concepts/tags/topics/graph/reader/registry/review 各自的区域 DTO。 |
| [synthesisWorkbenchApp.ts](synthesisWorkbenchApp.ts.md) | src/synthesis/synthesisWorkbenchApp.ts | Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。 |
| [synthesisWorkbenchChromeRenderer.ts](synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisWorkbenchText | 函数 | 52–60 | 创建面板文案解析器，绑定 locale 与消息表。 |
| listSynthesisWorkbenchBackgroundJobs | 函数 | 343–365 | 列出后台作业并按优先级排序，输出可投影的作业视图。 |
| nextStatusbarExpiryDelayMs | 函数 | 276–286 | 计算下一条状态栏条目的过期延迟，用于安排定时刷新。 |
| projectSynthesisWorkbenchPanel | 函数 | 680–721 | 投影完整工作台面板 DTO：shell、chrome、sidecar 与当前 surface。 |
| resolveTimedStatusbarEntry | 函数 | 255–273 | 按过期时间解析当前应展示的状态栏条目。 |
| synthesisWorkbenchChromeSignatureInput | 函数 | 759–776 | 构造 chrome 区域的稳定 signature 输入，只包含用户可见内容与折叠状态。 |
| synthesisWorkbenchSurfaceForTab | 函数 | 66–74 | 把 tab 映射为对应业务 surface 名称。 |
