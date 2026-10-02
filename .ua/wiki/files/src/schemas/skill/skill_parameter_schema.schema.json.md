
# src/schemas/skill/skill_parameter_schema.schema.json
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/schemas/skill](../../../../modules/src/schemas/skill.md)
<!-- node: config:src/schemas/skill/skill_parameter_schema.schema.json -->

Skill 参数包（parameters 段）的最小 JSON Schema：仅要求 type 为 object，并允许 properties 下的每个参数项自由声明。
源码：[src/schemas/skill/skill_parameter_schema.schema.json](../../../../../../src/schemas/skill/skill_parameter_schema.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
