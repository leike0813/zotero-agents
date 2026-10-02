
# rust/zotero-bridge/src/surface.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/surface.rs -->

Agent-facing surface 生成器：把命令树编译为 invocation schema、argv 绑定与 agent 目标描述，产出带 checksum 的稳定描述符，并支撑 describe / search 子命令。
源码：[rust/zotero-bridge/src/surface.rs](../../../../../../rust/zotero-bridge/src/surface.rs)

## 符号（12）
<!-- node: function:rust/zotero-bridge/src/surface.rs:agent_argument -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:agent_target -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:argv_bindings -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:command_inventory -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:describe -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:descriptor -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:descriptor_command -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:invocation_schema -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:raw_argument -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:search -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:stable_serialize -->
<!-- node: function:rust/zotero-bridge/src/surface.rs:validate_contract_binding -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| agent_argument | 函数 | 128–215 | 复杂 | agent-surface、参数映射、自描述 | 0 | 把 clap 参数转换为 agent 视角的参数描述，补齐类型、枚举与必填语义。 |
| agent_target | 函数 | 394–422 | 中等 | agent-surface、标识、映射 | 0 | 为 surface 目标（capability 与 command）生成 Agent 可引用的稳定标识。 |
| argv_bindings | 函数 | 341–392 | 中等 | agent-surface、argv、绑定 | 0 | 生成 argv 位置与命名参数的绑定表，标注每个参数的序号。 |
| command_inventory | 函数 | 102–122 | 简单 | agent-surface、命令树、遍历 | 0 | 遍历 clap 命令树生成完整命令清单，作为 surface 描述符的输入。 |
| describe | 函数 | 776–795 | 简单 | cli、自省、agent-surface | 0 | surface describe 子命令：输出指定命令的详细描述。 |
| descriptor | 函数 | 651–737 | 复杂 | agent-surface、描述符、事实源 | 0 | 生成完整 surface 描述符：命令清单、契约绑定校验与全局 checksum。 |
| descriptor_command | 函数 | 518–611 | 复杂 | agent-surface、描述符、组装 | 0 | 组装单个命令的描述符条目：参数、目标、示例与子命令索引。 |
| invocation_schema | 函数 | 217–339 | 复杂 | agent-surface、schema-生成、自描述 | 0 | 为整棵命令树生成 JSON schema 形式的 invocation 描述，供 Agent 消费。 |
| raw_argument | 函数 | 17–58 | 中等 | agent-surface、clap、元数据 | 0 | 从 clap 命令定义中提取参数的原始元数据（名称、是否必需、取值来源）。 |
| search | 函数 | 797–873 | 中等 | cli、检索、agent-surface | 0 | surface search 子命令：按关键字在命令面与契约目标中检索匹配命令。 |
| stable_serialize | 函数 | 613–641 | 中等 | 序列化、确定性、工具 | 0 | 按键排序的稳定 JSON 序列化，保证描述符字节级可复现。 |
| validate_contract_binding | 函数 | 444–516 | 复杂 | 契约校验、防漂移、agent-surface | 0 | 校验 surface 描述符与 Host Bridge 契约一致，防止命令面与契约漂移。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| agent_argument | 函数 | 128–215 | 把 clap 参数转换为 agent 视角的参数描述，补齐类型、枚举与必填语义。 |
| agent_target | 函数 | 394–422 | 为 surface 目标（capability 与 command）生成 Agent 可引用的稳定标识。 |
| argv_bindings | 函数 | 341–392 | 生成 argv 位置与命名参数的绑定表，标注每个参数的序号。 |
| command_inventory | 函数 | 102–122 | 遍历 clap 命令树生成完整命令清单，作为 surface 描述符的输入。 |
| describe | 函数 | 776–795 | surface describe 子命令：输出指定命令的详细描述。 |
| descriptor | 函数 | 651–737 | 生成完整 surface 描述符：命令清单、契约绑定校验与全局 checksum。 |
| descriptor_command | 函数 | 518–611 | 组装单个命令的描述符条目：参数、目标、示例与子命令索引。 |
| invocation_schema | 函数 | 217–339 | 为整棵命令树生成 JSON schema 形式的 invocation 描述，供 Agent 消费。 |
| raw_argument | 函数 | 17–58 | 从 clap 命令定义中提取参数的原始元数据（名称、是否必需、取值来源）。 |
| search | 函数 | 797–873 | surface search 子命令：按关键字在命令面与契约目标中检索匹配命令。 |
| stable_serialize | 函数 | 613–641 | 按键排序的稳定 JSON 序列化，保证描述符字节级可复现。 |
| validate_contract_binding | 函数 | 444–516 | 校验 surface 描述符与 Host Bridge 契约一致，防止命令面与契约漂移。 |
