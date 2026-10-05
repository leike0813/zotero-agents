
# rust/zotero-bridge/src
> 目录聚合页：11 个文件、105 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [rust/zotero-bridge/src/args.rs](../../../files/rust/zotero-bridge/src/args.rs.md) | 文件 | 7 | Zotero Bridge CLI 的 clap 命令行参数定义，涵盖 surface、bridge、operation、navigation、context、item、note、library、annotation、synthesis、topics、concepts、citation-graph 等全部命令树，并提供 operation id 归一化工具。 |
| [rust/zotero-bridge/src/client.rs](../../../files/rust/zotero-bridge/src/client.rs.md) | 文件 | 5 | Bridge 客户端门面：把 config 与 capability 组合成对 Host Bridge 的调用，识别 canonical mutation 并分流到 mutation 专用接口，同时提供 HTTP get/post/upload/download 快捷封装。 |
| [rust/zotero-bridge/src/commands.rs](../../../files/rust/zotero-bridge/src/commands.rs.md) | 文件 | 27 | Bridge 命令实现层：把每个 CLI 子命令翻译为 capability 调用与参数映射，包含直接研究包（direct paper/topic research bundle）的本地 zip 输出、产物校验与分页游标等支撑逻辑。 |
| [rust/zotero-bridge/src/config.rs](../../../files/rust/zotero-bridge/src/config.rs.md) | 文件 | 5 | Bridge 配置与 profile 解析：加载 CLI 配置、要求访问 token、定位 profile 文件（显式路径或 well-known 路径），并归一化 endpoint 与连接模式。 |
| [rust/zotero-bridge/src/contract.rs](../../../files/rust/zotero-bridge/src/contract.rs.md) | 文件 | 17 | Host Bridge 契约的单一事实源：解析并校验 meta schema，构建 capability/command 注册表，解析组合式 command 的输入与结果 schema，并生成带 violations 的校验错误与安全引用值。 |
| [rust/zotero-bridge/src/error.rs](../../../files/rust/zotero-bridge/src/error.rs.md) | 文件 | 7 | 统一错误模型：按 config/validation/connection/protocol/auth/internal 分类构造 CliError，携带 retryable、state change、handle consumption 与 safe next actions 等控制语义，并映射为进程退出码与错误 payload。 |
| [rust/zotero-bridge/src/main.rs](../../../files/rust/zotero-bridge/src/main.rs.md) | 文件 | 3 | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |
| [rust/zotero-bridge/src/output.rs](../../../files/rust/zotero-bridge/src/output.rs.md) | 文件 | 2 | 统一输出层：把成功结果与错误结果序列化成固定的 SuccessOutput / ErrorOutput envelope，并暴露当前 CLI schema 供自描述使用。 |
| [rust/zotero-bridge/src/schema.rs](../../../files/rust/zotero-bridge/src/schema.rs.md) | 文件 | 4 | CLI schema 自省子命令：识别 schema 请求形式的 argv，展开命令树为带 example 的完整 JSON schema，并用契约补全各命令的 help 与参数示例。 |
| [rust/zotero-bridge/src/surface.rs](../../../files/rust/zotero-bridge/src/surface.rs.md) | 文件 | 12 | Agent-facing surface 生成器：把命令树编译为 invocation schema、argv 绑定与 agent 目标描述，产出带 checksum 的稳定描述符，并支撑 describe / search 子命令。 |
| [rust/zotero-bridge/src/transport.rs](../../../files/rust/zotero-bridge/src/transport.rs.md) | 文件 | 16 | HTTP 传输层：endpoint 解析、认证头注入、JSON 请求/响应处理、operation id 生成与记录、错误到 CliError 的映射，以及带重试与 sha256 校验的文件上传下载。 |
