
# rust/zotero-bridge/src/schema.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/schema.rs -->

CLI schema 自省子命令：识别 schema 请求形式的 argv，展开命令树为带 example 的完整 JSON schema，并用契约补全各命令的 help 与参数示例。
源码：[rust/zotero-bridge/src/schema.rs](../../../../../../rust/zotero-bridge/src/schema.rs)

## 符号（4）
<!-- node: function:rust/zotero-bridge/src/schema.rs:augment -->
<!-- node: function:rust/zotero-bridge/src/schema.rs:example_lines -->
<!-- node: function:rust/zotero-bridge/src/schema.rs:leaf_path -->
<!-- node: function:rust/zotero-bridge/src/schema.rs:run -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| augment | 函数 | 113–142 | 中等 | schema-生成、契约、help | 0 | 把契约信息注入 clap Command 树，生成带 description 与 example 的命令 schema。 |
| example_lines | 函数 | 75–111 | 中等 | help、契约、示例生成 | 0 | 从契约中提取命令示例行，写入子命令 help 文本。 |
| leaf_path | 函数 | 12–56 | 中等 | cli、argv、解析 | 0 | 从 argv 中提取命令叶路径（如 item get），用于 schema 自省与当前命令登记。 |
| run | 函数 | 58–73 | 简单 | schema-生成、自省、cli | 0 | 执行 schema 自省请求，返回补全后的完整 JSON schema。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [args.rs](args.rs.md) | rust/zotero-bridge/src/args.rs | Zotero Bridge CLI 的 clap 命令行参数定义，涵盖 surface、bridge、operation、navigation、context、item、note、library、annotation、synthesis、topics、concepts、citation-graph 等全部命令树，并提供 operation id 归一化工具。 |
| [error.rs](error.rs.md) | rust/zotero-bridge/src/error.rs | 统一错误模型：按 config/validation/connection/protocol/auth/internal 分类构造 CliError，携带 retryable、state change、handle consumption 与 safe next actions 等控制语义，并映射为进程退出码与错误 payload。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| augment | 函数 | 113–142 | 把契约信息注入 clap Command 树，生成带 description 与 example 的命令 schema。 |
| example_lines | 函数 | 75–111 | 从契约中提取命令示例行，写入子命令 help 文本。 |
| leaf_path | 函数 | 12–56 | 从 argv 中提取命令叶路径（如 item get），用于 schema 自省与当前命令登记。 |
| run | 函数 | 58–73 | 执行 schema 自省请求，返回补全后的完整 JSON schema。 |
