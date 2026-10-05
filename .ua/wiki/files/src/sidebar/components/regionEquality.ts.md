
# src/sidebar/components/regionEquality.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/regionEquality.ts -->

各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。
源码：[src/sidebar/components/regionEquality.ts](../../../../../../src/sidebar/components/regionEquality.ts)

## 符号（8）
<!-- node: function:src/sidebar/components/regionEquality.ts:contextDrawerEqualityInput -->
<!-- node: function:src/sidebar/components/regionEquality.ts:detailsDrawerEqualityInput -->
<!-- node: function:src/sidebar/components/regionEquality.ts:equalBySignature -->
<!-- node: function:src/sidebar/components/regionEquality.ts:labelOf -->
<!-- node: function:src/sidebar/components/regionEquality.ts:messageCountsEqualityInput -->
<!-- node: function:src/sidebar/components/regionEquality.ts:permissionDrawerEqualityInput -->
<!-- node: function:src/sidebar/components/regionEquality.ts:replyRegionEqualityInput -->
<!-- node: function:src/sidebar/components/regionEquality.ts:replyStructuralSignature -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| contextDrawerEqualityInput | 函数 | 184–200 | 中等 | memoization、signature、drawer、task-grouping | 1 | 上下文抽屉比较输入：分组键、任务键与各任务动作，构成抽屉的唯一重渲染依据。 |
| detailsDrawerEqualityInput | 函数 | 162–177 | 简单 | memoization、signature、drawer、region | 1 | 详情抽屉比较输入：区块标题、条目文本与开放状态。 |
| equalBySignature | 函数 | 200–200 | 简单 | memoization、signature、re-export、equality | 0 | sidebar 侧 re-export 的签名相等判断，转调 src/shared 的页面无关实现。 |
| labelOf | 函数 | 51–64 | 简单 | label-projection、i18n、accessor、utility | 0 | 在面板文案根下做点号路径查找，缺失时回落到默认值。 |
| messageCountsEqualityInput | 函数 | 77–92 | 简单 | memoization、signature、region、statistics | 1 | 构造消息计数区域的比较输入，只包含用户可见计数。 |
| permissionDrawerEqualityInput | 函数 | 145–157 | 简单 | memoization、signature、permission、drawer | 1 | 权限抽屉比较输入：只含待审批项的标识、选项与开放状态。 |
| replyRegionEqualityInput | 函数 | 122–140 | 中等 | memoization、signature、region、prompt-input | 0 | 回复区域比较输入：结构签名加可见元数据，禁止把 transcript 计数混入。 |
| replyStructuralSignature | 函数 | 111–120 | 简单 | memoization、signature、region、prompt-input | 1 | 回复区域的签名只取结构特征（是否发送中、是否有草稿），刻意排除内容差异。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](../../shared/regionEquality.ts.md) | src/shared/regionEquality.ts | 为把渲染拆成多个独立 memo 化区域的页面 bundle 提供区域等价判定原语。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [BannerRegion.tsx](BannerRegion.tsx.md) | src/sidebar/components/BannerRegion.tsx | Workspace 顶部横幅区域：渲染后端连接状态徽章与指示灯 LED，并把 banner 上可执行动作交给 ActionControls 派发。 |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
| [ContextDrawerRegion.tsx](ContextDrawerRegion.tsx.md) | src/sidebar/components/ContextDrawerRegion.tsx | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |
| [DetailsDrawerRegion.tsx](DetailsDrawerRegion.tsx.md) | src/sidebar/components/DetailsDrawerRegion.tsx | 详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。 |
| [EmptyStateRegion.tsx](EmptyStateRegion.tsx.md) | src/sidebar/components/EmptyStateRegion.tsx | 工作区空态区域组件，按 DTO 投影渲染无任务/无会话时的占位提示。 |
| [HintRegion.tsx](HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [MessageCountsRegion.tsx](MessageCountsRegion.tsx.md) | src/sidebar/components/MessageCountsRegion.tsx | 消息计数区域：展示 transcript 消息条数等统计数字，由 regionEquality 的计数比较输入控制更新。 |
| [PermissionDrawerRegion.tsx](PermissionDrawerRegion.tsx.md) | src/sidebar/components/PermissionDrawerRegion.tsx | 权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。 |
| [PlanRegion.tsx](PlanRegion.tsx.md) | src/sidebar/components/PlanRegion.tsx | 计划区域：渲染 Agent 给出的 plan 条目列表及其当前状态，并支持条目级操作。 |
| [replyHistory.ts](replyHistory.ts.md) | src/sidebar/components/replyHistory.ts | 回复输入历史模块：按 owner 记录已发送文本，支持上下键历史导航与光标首末行判定。 |
| [ReplyRegion.tsx](ReplyRegion.tsx.md) | src/sidebar/components/ReplyRegion.tsx | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |
| [ToolbarRegion.tsx](ToolbarRegion.tsx.md) | src/sidebar/components/ToolbarRegion.tsx | 工具栏区域：组合视图模式切换与面板级操作按钮，作为非 transcript 的固定 chrome 区域。 |
| [TranscriptRegion.tsx](TranscriptRegion.tsx.md) | src/sidebar/components/TranscriptRegion.tsx | Transcript 区域的 Preact 包装组件：管理 transcript 容器的 mount，并把手势交给命令式渲染器。 |
| [ViewModeToggle.tsx](ViewModeToggle.tsx.md) | src/sidebar/components/ViewModeToggle.tsx | 视图模式切换控件：在紧凑/完整等 transcript 展示模式之间切换并派发宿主动作。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| contextDrawerEqualityInput | 函数 | 184–200 | 上下文抽屉比较输入：分组键、任务键与各任务动作，构成抽屉的唯一重渲染依据。 |
| detailsDrawerEqualityInput | 函数 | 162–177 | 详情抽屉比较输入：区块标题、条目文本与开放状态。 |
| labelOf | 函数 | 51–64 | 在面板文案根下做点号路径查找，缺失时回落到默认值。 |
| messageCountsEqualityInput | 函数 | 77–92 | 构造消息计数区域的比较输入，只包含用户可见计数。 |
| permissionDrawerEqualityInput | 函数 | 145–157 | 权限抽屉比较输入：只含待审批项的标识、选项与开放状态。 |
| replyRegionEqualityInput | 函数 | 122–140 | 回复区域比较输入：结构签名加可见元数据，禁止把 transcript 计数混入。 |
| replyStructuralSignature | 函数 | 111–120 | 回复区域的签名只取结构特征（是否发送中、是否有草稿），刻意排除内容差异。 |
