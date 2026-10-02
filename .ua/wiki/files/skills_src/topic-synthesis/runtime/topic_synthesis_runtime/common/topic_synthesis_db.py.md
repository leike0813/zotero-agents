
# skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py
所属分层：[内置工作流包与 Skill 资产](../../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common](../../../../../../modules/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common.md)
<!-- node: file:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py -->

topic-synthesis 运行时核心数据库与编排模块，负责运行态元数据、阶段记录、JSON Schema 校验、resolver 瀑布与最终报告物化。
源码：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py](../../../../../../../../skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py)

## 符号（18）
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:build_current_instruction -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:build_prepare_context_views -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:collect_resolver_cascade -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:connect -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:dispatch_payload_stage -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:instruction_for_stage -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:materialize_final_output -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:normalize_taxonomy -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:record_stage -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:register_prepare_triage -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:report_body -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:run_create_preflight -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:run_update_preflight -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:store_workset -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:validate_core_synthesis_apply_fields -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:validate_schema_node -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:validate_stage_payload -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:write_complete_sections -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| build_current_instruction | 函数 | 675–697 | 简单 | runtime、topic-synthesis、validation | 1 | 依据当前阶段与状态生成下一步代理指令文本。 |
| build_prepare_context_views | 函数 | 2550–2776 | 复杂 | runtime、topic-synthesis、validation | 0 | 构建 prepare 阶段所需的上下文视图（triple map、指标、摘要与参考行）。 |
| [collect_resolver_cascade](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/collect_resolver_cascade.md) | 函数 | 1659–1888 | 复杂 | runtime、topic-synthesis、validation | 2 | resolver 瀑布的主流程，按级联顺序解析文献引用并登记审计记录。 |
| connect | 函数 | 365–403 | 中等 | runtime、topic-synthesis、validation | 0 | 打开运行态 SQLite 连接并设置统一的行工厂与外键约束。 |
| dispatch_payload_stage | 函数 | 3008–3128 | 复杂 | runtime、topic-synthesis、validation | 0 | 阶段 payload 分发入口，路由到对应阶段的持久化与视图写出逻辑。 |
| instruction_for_stage | 函数 | 609–664 | 中等 | runtime、topic-synthesis、validation | 0 | 按阶段标识取出对应的代理指令模板。 |
| materialize_final_output | 函数 | 4124–4196 | 复杂 | runtime、topic-synthesis、validation | 0 | 把最终报告物化为 run 目录下的成品文件与 sidecar 清单。 |
| normalize_taxonomy | 函数 | 3467–3561 | 复杂 | runtime、topic-synthesis、validation | 0 | 规范化 taxonomy 轴与节点结构，校验层级与标签唯一性。 |
| record_stage | 函数 | 540–559 | 简单 | runtime、topic-synthesis、validation | 0 | 记录阶段执行结果（开始/完成/失败）到运行状态表。 |
| register_prepare_triage | 函数 | 1993–2051 | 中等 | runtime、topic-synthesis、validation | 1 | 登记 prepare 阶段的 triage 结果并落库为可复用的选择依据。 |
| [report_body](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/report_body.md) | 函数 | 3854–4000 | 复杂 | runtime、topic-synthesis、validation | 1 | 把结构化报告数据渲染为 Markdown 正文，含小节、列表与引用标记。 |
| run_create_preflight | 函数 | 1521–1566 | 中等 | runtime、topic-synthesis、validation | 0 | 新建主题前的预检流程，解析输入、生成 workset 与候选文献集合。 |
| run_update_preflight | 函数 | 1371–1518 | 复杂 | runtime、topic-synthesis、validation | 0 | 更新主题前的预检流程，比对既有定义并解析受影响文献范围。 |
| store_workset | 函数 | 1350–1368 | 简单 | runtime、topic-synthesis、validation | 1 | 把预检得到的 workset 写入运行态存储，供后续阶段复用。 |
| validate_core_synthesis_apply_fields | 函数 | 1030–1089 | 中等 | runtime、topic-synthesis、validation | 0 | 校验 core 阶段 apply payload 的必填字段与引用完整性。 |
| [validate_schema_node](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/validate_schema_node.md) | 函数 | 752–823 | 复杂 | runtime、topic-synthesis、validation | 1 | 内联实现的 JSON Schema 校验器，递归检查类型、必填项与引用。 |
| validate_stage_payload | 函数 | 833–850 | 简单 | runtime、topic-synthesis、validation | 1 | 按阶段选择对应 schema 并校验提交的 payload，失败时返回结构化错误。 |
| [write_complete_sections](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/write_complete_sections.md) | 函数 | 4017–4113 | 复杂 | runtime、topic-synthesis、validation | 1 | 写出最终报告的各章节内容，含主题、taxonomy、claims 与时间线。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [gate.py](gate.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py | topic-synthesis 运行时通用 gate 命令行入口，读取阶段 payload、交给数据库模块校验后以 JSON 输出 gate 结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| build_current_instruction | 函数 | 675–697 | 依据当前阶段与状态生成下一步代理指令文本。 |
| build_prepare_context_views | 函数 | 2550–2776 | 构建 prepare 阶段所需的上下文视图（triple map、指标、摘要与参考行）。 |
| [collect_resolver_cascade](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/collect_resolver_cascade.md) | 函数 | 1659–1888 | resolver 瀑布的主流程，按级联顺序解析文献引用并登记审计记录。 |
| connect | 函数 | 365–403 | 打开运行态 SQLite 连接并设置统一的行工厂与外键约束。 |
| dispatch_payload_stage | 函数 | 3008–3128 | 阶段 payload 分发入口，路由到对应阶段的持久化与视图写出逻辑。 |
| instruction_for_stage | 函数 | 609–664 | 按阶段标识取出对应的代理指令模板。 |
| materialize_final_output | 函数 | 4124–4196 | 把最终报告物化为 run 目录下的成品文件与 sidecar 清单。 |
| normalize_taxonomy | 函数 | 3467–3561 | 规范化 taxonomy 轴与节点结构，校验层级与标签唯一性。 |
| record_stage | 函数 | 540–559 | 记录阶段执行结果（开始/完成/失败）到运行状态表。 |
| register_prepare_triage | 函数 | 1993–2051 | 登记 prepare 阶段的 triage 结果并落库为可复用的选择依据。 |
| [report_body](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/report_body.md) | 函数 | 3854–4000 | 把结构化报告数据渲染为 Markdown 正文，含小节、列表与引用标记。 |
| run_create_preflight | 函数 | 1521–1566 | 新建主题前的预检流程，解析输入、生成 workset 与候选文献集合。 |
| run_update_preflight | 函数 | 1371–1518 | 更新主题前的预检流程，比对既有定义并解析受影响文献范围。 |
| store_workset | 函数 | 1350–1368 | 把预检得到的 workset 写入运行态存储，供后续阶段复用。 |
| validate_core_synthesis_apply_fields | 函数 | 1030–1089 | 校验 core 阶段 apply payload 的必填字段与引用完整性。 |
| [validate_schema_node](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/validate_schema_node.md) | 函数 | 752–823 | 内联实现的 JSON Schema 校验器，递归检查类型、必填项与引用。 |
| validate_stage_payload | 函数 | 833–850 | 按阶段选择对应 schema 并校验提交的 payload，失败时返回结构化错误。 |
| [write_complete_sections](../../../../../../symbols/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py/write_complete_sections.md) | 函数 | 4017–4113 | 写出最终报告的各章节内容，含主题、taxonomy、claims 与时间线。 |
