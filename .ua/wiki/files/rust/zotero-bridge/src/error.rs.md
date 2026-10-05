
# rust/zotero-bridge/src/error.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/error.rs -->

统一错误模型：按 config/validation/connection/protocol/auth/internal 分类构造 CliError，携带 retryable、state change、handle consumption 与 safe next actions 等控制语义，并映射为进程退出码与错误 payload。
源码：[rust/zotero-bridge/src/error.rs](../../../../../../rust/zotero-bridge/src/error.rs)

## 符号（7）
<!-- node: class:rust/zotero-bridge/src/error.rs:CliError -->
<!-- node: class:rust/zotero-bridge/src/error.rs:ErrorPayload -->
<!-- node: function:rust/zotero-bridge/src/error.rs:exit_code -->
<!-- node: function:rust/zotero-bridge/src/error.rs:new -->
<!-- node: function:rust/zotero-bridge/src/error.rs:to_payload -->
<!-- node: function:rust/zotero-bridge/src/error.rs:with_control -->
<!-- node: function:rust/zotero-bridge/src/error.rs:with_outcome -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CliError | 类 | 54–64 | 简单 | error-handling、type-definition、控制语义 | 0 | 统一 CLI 错误类型，携带分类、message、details、next command 与 retryable/state change/handle consumption 控制语义。 |
| ErrorPayload | 类 | 140–158 | 简单 | 序列化、type-definition、契约 | 0 | 错误对外序列化结构：分类、code、message、details、next command 与安全的后续动作列表。 |
| exit_code | 函数 | 159–173 | 简单 | 退出码、错误处理、cli | 0 | 按错误分类映射进程退出码，供 CLI 与 shell 脚本判定失败类型。 |
| new | 函数 | 67–83 | 简单 | 错误处理、构造器 | 0 | 构造带分类与 code 的 CliError 基底实例。 |
| to_payload | 函数 | 175–202 | 简单 | 序列化、错误处理 | 0 | 把 CliError 序列化为对外的 ErrorOutput payload JSON。 |
| with_control | 函数 | 95–119 | 中等 | 错误处理、控制语义、可重试 | 0 | 在错误上附加 retryable、state changed、handle consumed 三元控制语义与安全后续动作。 |
| with_outcome | 函数 | 121–133 | 简单 | 错误处理、控制语义 | 0 | 以四元组形式（重试性、状态变更、handle 消耗、后续动作）一次性补全错误结果语义。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contract.rs](contract.rs.md) | rust/zotero-bridge/src/contract.rs | Host Bridge 契约的单一事实源：解析并校验 meta schema，构建 capability/command 注册表，解析组合式 command 的输入与结果 schema，并生成带 violations 的校验错误与安全引用值。 |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |
| [schema.rs](schema.rs.md) | rust/zotero-bridge/src/schema.rs | CLI schema 自省子命令：识别 schema 请求形式的 argv，展开命令树为带 example 的完整 JSON schema，并用契约补全各命令的 help 与参数示例。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CliError | 类 | 54–64 | 统一 CLI 错误类型，携带分类、message、details、next command 与 retryable/state change/handle consumption 控制语义。 |
| ErrorPayload | 类 | 140–158 | 错误对外序列化结构：分类、code、message、details、next command 与安全的后续动作列表。 |
| exit_code | 函数 | 159–173 | 按错误分类映射进程退出码，供 CLI 与 shell 脚本判定失败类型。 |
| new | 函数 | 67–83 | 构造带分类与 code 的 CliError 基底实例。 |
| to_payload | 函数 | 175–202 | 把 CliError 序列化为对外的 ErrorOutput payload JSON。 |
| with_control | 函数 | 95–119 | 在错误上附加 retryable、state changed、handle consumed 三元控制语义与安全后续动作。 |
| with_outcome | 函数 | 121–133 | 以四元组形式（重试性、状态变更、handle 消耗、后续动作）一次性补全错误结果语义。 |
