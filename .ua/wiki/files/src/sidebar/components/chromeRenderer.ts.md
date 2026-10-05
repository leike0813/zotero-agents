
# src/sidebar/components/chromeRenderer.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/chromeRenderer.ts -->

Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。
源码：[src/sidebar/components/chromeRenderer.ts](../../../../../../src/sidebar/components/chromeRenderer.ts)

## 符号（7）
<!-- node: function:src/sidebar/components/chromeRenderer.ts:createChromePanelRenderer -->
<!-- node: function:src/sidebar/components/chromeRenderer.ts:panelField -->
<!-- node: function:src/sidebar/components/chromeRenderer.ts:panelRecord -->
<!-- node: function:src/sidebar/components/chromeRenderer.ts:renderMigratedChromeRegions -->
<!-- node: function:src/sidebar/components/chromeRenderer.ts:renderStaticChrome -->
<!-- node: function:src/sidebar/components/chromeRenderer.ts:renderTranscriptRegion -->
<!-- node: function:src/sidebar/components/chromeRenderer.ts:renderTranscriptRegionReset -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createChromePanelRenderer | 函数 | 279–297 | 中等 | factory、renderer、entry-point、assistant-workspace | 0 | 创建面板 chrome 渲染器实例，绑定区域元素、action 回调与托管挂载函数。 |
| panelField | 函数 | 58–62 | 简单 | accessor、panel-dto、utility、type-definition | 0 | 安全读取面板 DTO 上的字段，缺失时返回 undefined 而不抛错。 |
| panelRecord | 函数 | 64–69 | 简单 | accessor、panel-dto、type-definition、utility | 0 | 把面板 DTO 字段收敛为记录类型，供各区域读取。 |
| [renderMigratedChromeRegions](../../../../symbols/src/sidebar/components/chromeRenderer.ts/renderMigratedChromeRegions.md) | 函数 | 71–221 | 复杂 | renderer、signature-memoization、coordinator、assistant-workspace、preact | 1 | chrome 迁移后的核心渲染：逐区域比较 signature，只对真正变化的区域发起 Preact 渲染。 |
| renderStaticChrome | 函数 | 247–272 | 中等 | renderer、chrome、static-render、assistant-workspace | 1 | 渲染不依赖 signature 的静态 chrome 骨架与容器标记。 |
| renderTranscriptRegion | 函数 | 228–237 | 简单 | renderer、transcript、imperative-bridge、assistant-workspace | 1 | 把 transcript 容器交给命令式渲染器，路径与 chrome 渲染完全分离。 |
| renderTranscriptRegionReset | 函数 | 241–243 | 简单 | transcript、reset、lifecycle、virtual-scroll | 0 | 重置 transcript 虚拟状态，用于 owner 切换等场景。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [BannerRegion.tsx](BannerRegion.tsx.md) | src/sidebar/components/BannerRegion.tsx | Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。 |
| [ContextDrawerRegion.tsx](ContextDrawerRegion.tsx.md) | src/sidebar/components/ContextDrawerRegion.tsx | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |
| [DetailsDrawerRegion.tsx](DetailsDrawerRegion.tsx.md) | src/sidebar/components/DetailsDrawerRegion.tsx | 详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。 |
| [EmptyStateRegion.tsx](EmptyStateRegion.tsx.md) | src/sidebar/components/EmptyStateRegion.tsx | 工作区空态区域组件，按 DTO 投影渲染无任务/无会话时的占位提示。 |
| [HintRegion.tsx](HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [MessageCountsRegion.tsx](MessageCountsRegion.tsx.md) | src/sidebar/components/MessageCountsRegion.tsx | 消息计数区域：展示 transcript 消息条数等统计数字，由 regionEquality 的计数比较输入控制更新。 |
| [PermissionDrawerRegion.tsx](PermissionDrawerRegion.tsx.md) | src/sidebar/components/PermissionDrawerRegion.tsx | 权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。 |
| [PlanRegion.tsx](PlanRegion.tsx.md) | src/sidebar/components/PlanRegion.tsx | 计划区域：渲染 Agent 给出的 plan 条目列表及其当前状态，并支持条目级操作。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |
| [ReplyRegion.tsx](ReplyRegion.tsx.md) | src/sidebar/components/ReplyRegion.tsx | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |
| [ToolbarRegion.tsx](ToolbarRegion.tsx.md) | src/sidebar/components/ToolbarRegion.tsx | 工具栏区域：组合视图模式切换与面板级操作按钮，作为非 transcript 的固定 chrome 区域。 |
| [TranscriptRegion.tsx](TranscriptRegion.tsx.md) | src/sidebar/components/TranscriptRegion.tsx | Transcript 区域的 Preact 包装组件：管理 transcript 容器的 mount，并把手势交给命令式渲染器。 |
| [ViewModeToggle.tsx](ViewModeToggle.tsx.md) | src/sidebar/components/ViewModeToggle.tsx | 视图模式切换控件：在紧凑/完整等 transcript 展示模式之间切换并派发宿主动作。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantWorkspaceAcpChild.js](../assistantWorkspaceAcpChild.js.md) | src/sidebar/assistantWorkspaceAcpChild.js | Assistant Workspace ACP 子运行时：校验宿主 wire 契约与 publication envelope，维护 owner（backend/conversation 与 requestId）分页读取、transcript 快照与面板 action 路由。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createChromePanelRenderer | 函数 | 279–297 | 创建面板 chrome 渲染器实例，绑定区域元素、action 回调与托管挂载函数。 |
| [renderMigratedChromeRegions](../../../../symbols/src/sidebar/components/chromeRenderer.ts/renderMigratedChromeRegions.md) | 函数 | 71–221 | chrome 迁移后的核心渲染：逐区域比较 signature，只对真正变化的区域发起 Preact 渲染。 |
| renderStaticChrome | 函数 | 247–272 | 渲染不依赖 signature 的静态 chrome 骨架与容器标记。 |
| renderTranscriptRegion | 函数 | 228–237 | 把 transcript 容器交给命令式渲染器，路径与 chrome 渲染完全分离。 |
| renderTranscriptRegionReset | 函数 | 241–243 | 重置 transcript 虚拟状态，用于 owner 切换等场景。 |
