
# rust/acp-ws-bridge/src/main.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/acp-ws-bridge/src](../../../../modules/rust/acp-ws-bridge/src.md)
<!-- node: file:rust/acp-ws-bridge/src/main.rs -->

ACP WS Bridge 的可执行入口，桥接插件侧 ACP 会话与 Agent 后端的 WebSocket 连接，负责握手、消息转发与生命周期管理。
源码：[rust/acp-ws-bridge/src/main.rs](../../../../../../rust/acp-ws-bridge/src/main.rs)

## 符号（18）
<!-- node: function:rust/acp-ws-bridge/src/main.rs:accept_websocket -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:append_audit_event -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:append_windows_process_args -->
<!-- node: class:rust/acp-ws-bridge/src/main.rs:ClientFrame -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:handle_connection -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:is_windows_cmd_shell -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:main -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:parse_args -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:read_client_frame -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:read_http_header -->
<!-- node: class:rust/acp-ws-bridge/src/main.rs:ReadyFile -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:run_server -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:sanitize_json_value -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:sanitize_text_preview -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:spawn_backend -->
<!-- node: class:rust/acp-ws-bridge/src/main.rs:SpawnRequest -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:websocket_accept_key -->
<!-- node: function:rust/acp-ws-bridge/src/main.rs:write_server_frame -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| accept_websocket | 函数 | 359–418 | 复杂 | websocket、握手、鉴权、安全 | 0 | 完成 WebSocket 握手：校验必需头、比对 token、生成 accept 响应并切换到帧模式。 |
| [append_audit_event](../../../../symbols/rust/acp-ws-bridge/src/main.rs/append_audit_event.md) | 函数 | 174–236 | 复杂 | 审计、持久化、并发安全、日志 | 1 | 向审计 sink 追加一条结构化事件，先脱敏再落盘，保证并发写入不交错。 |
| append_windows_process_args | 函数 | 554–567 | 中等 | 平台兼容、windows、参数转义 | 0 | 按 Windows 命令行引用规则拼装子进程参数，避免路径空格被错误切分。 |
| ClientFrame | 类 | 56–62 | 简单 | 数据结构、websocket、帧解析 | 0 | WebSocket 客户端帧的解析结构，承载 opcode 与 payload 字节。 |
| handle_connection | 函数 | 611–990 | 复杂 | websocket、acp、消息转发、生命周期、并发 | 0 | 单连接主循环：在 WebSocket 客户端与后端子进程之间双向转发帧，处理关闭、错误与审计记录。 |
| is_windows_cmd_shell | 函数 | 537–544 | 简单 | 平台兼容、windows、进程启动 | 0 | 判断命令行在 Windows 上是否经由 cmd.exe 外壳执行，以决定参数转义方式。 |
| main | 函数 | 1029–1051 | 中等 | entry-point、错误处理、进程退出 | 0 | 二进制入口：解析参数、启动服务，失败时写出错误就绪文件并以非零码退出。 |
| parse_args | 函数 | 256–284 | 中等 | 入口、参数解析、configuration | 1 | 解析命令行参数，组装 host、port、token、ready file 与 log file 等服务配置。 |
| [read_client_frame](../../../../symbols/rust/acp-ws-bridge/src/main.rs/read_client_frame.md) | 函数 | 439–483 | 复杂 | websocket、帧解析、缓冲区、二进制协议 | 1 | 从缓冲区与 socket 组合读取一个完整 WebSocket 客户端帧，处理分片与超长帧。 |
| read_http_header | 函数 | 329–353 | 中等 | http、帧读取、输入校验 | 1 | 从 TCP 流中读取完整 HTTP 头部，超过上限即拒绝，避免畸形请求耗尽内存。 |
| ReadyFile | 类 | 65–72 | 简单 | 数据结构、就绪发布、discovery | 0 | 服务就绪文件的写出结构，向插件侧公布监听地址与鉴权 token。 |
| [run_server](../../../../symbols/rust/acp-ws-bridge/src/main.rs/run_server.md) | 函数 | 992–1027 | 复杂 | 入口、tcp、服务生命周期、discovery | 1 | 绑定监听端口、发布就绪文件并循环接受连接，是服务生命周期的顶层驱动。 |
| sanitize_json_value | 函数 | 123–146 | 中等 | 审计、脱敏、序列化 | 1 | 递归清洗审计日志中的 JSON 值，遮蔽敏感键并截断长字符串预览。 |
| sanitize_text_preview | 函数 | 148–168 | 中等 | 审计、文本预览、截断 | 1 | 将任意文本裁剪为固定长度的预览串，用于审计事件的可读摘要。 |
| spawn_backend | 函数 | 569–593 | 中等 | 进程启动、acp、管道 | 1 | 拉起 Agent 后端子进程并接管其 stdin/stdout，形成 ACP 帧通道。 |
| SpawnRequest | 类 | 32–44 | 简单 | 数据结构、进程启动、acp | 0 | 描述要拉起的 Agent 后端子进程请求，包含命令行、参数、环境变量与工作目录。 |
| websocket_accept_key | 函数 | 322–327 | 简单 | websocket、握手、sha1 | 1 | 按 RFC 6455 用客户端 key 与固定 GUID 计算 WebSocket accept 响应头。 |
| write_server_frame | 函数 | 485–500 | 简单 | websocket、帧编码、二进制协议 | 1 | 按 opcode 序列化并写出一个 WebSocket 服务端帧。 |
