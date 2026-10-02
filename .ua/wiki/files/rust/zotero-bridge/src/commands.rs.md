
# rust/zotero-bridge/src/commands.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/commands.rs -->

Bridge 命令实现层：把每个 CLI 子命令翻译为 capability 调用与参数映射，包含直接研究包（direct paper/topic research bundle）的本地 zip 输出、产物校验与分页游标等支撑逻辑。
源码：[rust/zotero-bridge/src/commands.rs](../../../../../../rust/zotero-bridge/src/commands.rs)

## 符号（27）
<!-- node: function:rust/zotero-bridge/src/commands.rs:direct_paper_research_bundle_arguments -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:direct_topic_research_bundle_arguments -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:file_upload -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:library -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:local_page_cursor -->
<!-- node: class:rust/zotero-bridge/src/commands.rs:LocalBundle -->
<!-- node: class:rust/zotero-bridge/src/commands.rs:LocalPageCursor -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:mutation_item_arguments -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:normalize_bundle_entry -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:notification_wait -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:output_contract_entries -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:portable_ref_value -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:read_json -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:read_json_arg -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:resolved_provider_profile_arg -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:run -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:validate_contract_artifacts -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:validate_direct_bundle_output_mode -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_agent_bundle_inspect -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_agent_result_validate -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_agent_run -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_profile -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_resource_bindings -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_selection_from -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:workflow_submit_input -->
<!-- node: function:rust/zotero-bridge/src/commands.rs:write_download_output -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| direct_paper_research_bundle_arguments | 函数 | 394–424 | 中等 | 参数映射、bundle、校验 | 0 | 装配直接论文研究包请求参数，联动输出目录与连接模式的互斥校验。 |
| direct_topic_research_bundle_arguments | 函数 | 426–456 | 中等 | 参数映射、bundle、主题 | 0 | 装配直接主题研究包请求参数，与论文研究包保持同构的输入约定。 |
| file_upload | 函数 | 2437–2468 | 中等 | 上传、附件、文件 | 0 | 把本地文件作为附件上传到 Bridge，返回可复用的 file 描述符。 |
| library | 函数 | 152–188 | 中等 | 命令分发、library、参数映射 | 0 | library 命令族分发：items、saved searches 与 readiness 检查的路由与参数装配。 |
| local_page_cursor | 函数 | 905–939 | 中等 | 分页、bundle、兼容层 | 0 | 为本地 bundle 构造分页游标，模拟在线分页语义以复用同一消费端代码。 |
| LocalBundle | 类 | 585–588 | 简单 | bundle、文件系统、type-definition | 0 | 本地 bundle 目录句柄，提供 open、contains_file、read_json 与产物契约条目枚举。 |
| LocalPageCursor | 类 | 866–872 | 简单 | 分页、游标、type-definition | 0 | 本地分页游标，记录 offset/limit 以在离线 bundle 上模拟分页读取。 |
| mutation_item_arguments | 函数 | 1510–1543 | 中等 | mutation、参数映射、canonical | 0 | 装配 canonical item mutation 的参数结构，区分创建与更新语义。 |
| normalize_bundle_entry | 函数 | 590–625 | 中等 | bundle、路径安全、归一化 | 0 | 归一化 bundle 内的产物条目名称，去除路径穿越与非法字符。 |
| notification_wait | 函数 | 2342–2368 | 中等 | notification、长轮询、事件 | 0 | 长轮询等待通知到达，汇总期间发生的任务与工作流事件。 |
| output_contract_entries | 函数 | 785–824 | 中等 | bundle、契约校验、产物 | 0 | 枚举 bundle 输出并对照产物契约校验必需文件是否齐备。 |
| portable_ref_value | 函数 | 1434–1465 | 中等 | portable-ref、选择、契约 | 0 | 把选择结果转成 portable ref，禁止把 native ID 或本地路径泄露进 DTO。 |
| read_json | 函数 | 724–783 | 复杂 | bundle、反序列化、错误处理 | 0 | 从 bundle 中读取并解析 JSON 产物，区分缺失、非法与结构不符三类失败。 |
| read_json_arg | 函数 | 2713–2774 | 复杂 | 参数解析、json、文件引用 | 0 | 解析命令行的 JSON 参数或 @file 引用，统一为 JSON Value。 |
| resolved_provider_profile_arg | 函数 | 1642–1673 | 中等 | profile、解析、工作流 | 0 | 解析工作流运行所需的 provider profile 参数，缺失时给出明确配置错误。 |
| run | 函数 | 1213–1250 | 中等 | 命令分发、工作流、生命周期 | 0 | run 命令族分发：执行工作流、读取 run 状态与生命周期操作。 |
| validate_contract_artifacts | 函数 | 1064–1101 | 中等 | 契约校验、工作流、产物 | 0 | 按契约逐项校验工作流产物，缺失或越界时给出可定位错误。 |
| validate_direct_bundle_output_mode | 函数 | 372–392 | 中等 | 校验、bundle、连接模式 | 0 | 校验直接研究包在 offline 与在线连接模式下的输出目录组合是否合法。 |
| workflow | 函数 | 511–546 | 中等 | 工作流、命令分发、endpoint | 0 | workflow 命令族分发，把 validate/submit/status/cancel/profile 等子命令映射到对应 endpoint。 |
| workflow_agent_bundle_inspect | 函数 | 941–1042 | 复杂 | agent-run、bundle、契约校验 | 0 | 检查 Agent 运行产生的 bundle 产物：结构、契约符合性与可复用性。 |
| workflow_agent_result_validate | 函数 | 1103–1167 | 复杂 | agent-run、结果校验、契约 | 0 | 校验 Agent run 结果是否符合 schema 与契约，并支持 apply 前置检查。 |
| workflow_agent_run | 函数 | 1927–1959 | 中等 | agent-run、参数映射、工作流 | 0 | 构造 Agent run 调用参数，联动 apply 结果与生命周期选项。 |
| workflow_profile | 函数 | 1169–1202 | 中等 | 工作流、profile、参数映射 | 0 | 解析并下发工作流 profile 绑定参数，含 provider profile 解析。 |
| workflow_resource_bindings | 函数 | 1826–1866 | 复杂 | 工作流、资源绑定、portable-ref | 0 | 装配工作流运行所需的资源绑定，仅接受完整 portable refs 作为输入。 |
| workflow_selection_from | 函数 | 1716–1788 | 复杂 | 工作流、选择、去重 | 0 | 从 CLI 输入构造工作流选择集合，处理去重与来源优先级。 |
| workflow_submit_input | 函数 | 1887–1914 | 中等 | 工作流、请求体、参数映射 | 0 | 构造工作流 submit 请求体，包含选择、资源绑定与运行参数。 |
| write_download_output | 函数 | 2528–2590 | 复杂 | 下载、文件系统、错误处理 | 0 | 把下载内容写入指定输出路径，处理目录创建、覆盖与失败清理。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [args.rs](args.rs.md) | rust/zotero-bridge/src/args.rs | Zotero Bridge CLI 的 clap 命令行参数定义，涵盖 surface、bridge、operation、navigation、context、item、note、library、annotation、synthesis、topics、concepts、citation-graph 等全部命令树，并提供 operation id 归一化工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| direct_paper_research_bundle_arguments | 函数 | 394–424 | 装配直接论文研究包请求参数，联动输出目录与连接模式的互斥校验。 |
| direct_topic_research_bundle_arguments | 函数 | 426–456 | 装配直接主题研究包请求参数，与论文研究包保持同构的输入约定。 |
| file_upload | 函数 | 2437–2468 | 把本地文件作为附件上传到 Bridge，返回可复用的 file 描述符。 |
| library | 函数 | 152–188 | library 命令族分发：items、saved searches 与 readiness 检查的路由与参数装配。 |
| local_page_cursor | 函数 | 905–939 | 为本地 bundle 构造分页游标，模拟在线分页语义以复用同一消费端代码。 |
| LocalBundle | 类 | 585–588 | 本地 bundle 目录句柄，提供 open、contains_file、read_json 与产物契约条目枚举。 |
| LocalPageCursor | 类 | 866–872 | 本地分页游标，记录 offset/limit 以在离线 bundle 上模拟分页读取。 |
| mutation_item_arguments | 函数 | 1510–1543 | 装配 canonical item mutation 的参数结构，区分创建与更新语义。 |
| normalize_bundle_entry | 函数 | 590–625 | 归一化 bundle 内的产物条目名称，去除路径穿越与非法字符。 |
| notification_wait | 函数 | 2342–2368 | 长轮询等待通知到达，汇总期间发生的任务与工作流事件。 |
| output_contract_entries | 函数 | 785–824 | 枚举 bundle 输出并对照产物契约校验必需文件是否齐备。 |
| portable_ref_value | 函数 | 1434–1465 | 把选择结果转成 portable ref，禁止把 native ID 或本地路径泄露进 DTO。 |
| read_json | 函数 | 724–783 | 从 bundle 中读取并解析 JSON 产物，区分缺失、非法与结构不符三类失败。 |
| read_json_arg | 函数 | 2713–2774 | 解析命令行的 JSON 参数或 @file 引用，统一为 JSON Value。 |
| resolved_provider_profile_arg | 函数 | 1642–1673 | 解析工作流运行所需的 provider profile 参数，缺失时给出明确配置错误。 |
| run | 函数 | 1213–1250 | run 命令族分发：执行工作流、读取 run 状态与生命周期操作。 |
| validate_contract_artifacts | 函数 | 1064–1101 | 按契约逐项校验工作流产物，缺失或越界时给出可定位错误。 |
| validate_direct_bundle_output_mode | 函数 | 372–392 | 校验直接研究包在 offline 与在线连接模式下的输出目录组合是否合法。 |
| workflow | 函数 | 511–546 | workflow 命令族分发，把 validate/submit/status/cancel/profile 等子命令映射到对应 endpoint。 |
| workflow_agent_bundle_inspect | 函数 | 941–1042 | 检查 Agent 运行产生的 bundle 产物：结构、契约符合性与可复用性。 |
| workflow_agent_result_validate | 函数 | 1103–1167 | 校验 Agent run 结果是否符合 schema 与契约，并支持 apply 前置检查。 |
| workflow_agent_run | 函数 | 1927–1959 | 构造 Agent run 调用参数，联动 apply 结果与生命周期选项。 |
| workflow_profile | 函数 | 1169–1202 | 解析并下发工作流 profile 绑定参数，含 provider profile 解析。 |
| workflow_resource_bindings | 函数 | 1826–1866 | 装配工作流运行所需的资源绑定，仅接受完整 portable refs 作为输入。 |
| workflow_selection_from | 函数 | 1716–1788 | 从 CLI 输入构造工作流选择集合，处理去重与来源优先级。 |
| workflow_submit_input | 函数 | 1887–1914 | 构造工作流 submit 请求体，包含选择、资源绑定与运行参数。 |
| write_download_output | 函数 | 2528–2590 | 把下载内容写入指定输出路径，处理目录创建、覆盖与失败清理。 |
