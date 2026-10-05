
# src/sidebar/components
> 目录聚合页：16 个文件、47 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/sidebar/components/ActionControls.tsx](../../../files/src/sidebar/components/ActionControls.tsx.md) | 文件 | 6 | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [src/sidebar/components/BannerRegion.tsx](../../../files/src/sidebar/components/BannerRegion.tsx.md) | 文件 | 2 | Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。 |
| [src/sidebar/components/chromeRenderer.ts](../../../files/src/sidebar/components/chromeRenderer.ts.md) | 文件 | 7 | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
| [src/sidebar/components/ContextDrawerRegion.tsx](../../../files/src/sidebar/components/ContextDrawerRegion.tsx.md) | 文件 | 6 | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |
| [src/sidebar/components/DetailsDrawerRegion.tsx](../../../files/src/sidebar/components/DetailsDrawerRegion.tsx.md) | 文件 | 2 | 详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。 |
| [src/sidebar/components/EmptyStateRegion.tsx](../../../files/src/sidebar/components/EmptyStateRegion.tsx.md) | 文件 | 0 | 工作区空态区域组件，按 DTO 投影渲染无任务/无会话时的占位提示。 |
| [src/sidebar/components/HintRegion.tsx](../../../files/src/sidebar/components/HintRegion.tsx.md) | 文件 | 4 | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [src/sidebar/components/MessageCountsRegion.tsx](../../../files/src/sidebar/components/MessageCountsRegion.tsx.md) | 文件 | 0 | 消息计数区域：展示 transcript 消息条数等统计数字，由 regionEquality 的计数比较输入控制更新。 |
| [src/sidebar/components/PermissionDrawerRegion.tsx](../../../files/src/sidebar/components/PermissionDrawerRegion.tsx.md) | 文件 | 0 | 权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。 |
| [src/sidebar/components/PlanRegion.tsx](../../../files/src/sidebar/components/PlanRegion.tsx.md) | 文件 | 3 | 计划区域：渲染 Agent 给出的 plan 条目列表及其当前状态，并支持条目级操作。 |
| [src/sidebar/components/regionEquality.ts](../../../files/src/sidebar/components/regionEquality.ts.md) | 文件 | 8 | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |
| [src/sidebar/components/replyHistory.ts](../../../files/src/sidebar/components/replyHistory.ts.md) | 文件 | 6 | 回复输入历史模块：按 owner 记录已发送文本，支持上下键历史导航与光标首末行判定。 |
| [src/sidebar/components/ReplyRegion.tsx](../../../files/src/sidebar/components/ReplyRegion.tsx.md) | 文件 | 3 | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |
| [src/sidebar/components/ToolbarRegion.tsx](../../../files/src/sidebar/components/ToolbarRegion.tsx.md) | 文件 | 0 | 工具栏区域：组合视图模式切换与面板级操作按钮，作为非 transcript 的固定 chrome 区域。 |
| [src/sidebar/components/TranscriptRegion.tsx](../../../files/src/sidebar/components/TranscriptRegion.tsx.md) | 文件 | 0 | Transcript 区域的 Preact 包装组件：管理 transcript 容器的 mount，并把手势交给命令式渲染器。 |
| [src/sidebar/components/ViewModeToggle.tsx](../../../files/src/sidebar/components/ViewModeToggle.tsx.md) | 文件 | 0 | 视图模式切换控件：在紧凑/完整等 transcript 展示模式之间切换并派发宿主动作。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/shared](../shared.md) | 1 |
