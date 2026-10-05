
# rust/zotero-bridge/src/args.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/args.rs -->

Zotero Bridge CLI 的 clap 命令行参数定义，涵盖 surface、bridge、operation、navigation、context、item、note、library、annotation、synthesis、topics、concepts、citation-graph 等全部命令树，并提供 operation id 归一化工具。
源码：[rust/zotero-bridge/src/args.rs](../../../../../../rust/zotero-bridge/src/args.rs)

## 符号（7）
<!-- node: class:rust/zotero-bridge/src/args.rs:CitationGraphCommand -->
<!-- node: class:rust/zotero-bridge/src/args.rs:Cli -->
<!-- node: class:rust/zotero-bridge/src/args.rs:Command -->
<!-- node: function:rust/zotero-bridge/src/args.rs:normalize_operation_id -->
<!-- node: class:rust/zotero-bridge/src/args.rs:RunCommand -->
<!-- node: class:rust/zotero-bridge/src/args.rs:SynthesisCommand -->
<!-- node: class:rust/zotero-bridge/src/args.rs:WorkflowCommand -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CitationGraphCommand | 类 | 878–932 | 中等 | cli、citation-graph、type-definition | 0 | 引用图谱命令参数组，覆盖 metrics、layout、page、continuation 等读模型入口。 |
| Cli | 类 | 12–52 | 中等 | cli、type-definition、入口 | 0 | CLI 根结构：全局参数（endpoint、token、profile、connection mode）与顶层 Command 枚举。 |
| Command | 类 | 67–118 | 中等 | cli、type-definition、命令枚举 | 0 | 顶层命令枚举，串联 surface、bridge、item、note、library、synthesis、workflow、run、file 等全部命令族。 |
| normalize_operation_id | 函数 | 4052–4067 | 简单 | operation-id、归一化、校验 | 0 | 归一化命令行传入的 operation id，去除空白并校验字符集。 |
| RunCommand | 类 | 1741–1783 | 中等 | cli、agent-run、type-definition | 0 | Agent 运行命令参数组，描述一次 run 所需的输入、绑定与生命周期选项。 |
| SynthesisCommand | 类 | 665–692 | 简单 | cli、synthesis、type-definition | 0 | Synthesis 命令参数组，暴露索引、缓存与概念等 surface 能力。 |
| WorkflowCommand | 类 | 1232–1323 | 中等 | cli、工作流、type-definition | 0 | 工作流命令枚举：validate、submit、status、cancel、profile 等工作流生命周期操作。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [commands.rs](commands.rs.md) | rust/zotero-bridge/src/commands.rs | Bridge 命令实现层：把每个 CLI 子命令翻译为 capability 调用与参数映射，包含直接研究包（direct paper/topic research bundle）的本地 zip 输出、产物校验与分页游标等支撑逻辑。 |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |
| [schema.rs](schema.rs.md) | rust/zotero-bridge/src/schema.rs | CLI schema 自省子命令：识别 schema 请求形式的 argv，展开命令树为带 example 的完整 JSON schema，并用契约补全各命令的 help 与参数示例。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CitationGraphCommand | 类 | 878–932 | 引用图谱命令参数组，覆盖 metrics、layout、page、continuation 等读模型入口。 |
| Cli | 类 | 12–52 | CLI 根结构：全局参数（endpoint、token、profile、connection mode）与顶层 Command 枚举。 |
| Command | 类 | 67–118 | 顶层命令枚举，串联 surface、bridge、item、note、library、synthesis、workflow、run、file 等全部命令族。 |
| normalize_operation_id | 函数 | 4052–4067 | 归一化命令行传入的 operation id，去除空白并校验字符集。 |
| RunCommand | 类 | 1741–1783 | Agent 运行命令参数组，描述一次 run 所需的输入、绑定与生命周期选项。 |
| SynthesisCommand | 类 | 665–692 | Synthesis 命令参数组，暴露索引、缓存与概念等 surface 能力。 |
| WorkflowCommand | 类 | 1232–1323 | 工作流命令枚举：validate、submit、status、cancel、profile 等工作流生命周期操作。 |
