
# rust/zotero-bridge/src/client.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/client.rs -->

Bridge 客户端门面：把 config 与 capability 组合成对 Host Bridge 的调用，识别 canonical mutation 并分流到 mutation 专用接口，同时提供 HTTP get/post/upload/download 快捷封装。
源码：[rust/zotero-bridge/src/client.rs](../../../../../../rust/zotero-bridge/src/client.rs)

## 符号（5）
<!-- node: function:rust/zotero-bridge/src/client.rs:call -->
<!-- node: function:rust/zotero-bridge/src/client.rs:call_canonical_mutation -->
<!-- node: function:rust/zotero-bridge/src/client.rs:call_mutation_get_operation -->
<!-- node: function:rust/zotero-bridge/src/client.rs:is_canonical_mutation -->
<!-- node: function:rust/zotero-bridge/src/client.rs:resolve_mutation_operation_id -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| call | 函数 | 19–37 | 中等 | client、capability、分流 | 0 | 发起一次 capability 调用：canonical mutation 走 mutation 专用通道，其余走普通 JSON-RPC 风格的 capability 请求。 |
| call_canonical_mutation | 函数 | 76–106 | 中等 | mutation、幂等、client | 0 | 以显式 operation id 执行 canonical mutation，保证重放与幂等语义。 |
| call_mutation_get_operation | 函数 | 39–74 | 中等 | mutation、状态查询、client | 0 | 查询 canonical mutation 操作的终态证据，供 mutation.get_operation 观察执行结果。 |
| is_canonical_mutation | 函数 | 108–119 | 简单 | capability、predicate、mutation | 0 | 判定某个 capability 是否属于 canonical mutation 命名空间，以决定调用通道。 |
| resolve_mutation_operation_id | 函数 | 121–174 | 中等 | mutation、operation-id、解析 | 0 | 从命令行参数或既有记录中解析 mutation 的 operation id，缺失时生成新的。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [transport.rs](transport.rs.md) | rust/zotero-bridge/src/transport.rs | HTTP 传输层：endpoint 解析、认证头注入、JSON 请求/响应处理、operation id 生成与记录、错误到 CliError 的映射，以及带重试与 sha256 校验的文件上传下载。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| call | 函数 | 19–37 | 发起一次 capability 调用：canonical mutation 走 mutation 专用通道，其余走普通 JSON-RPC 风格的 capability 请求。 |
| call_canonical_mutation | 函数 | 76–106 | 以显式 operation id 执行 canonical mutation，保证重放与幂等语义。 |
| call_mutation_get_operation | 函数 | 39–74 | 查询 canonical mutation 操作的终态证据，供 mutation.get_operation 观察执行结果。 |
| is_canonical_mutation | 函数 | 108–119 | 判定某个 capability 是否属于 canonical mutation 命名空间，以决定调用通道。 |
| resolve_mutation_operation_id | 函数 | 121–174 | 从命令行参数或既有记录中解析 mutation 的 operation id，缺失时生成新的。 |
