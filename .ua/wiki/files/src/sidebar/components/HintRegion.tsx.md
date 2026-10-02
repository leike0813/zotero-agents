
# src/sidebar/components/HintRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/HintRegion.tsx -->

提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。
源码：[src/sidebar/components/HintRegion.tsx](../../../../../../src/sidebar/components/HintRegion.tsx)

## 符号（4）
<!-- node: function:src/sidebar/components/HintRegion.tsx:AuthSection -->
<!-- node: function:src/sidebar/components/HintRegion.tsx:hintText -->
<!-- node: function:src/sidebar/components/HintRegion.tsx:PermissionSummary -->
<!-- node: function:src/sidebar/components/HintRegion.tsx:truncateText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AuthSection | 函数 | 144–275 | 复杂 | component、authentication、region、preact | 0 | 认证区块：展示后端认证方式、状态与登录/授权动作。 |
| hintText | 函数 | 34–80 | 中等 | projection、text、region、presentation | 0 | 解析 hint 条目的可见文本，优先使用显式文案再回落到节点文本。 |
| PermissionSummary | 函数 | 82–142 | 中等 | component、permission、summary、preact | 1 | 权限摘要：汇总待审批权限的类别、范围与风险提示。 |
| truncateText | 函数 | 17–22 | 简单 | utility、text-truncation、presentation、pure-function | 0 | 按字符上限截断文本并补省略号，约束提示区行宽。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
| [ContextDrawerRegion.tsx](ContextDrawerRegion.tsx.md) | src/sidebar/components/ContextDrawerRegion.tsx | 上下文抽屉区域：按 status axis 与任务分组展示工作区任务/队列任务，支持任务级 action 操作与折叠分组。 |
| [DetailsDrawerRegion.tsx](DetailsDrawerRegion.tsx.md) | src/sidebar/components/DetailsDrawerRegion.tsx | 详情抽屉区域：把详情区块投影为分节条目渲染，并内嵌 Hint 区域呈现说明文本。 |
| [PermissionDrawerRegion.tsx](PermissionDrawerRegion.tsx.md) | src/sidebar/components/PermissionDrawerRegion.tsx | 权限请求抽屉区域：列出待审批的权限请求项及选项按钮，并组合 Hint 区域给出补充说明。 |
| [ReplyRegion.tsx](ReplyRegion.tsx.md) | src/sidebar/components/ReplyRegion.tsx | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |
