
# rust/zotero-bridge/src/transport.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/transport.rs -->

HTTP 传输层：endpoint 解析、认证头注入、JSON 请求/响应处理、operation id 生成与记录、错误到 CliError 的映射，以及带重试与 sha256 校验的文件上传下载。
源码：[rust/zotero-bridge/src/transport.rs](../../../../../../rust/zotero-bridge/src/transport.rs)

## 符号（16）
<!-- node: function:rust/zotero-bridge/src/transport.rs:bridge_error_from_value -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:build_http_request -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:build_http_request_bytes -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:call -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:call_mutation_execute -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:download -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:download_once -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:operation_context -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:parse_endpoint -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:parse_http_response_bytes -->
<!-- node: class:rust/zotero-bridge/src/transport.rs:ParsedEndpoint -->
<!-- node: class:rust/zotero-bridge/src/transport.rs:ParsedHttpResponse -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:request_json_inner -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:request_json_with_operation_id -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:send_http_bytes -->
<!-- node: function:rust/zotero-bridge/src/transport.rs:upload -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bridge_error_from_value | 函数 | 535–646 | 复杂 | 错误映射、反序列化、契约 | 0 | 从 Bridge 错误 JSON 还原 CliError，保留 code、分类、details 与控制语义。 |
| build_http_request | 函数 | 671–709 | 中等 | http-client、认证、请求构造 | 0 | 构造带认证头与 JSON body 的 HTTP 请求对象。 |
| build_http_request_bytes | 函数 | 711–753 | 中等 | http-client、序列化、二进制 | 0 | 把请求序列化为可发送的字节流，供二进制上传等场景使用。 |
| call | 函数 | 98–113 | 简单 | capability、请求、client | 0 | 发起 capability 调用，复用统一 JSON 请求与认证注入路径。 |
| call_mutation_execute | 函数 | 115–133 | 中等 | mutation、幂等、operation-id | 0 | 以显式 operation id 执行 canonical mutation 请求，并强制透传 operation id 头。 |
| download | 函数 | 220–261 | 中等 | 下载、重试、容错 | 0 | 带重试的文件下载入口，对可重试错误做有界重试并返回 DownloadResponse。 |
| download_once | 函数 | 263–345 | 复杂 | 下载、错误映射、重试 | 0 | 单次下载尝试：发送请求、解析响应、区分传输错误与 Bridge 业务错误。 |
| operation_context | 函数 | 55–73 | 简单 | operation-id、错误处理、上下文 | 0 | 在错误上附加 operation id 与 next command，让调用方可以观察或续跑同一个操作。 |
| parse_endpoint | 函数 | 648–669 | 简单 | endpoint、解析、校验 | 0 | 把 endpoint 字符串拆解为 ParsedEndpoint，拒绝不支持的协议。 |
| parse_http_response_bytes | 函数 | 799–835 | 中等 | http、解析、io | 0 | 解析原始 HTTP 响应字节，拆出状态码、头部与 body。 |
| ParsedEndpoint | 类 | 20–27 | 简单 | type-definition、endpoint、解析 | 0 | 解析后的 endpoint 结构：协议、host、port 与路径前缀。 |
| ParsedHttpResponse | 类 | 29–36 | 简单 | type-definition、http、解析 | 0 | 解析后的 HTTP 响应：状态码与原始字节体。 |
| request_json_inner | 函数 | 418–525 | 复杂 | 请求、错误映射、http-client | 0 | JSON 请求核心：解析 endpoint、构造请求、发送、解析响应并把非 2xx 响应转成 CliError。 |
| request_json_with_operation_id | 函数 | 398–416 | 简单 | operation-id、请求、json | 0 | 带显式 operation id 与 next command 的 JSON 请求变体。 |
| send_http_bytes | 函数 | 759–791 | 中等 | http-client、socket、io | 0 | 通过运行时 socket 发送请求字节并读取原始响应。 |
| upload | 函数 | 143–211 | 复杂 | 上传、multipart、http-client | 0 | multipart 文件上传，构造带二进制 body 的请求并清洗不可打印的头部值。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.rs](client.rs.md) | rust/zotero-bridge/src/client.rs | Bridge 客户端门面：把 config 与 capability 组合成对 Host Bridge 的调用，识别 canonical mutation 并分流到 mutation 专用接口，同时提供 HTTP get/post/upload/download 快捷封装。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bridge_error_from_value | 函数 | 535–646 | 从 Bridge 错误 JSON 还原 CliError，保留 code、分类、details 与控制语义。 |
| build_http_request | 函数 | 671–709 | 构造带认证头与 JSON body 的 HTTP 请求对象。 |
| build_http_request_bytes | 函数 | 711–753 | 把请求序列化为可发送的字节流，供二进制上传等场景使用。 |
| call | 函数 | 98–113 | 发起 capability 调用，复用统一 JSON 请求与认证注入路径。 |
| call_mutation_execute | 函数 | 115–133 | 以显式 operation id 执行 canonical mutation 请求，并强制透传 operation id 头。 |
| download | 函数 | 220–261 | 带重试的文件下载入口，对可重试错误做有界重试并返回 DownloadResponse。 |
| download_once | 函数 | 263–345 | 单次下载尝试：发送请求、解析响应、区分传输错误与 Bridge 业务错误。 |
| operation_context | 函数 | 55–73 | 在错误上附加 operation id 与 next command，让调用方可以观察或续跑同一个操作。 |
| parse_endpoint | 函数 | 648–669 | 把 endpoint 字符串拆解为 ParsedEndpoint，拒绝不支持的协议。 |
| parse_http_response_bytes | 函数 | 799–835 | 解析原始 HTTP 响应字节，拆出状态码、头部与 body。 |
| ParsedEndpoint | 类 | 20–27 | 解析后的 endpoint 结构：协议、host、port 与路径前缀。 |
| ParsedHttpResponse | 类 | 29–36 | 解析后的 HTTP 响应：状态码与原始字节体。 |
| request_json_inner | 函数 | 418–525 | JSON 请求核心：解析 endpoint、构造请求、发送、解析响应并把非 2xx 响应转成 CliError。 |
| request_json_with_operation_id | 函数 | 398–416 | 带显式 operation id 与 next command 的 JSON 请求变体。 |
| send_http_bytes | 函数 | 759–791 | 通过运行时 socket 发送请求字节并读取原始响应。 |
| upload | 函数 | 143–211 | multipart 文件上传，构造带二进制 body 的请求并清洗不可打印的头部值。 |
