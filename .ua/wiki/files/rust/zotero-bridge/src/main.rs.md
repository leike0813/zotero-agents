
# rust/zotero-bridge/src/main.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/main.rs -->

Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。
源码：[rust/zotero-bridge/src/main.rs](../../../../../../rust/zotero-bridge/src/main.rs)

## 符号（3）
<!-- node: function:rust/zotero-bridge/src/main.rs:clap_error -->
<!-- node: function:rust/zotero-bridge/src/main.rs:main -->
<!-- node: function:rust/zotero-bridge/src/main.rs:run -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| clap_error | 函数 | 28–96 | 中等 | 错误处理、cli、转换 | 0 | 把 clap 的解析与校验失败翻译为 CliError，区分 usage 错误与参数校验错误，并附带可执行的下一步命令提示。 |
| main | 函数 | 98–151 | 中等 | entry-point、cli、流程编排 | 0 | 进程入口：优先处理 schema 自省请求，再解析 CLI、把当前命令路径登记到契约、校验结果并输出成功/错误 envelope。 |
| run | 函数 | 153–175 | 简单 | 分发、命令路由、cli | 0 | 命令分发：surface 命令在加载配置前短路返回，其余命令统一走 BridgeConfig 并路由到 commands 模块。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [args.rs](args.rs.md) | rust/zotero-bridge/src/args.rs | Zotero Bridge CLI 的 clap 命令行参数定义，涵盖 surface、bridge、operation、navigation、context、item、note、library、annotation、synthesis、topics、concepts、citation-graph 等全部命令树，并提供 operation id 归一化工具。 |
| [client.rs](client.rs.md) | rust/zotero-bridge/src/client.rs | Bridge 客户端门面：把 config 与 capability 组合成对 Host Bridge 的调用，识别 canonical mutation 并分流到 mutation 专用接口，同时提供 HTTP get/post/upload/download 快捷封装。 |
| [commands.rs](commands.rs.md) | rust/zotero-bridge/src/commands.rs | Bridge 命令实现层：把每个 CLI 子命令翻译为 capability 调用与参数映射，包含直接研究包（direct paper/topic research bundle）的本地 zip 输出、产物校验与分页游标等支撑逻辑。 |
| [config.rs](config.rs.md) | rust/zotero-bridge/src/config.rs | Bridge 配置与 profile 解析：加载 CLI 配置、要求访问 token、定位 profile 文件（显式路径或 well-known 路径），并归一化 endpoint 与连接模式。 |
| [contract.rs](contract.rs.md) | rust/zotero-bridge/src/contract.rs | Host Bridge 契约的单一事实源：解析并校验 meta schema，构建 capability/command 注册表，解析组合式 command 的输入与结果 schema，并生成带 violations 的校验错误与安全引用值。 |
| [error.rs](error.rs.md) | rust/zotero-bridge/src/error.rs | 统一错误模型：按 config/validation/connection/protocol/auth/internal 分类构造 CliError，携带 retryable、state change、handle consumption 与 safe next actions 等控制语义，并映射为进程退出码与错误 payload。 |
| [output.rs](output.rs.md) | rust/zotero-bridge/src/output.rs | 统一输出层：把成功结果与错误结果序列化成固定的 SuccessOutput / ErrorOutput envelope，并暴露当前 CLI schema 供自描述使用。 |
| [schema.rs](schema.rs.md) | rust/zotero-bridge/src/schema.rs | CLI schema 自省子命令：识别 schema 请求形式的 argv，展开命令树为带 example 的完整 JSON schema，并用契约补全各命令的 help 与参数示例。 |
| [surface.rs](surface.rs.md) | rust/zotero-bridge/src/surface.rs | Agent-facing surface 生成器：把命令树编译为 invocation schema、argv 绑定与 agent 目标描述，产出带 checksum 的稳定描述符，并支撑 describe / search 子命令。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| clap_error | 函数 | 28–96 | 把 clap 的解析与校验失败翻译为 CliError，区分 usage 错误与参数校验错误，并附带可执行的下一步命令提示。 |
| main | 函数 | 98–151 | 进程入口：优先处理 schema 自省请求，再解析 CLI、把当前命令路径登记到契约、校验结果并输出成功/错误 envelope。 |
| run | 函数 | 153–175 | 命令分发：surface 命令在加载配置前短路返回，其余命令统一走 BridgeConfig 并路由到 commands 模块。 |
