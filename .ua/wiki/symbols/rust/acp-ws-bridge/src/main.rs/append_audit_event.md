
# append_audit_event
<!-- node: function:rust/acp-ws-bridge/src/main.rs:append_audit_event -->

向审计 sink 追加一条结构化事件，先脱敏再落盘，保证并发写入不交错。
类型：函数  
复杂度：复杂  
入边数：1  
标签：审计、持久化、并发安全、日志  
所属文件：[rust/acp-ws-bridge/src/main.rs](../../../../../files/rust/acp-ws-bridge/src/main.rs.md)
源码：[rust/acp-ws-bridge/src/main.rs:174](../../../../../../../rust/acp-ws-bridge/src/main.rs#L174)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [handle_connection](../../../../../files/rust/acp-ws-bridge/src/main.rs.md) | rust/acp-ws-bridge/src/main.rs:611–990 | 单连接主循环：在 WebSocket 客户端与后端子进程之间双向转发帧，处理关闭、错误与审计记录。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [sanitize_json_value](../../../../../files/rust/acp-ws-bridge/src/main.rs.md) | rust/acp-ws-bridge/src/main.rs:123–146 | 递归清洗审计日志中的 JSON 值，遮蔽敏感键并截断长字符串预览。 |
| [sanitize_text_preview](../../../../../files/rust/acp-ws-bridge/src/main.rs.md) | rust/acp-ws-bridge/src/main.rs:148–168 | 将任意文本裁剪为固定长度的预览串，用于审计事件的可读摘要。 |
