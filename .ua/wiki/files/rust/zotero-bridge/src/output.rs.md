
# rust/zotero-bridge/src/output.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/output.rs -->

统一输出层：把成功结果与错误结果序列化成固定的 SuccessOutput / ErrorOutput envelope，并暴露当前 CLI schema 供自描述使用。
源码：[rust/zotero-bridge/src/output.rs](../../../../../../rust/zotero-bridge/src/output.rs)

## 符号（2）
<!-- node: function:rust/zotero-bridge/src/output.rs:print_error -->
<!-- node: function:rust/zotero-bridge/src/output.rs:print_success -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| print_error | 函数 | 41–54 | 简单 | output、序列化、错误处理 | 0 | 把 CliError 包装为 ErrorOutput envelope 并写到 stderr。 |
| print_success | 函数 | 25–39 | 简单 | output、序列化、envelope | 0 | 把成功结果包装为 SuccessOutput envelope 并写到 stdout。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| print_error | 函数 | 41–54 | 把 CliError 包装为 ErrorOutput envelope 并写到 stderr。 |
| print_success | 函数 | 25–39 | 把成功结果包装为 SuccessOutput envelope 并写到 stdout。 |
