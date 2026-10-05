
# rust/zotero-bridge/src/contract.rs
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[rust/zotero-bridge/src](../../../../modules/rust/zotero-bridge/src.md)
<!-- node: file:rust/zotero-bridge/src/contract.rs -->

Host Bridge 契约的单一事实源：解析并校验 meta schema，构建 capability/command 注册表，解析组合式 command 的输入与结果 schema，并生成带 violations 的校验错误与安全引用值。
源码：[rust/zotero-bridge/src/contract.rs](../../../../../../rust/zotero-bridge/src/contract.rs)

## 符号（17）
<!-- node: function:rust/zotero-bridge/src/contract.rs:assert_capability_target -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:assert_endpoint_target -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:capability_entry -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:command_entry -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:compose_command_payload -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:compose_current_command_payload -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:parse_and_validate -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:prune_schema_definitions -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:resolved_command_inputs -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:resolved_command_payload_schema -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:resolved_command_result_schema -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:resolved_composition_input_schema -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:validate_capability_output -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:validate_command_input -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:validate_command_references -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:validation_error -->
<!-- node: function:rust/zotero-bridge/src/contract.rs:violations -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assert_capability_target | 函数 | 1253–1290 | 中等 | 契约校验、防漂移、断言 | 0 | 断言实际请求命中的 capability 与命令契约声明的目标一致，拦截路由漂移。 |
| assert_endpoint_target | 函数 | 1292–1325 | 中等 | 契约校验、endpoint、断言 | 0 | 断言 HTTP endpoint 与契约声明的路径模式匹配。 |
| capability_entry | 函数 | 271–282 | 简单 | 注册表、查找、契约 | 0 | 按 capability 名从注册表取出契约条目。 |
| command_entry | 函数 | 258–269 | 简单 | 注册表、查找、契约 | 0 | 按命令名从注册表取出契约条目。 |
| compose_command_payload | 函数 | 962–1091 | 复杂 | payload-组合、参数映射、契约 | 0 | 把命令参数组合成最终 capability payload，执行字段转换、常量内联与类型归一。 |
| compose_current_command_payload | 函数 | 1093–1114 | 中等 | payload-组合、上下文、契约 | 0 | 以进程内登记的当前命令为上下文组合 payload。 |
| parse_and_validate | 函数 | 24–46 | 中等 | 契约、schema-校验、解析 | 0 | 解析并用 meta schema 校验内嵌契约 JSON，任何结构偏差都会在此暴露。 |
| prune_schema_definitions | 函数 | 412–460 | 中等 | schema-裁剪、工具、契约 | 0 | 裁剪 schema 中未被引用的 $defs，减少对外 schema 体积。 |
| resolved_command_inputs | 函数 | 284–357 | 复杂 | 契约解析、schema-组合、输入 | 0 | 解析组合式 command 的输入结构，把组合常量内联为具体 schema。 |
| resolved_command_payload_schema | 函数 | 359–398 | 复杂 | 契约解析、payload、schema-组合 | 0 | 生成命令最终下发的 payload schema，已剥离被组合过程消费的字段。 |
| resolved_command_result_schema | 函数 | 625–683 | 复杂 | 契约解析、结果校验、schema | 0 | 生成命令结果的校验 schema，使返回体也受契约约束。 |
| resolved_composition_input_schema | 函数 | 541–623 | 复杂 | 契约解析、参数、schema-组合 | 0 | 为组合式输入的每个参数生成独立 schema，应用字段转换与默认值。 |
| validate_capability_output | 函数 | 1183–1206 | 中等 | 校验、结果校验、契约 | 0 | 校验 capability 返回体是否符合契约 schema，不符时报错而非静默通过。 |
| validate_command_input | 函数 | 1116–1146 | 中等 | 校验、前置检查、契约 | 0 | 在发送前校验命令输入是否符合解析后的 input schema。 |
| validate_command_references | 函数 | 48–218 | 复杂 | 契约校验、一致性检查、注册表 | 0 | 遍历注册表校验每条 command 引用的 capability、参数与结果 schema 是否存在且自洽。 |
| validation_error | 函数 | 753–786 | 中等 | 错误构造、校验、契约 | 0 | 构造带 violations 的校验错误，标注 phase、command 与 argument。 |
| violations | 函数 | 696–751 | 复杂 | 校验、错误收集、schema | 0 | 依据 schema 递归收集值校验违规点，形成可定位的 violations 列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [error.rs](error.rs.md) | rust/zotero-bridge/src/error.rs | 统一错误模型：按 config/validation/connection/protocol/auth/internal 分类构造 CliError，携带 retryable、state change、handle consumption 与 safe next actions 等控制语义，并映射为进程退出码与错误 payload。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [main.rs](main.rs.md) | rust/zotero-bridge/src/main.rs | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assert_capability_target | 函数 | 1253–1290 | 断言实际请求命中的 capability 与命令契约声明的目标一致，拦截路由漂移。 |
| assert_endpoint_target | 函数 | 1292–1325 | 断言 HTTP endpoint 与契约声明的路径模式匹配。 |
| capability_entry | 函数 | 271–282 | 按 capability 名从注册表取出契约条目。 |
| command_entry | 函数 | 258–269 | 按命令名从注册表取出契约条目。 |
| compose_command_payload | 函数 | 962–1091 | 把命令参数组合成最终 capability payload，执行字段转换、常量内联与类型归一。 |
| compose_current_command_payload | 函数 | 1093–1114 | 以进程内登记的当前命令为上下文组合 payload。 |
| parse_and_validate | 函数 | 24–46 | 解析并用 meta schema 校验内嵌契约 JSON，任何结构偏差都会在此暴露。 |
| prune_schema_definitions | 函数 | 412–460 | 裁剪 schema 中未被引用的 $defs，减少对外 schema 体积。 |
| resolved_command_inputs | 函数 | 284–357 | 解析组合式 command 的输入结构，把组合常量内联为具体 schema。 |
| resolved_command_payload_schema | 函数 | 359–398 | 生成命令最终下发的 payload schema，已剥离被组合过程消费的字段。 |
| resolved_command_result_schema | 函数 | 625–683 | 生成命令结果的校验 schema，使返回体也受契约约束。 |
| resolved_composition_input_schema | 函数 | 541–623 | 为组合式输入的每个参数生成独立 schema，应用字段转换与默认值。 |
| validate_capability_output | 函数 | 1183–1206 | 校验 capability 返回体是否符合契约 schema，不符时报错而非静默通过。 |
| validate_command_input | 函数 | 1116–1146 | 在发送前校验命令输入是否符合解析后的 input schema。 |
| validate_command_references | 函数 | 48–218 | 遍历注册表校验每条 command 引用的 capability、参数与结果 schema 是否存在且自洽。 |
| validation_error | 函数 | 753–786 | 构造带 violations 的校验错误，标注 phase、command 与 argument。 |
| violations | 函数 | 696–751 | 依据 schema 递归收集值校验违规点，形成可定位的 violations 列表。 |
