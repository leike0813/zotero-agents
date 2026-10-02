
# src/sidebar/components/replyHistory.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/sidebar/components](../../../../modules/src/sidebar/components.md)
<!-- node: file:src/sidebar/components/replyHistory.ts -->

回复输入历史模块：按 owner 记录已发送文本，支持上下键历史导航与光标首末行判定。
源码：[src/sidebar/components/replyHistory.ts](../../../../../../src/sidebar/components/replyHistory.ts)

## 符号（6）
<!-- node: function:src/sidebar/components/replyHistory.ts:navigateReplyHistory -->
<!-- node: function:src/sidebar/components/replyHistory.ts:rememberReplyHistory -->
<!-- node: function:src/sidebar/components/replyHistory.ts:replyHistoryKey -->
<!-- node: function:src/sidebar/components/replyHistory.ts:resetReplyHistoryNavigation -->
<!-- node: function:src/sidebar/components/replyHistory.ts:setTextareaValueAndCaret -->
<!-- node: function:src/sidebar/components/replyHistory.ts:shouldHandleReplyHistoryKey -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| navigateReplyHistory | 函数 | 95–117 | 中等 | history、keyboard-navigation、prompt-input、navigation | 1 | 按上下方向在历史记录间移动并把选中文本写回输入框。 |
| rememberReplyHistory | 函数 | 48–59 | 简单 | state、history、prompt-input、mutation | 0 | 记录一次已发送文本，裁剪历史上限并重置导航游标。 |
| replyHistoryKey | 函数 | 29–36 | 简单 | state、owner-scoping、prompt-input、utility | 0 | 生成回复历史的 owner 键，隔离不同 backend/conversation 与 requestId。 |
| resetReplyHistoryNavigation | 函数 | 61–65 | 简单 | state、history、prompt-input、reset | 0 | 重置历史导航游标，回到自由输入态。 |
| setTextareaValueAndCaret | 函数 | 67–73 | 简单 | dom-management、prompt-input、caret、utility | 1 | 写入输入框文本并把光标定位到指定行首尾，配合历史导航使用。 |
| shouldHandleReplyHistoryKey | 函数 | 119–131 | 简单 | keyboard-navigation、guard、prompt-input、validation | 0 | 判定按键是否应由回复历史处理，避免抢占普通输入行为。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [regionEquality.ts](regionEquality.ts.md) | src/sidebar/components/regionEquality.ts | 各区域 signature 相等判断的事实源：把面板 DTO 投影为稳定的结构化比较输入，并转调共享 regionEquality 工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ReplyRegion.tsx](ReplyRegion.tsx.md) | src/sidebar/components/ReplyRegion.tsx | 回复输入区域：承载 prompt 输入框、历史导航、token/用量计量与发送/中断操作。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| navigateReplyHistory | 函数 | 95–117 | 按上下方向在历史记录间移动并把选中文本写回输入框。 |
| rememberReplyHistory | 函数 | 48–59 | 记录一次已发送文本，裁剪历史上限并重置导航游标。 |
| replyHistoryKey | 函数 | 29–36 | 生成回复历史的 owner 键，隔离不同 backend/conversation 与 requestId。 |
| resetReplyHistoryNavigation | 函数 | 61–65 | 重置历史导航游标，回到自由输入态。 |
| shouldHandleReplyHistoryKey | 函数 | 119–131 | 判定按键是否应由回复历史处理，避免抢占普通输入行为。 |
