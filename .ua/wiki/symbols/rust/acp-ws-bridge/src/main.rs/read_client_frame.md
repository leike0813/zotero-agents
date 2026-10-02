
# read_client_frame
<!-- node: function:rust/acp-ws-bridge/src/main.rs:read_client_frame -->

从缓冲区与 socket 组合读取一个完整 WebSocket 客户端帧，处理分片与超长帧。
类型：函数  
复杂度：复杂  
入边数：1  
标签：websocket、帧解析、缓冲区、二进制协议  
所属文件：[rust/acp-ws-bridge/src/main.rs](../../../../../files/rust/acp-ws-bridge/src/main.rs.md)
源码：[rust/acp-ws-bridge/src/main.rs:439](../../../../../../../rust/acp-ws-bridge/src/main.rs#L439)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [handle_connection](../../../../../files/rust/acp-ws-bridge/src/main.rs.md) | rust/acp-ws-bridge/src/main.rs:611–990 | 单连接主循环：在 WebSocket 客户端与后端子进程之间双向转发帧，处理关闭、错误与审计记录。 |

## 调用

该符号没有记录对外调用。
