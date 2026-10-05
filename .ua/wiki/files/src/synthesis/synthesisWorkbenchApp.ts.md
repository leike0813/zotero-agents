
# src/synthesis/synthesisWorkbenchApp.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/synthesis](../../../modules/src/synthesis.md)
<!-- node: file:src/synthesis/synthesisWorkbenchApp.ts -->

Synthesis 工作台页面控制器：持有面板状态、合并图分页快照、判定动作与 pending 操作，并向宿主发送 action；同时导出页面引导函数。
源码：[src/synthesis/synthesisWorkbenchApp.ts](../../../../../src/synthesis/synthesisWorkbenchApp.ts)

## 符号（6）
<!-- node: function:src/synthesis/synthesisWorkbenchApp.ts:bootstrapSynthesisWorkbench -->
<!-- node: function:src/synthesis/synthesisWorkbenchApp.ts:createSynthesisWorkbenchController -->
<!-- node: function:src/synthesis/synthesisWorkbenchApp.ts:isActionPayload -->
<!-- node: function:src/synthesis/synthesisWorkbenchApp.ts:mergeGraphPageSnapshot -->
<!-- node: function:src/synthesis/synthesisWorkbenchApp.ts:sendSynthesisWorkbenchAction -->
<!-- node: function:src/synthesis/synthesisWorkbenchApp.ts:synthesisWorkbenchOperationKey -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bootstrapSynthesisWorkbench | 函数 | 1273–1323 | 中等 | entry-point、bootstrap、controller | 1 | 引导工作台：创建控制器、挂载 chrome 渲染器并建立宿主消息通道。 |
| createSynthesisWorkbenchController | 函数 | 352–1258 | 复杂 | controller、state-management、factory、synthesis | 0 | 工作台控制器工厂：维护面板与选择状态、路由 action、投影区域 DTO 并派发区域更新。 |
| isActionPayload | 函数 | 174–196 | 简单 | type-guard、validation、wire-contract | 0 | 判定未知值是否为合法的 action 负载形状。 |
| mergeGraphPageSnapshot | 函数 | 225–274 | 复杂 | state-management、graph、pagination | 0 | 按行合并图分页快照，保留已加载节点的局部更新。 |
| sendSynthesisWorkbenchAction | 函数 | 67–93 | 中等 | action、host-bridge、controller | 0 | 向宿主发送工作台 action，附加 operation 键与 pending 追踪。 |
| synthesisWorkbenchOperationKey | 函数 | 286–334 | 复杂 | utility、action、dedupe、controller | 0 | 由 action、关键负载字段与 requestId 派生操作键，抑制重复提交。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphCrashReporter.ts](components/citationGraphCrashReporter.ts.md) | src/synthesis/components/citationGraphCrashReporter.ts | 把 citation graph 生命周期阶段转发到崩溃日志记录的薄桥接。 |
| [regionEquality.ts](../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |
| [registryTypes.ts](components/registry/registryTypes.ts.md) | src/synthesis/components/registry/registryTypes.ts | 注册表领域的类型与业务规则单一事实源：定义选择/审阅状态类型、行与提案的 narrow 函数、枚举本地化、操作可用性判定以及 canonical 编辑草稿的构造与 diff。 |
| [ReviewCenterRegion.tsx](components/reviewCenter/ReviewCenterRegion.tsx.md) | src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx | 审阅中心主区域：统一渲染引用匹配、规范修订、清理与话题图关系的批量/单条审阅动作、状态徽标与工具栏。 |
| [sigmaIsland.ts](components/graph/sigmaIsland.ts.md) | src/synthesis/components/graph/sigmaIsland.ts | Citation graph 表面的命令式 Sigma island，跨区域重渲染持有 graphology 模型与 Sigma 渲染器。 |
| [synthesisWorkbenchChromeRenderer.ts](synthesisWorkbenchChromeRenderer.ts.md) | src/synthesis/synthesisWorkbenchChromeRenderer.ts | 工作台 chrome 渲染器：创建页面骨架 DOM、按区域挂载 Preact 区域组件，并以 signature equality 为各区域做独立更新。 |
| [synthesisWorkbenchI18nContract.ts](../shared/synthesisWorkbenchI18nContract.ts.md) | src/shared/synthesisWorkbenchI18nContract.ts | 把宿主与页面共享的 Synthesis Workbench i18n 运行时接口重新导出到 src/shared 层。 |
| [synthesisWorkbenchPanelModel.ts](synthesisWorkbenchPanelModel.ts.md) | src/synthesis/synthesisWorkbenchPanelModel.ts | 工作台面板模型：把控制器状态投影为 shell/topbar/chrome/sidecar/surface 面板 DTO，并管理状态栏条目与后台作业的优先级、过期和进度文案。 |
| [synthesisWorkbenchTypes.ts](synthesisWorkbenchTypes.ts.md) | src/synthesis/synthesisWorkbenchTypes.ts | 页面侧面板 DTO 与控制器状态类型定义：组合各区域导出的选择类型，声明动作发送器、i18n 状态与本地 UI 状态形状。 |
| [synthesisWorkbenchWireContract.ts](../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchApp.ts](../synthesisWorkbenchApp.ts.md) | src/synthesisWorkbenchApp.ts | Synthesis 工作台页面 bundle 入口：注入图谱 vendor 后调用 bootstrapSynthesisWorkbench 启动工作台。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bootstrapSynthesisWorkbench | 函数 | 1273–1323 | 引导工作台：创建控制器、挂载 chrome 渲染器并建立宿主消息通道。 |
| createSynthesisWorkbenchController | 函数 | 352–1258 | 工作台控制器工厂：维护面板与选择状态、路由 action、投影区域 DTO 并派发区域更新。 |
| sendSynthesisWorkbenchAction | 函数 | 67–93 | 向宿主发送工作台 action，附加 operation 键与 pending 追踪。 |
| synthesisWorkbenchOperationKey | 函数 | 286–334 | 由 action、关键负载字段与 requestId 派生操作键，抑制重复提交。 |
