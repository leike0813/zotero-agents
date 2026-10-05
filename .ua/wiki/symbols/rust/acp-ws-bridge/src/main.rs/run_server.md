
# run_server
<!-- node: function:rust/acp-ws-bridge/src/main.rs:run_server -->

绑定监听端口、发布就绪文件并循环接受连接，是服务生命周期的顶层驱动。
类型：函数  
复杂度：复杂  
入边数：1  
标签：入口、tcp、服务生命周期、discovery  
所属文件：[rust/acp-ws-bridge/src/main.rs](../../../../../files/rust/acp-ws-bridge/src/main.rs.md)
源码：[rust/acp-ws-bridge/src/main.rs:992](../../../../../../../rust/acp-ws-bridge/src/main.rs#L992)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../../../files/rust/acp-ws-bridge/src/main.rs.md) | rust/acp-ws-bridge/src/main.rs:1029–1051 | 二进制入口：解析参数、启动服务，失败时写出错误就绪文件并以非零码退出。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [parse_args](../../../../../files/rust/acp-ws-bridge/src/main.rs.md) | rust/acp-ws-bridge/src/main.rs:256–284 | 解析命令行参数，组装 host、port、token、ready file 与 log file 等服务配置。 |
