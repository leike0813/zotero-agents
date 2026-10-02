
# src/sidebar/components/ReplyRegion.tsx
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/ReplyRegion.tsx -->

回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。
源码：[src/sidebar/components/ReplyRegion.tsx](../../../../../../src/sidebar/components/ReplyRegion.tsx)

## 符号（3）
<!-- node: function:src/sidebar/components/ReplyRegion.tsx:formatTokenCount -->
<!-- node: function:src/sidebar/components/ReplyRegion.tsx:formatUsageLabel -->
<!-- node: function:src/sidebar/components/ReplyRegion.tsx:UsageGauge -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| formatTokenCount | 函数 | 36–43 | 简单 | formatting、utility、usage-meter、presentation | 1 | 把 token 数量格式化为紧凑可读文本。 |
| formatUsageLabel | 函数 | 45–55 | 简单 | formatting、usage-meter、presentation、utility | 1 | 组合上下文窗口与已用量文案。 |
| UsageGauge | 函数 | 57–105 | 中等 | component、usage-meter、progress、preact | 0 | 用量计量条：按占用比例渲染进度并附带数值标签。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ActionControls.tsx](ActionControls.tsx.md) | src/sidebar/components/ActionControls.tsx | 面板通用操作控件库：按钮、开关、执行展示模式切换与下拉选择器，供各 Workspace 区域按 DTO 中的 action 列表复用。 |
| [HintRegion.tsx](HintRegion.tsx.md) | src/sidebar/components/HintRegion.tsx | 提示区域：渲染受限长度的提示文本、权限摘要与认证区块，把可点击动作通过 ActionControls 派发给宿主。 |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |
| [replyHistory.ts](replyHistory.ts.md) | src/sidebar/components/replyHistory.ts | 回复输入历史模块：按 owner 记录已发送文本，支持上下键历史导航与光标首末行判定。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [chromeRenderer.ts](chromeRenderer.ts.md) | src/sidebar/components/chromeRenderer.ts | Workspace chrome 渲染协调器：按区域 signature 差异驱动各 Preact managed region 渲染，并把 transcript 容器交给命令式渲染器。 |
