
# src/schemas/skill/skill_input_schema.schema.json
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/schemas/skill](../../../../modules/src/schemas/skill.md)
<!-- node: config:src/schemas/skill/skill_input_schema.schema.json -->

Skill 输入的 JSON Schema：校验 Skill 声明的输入对象结构，并用 x-input-source 注解区分 file 与 inline 两种入参来源。
源码：[src/schemas/skill/skill_input_schema.schema.json](../../../../../../src/schemas/skill/skill_input_schema.schema.json)
<!-- node: schema:src/schemas/skill/skill_input_schema.schema.json:inputProperty -->

$defs.inputProperty：单个输入参数的注解约定，声明 x-input-source（file / inline）与可选 extensions 扩展名过滤。
源码：[src/schemas/skill/skill_input_schema.schema.json](../../../../../../src/schemas/skill/skill_input_schema.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
