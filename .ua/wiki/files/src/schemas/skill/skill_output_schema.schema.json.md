
# src/schemas/skill/skill_output_schema.schema.json
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/schemas/skill](../../../../modules/src/schemas/skill.md)
<!-- node: config:src/schemas/skill/skill_output_schema.schema.json -->

Skill 输出的 JSON Schema：用 x-type 与 x-role 注解约束产物类型（artifact / artifact-manifest / file），并以条件分支强制 manifest 必带角色。
源码：[src/schemas/skill/skill_output_schema.schema.json](../../../../../../src/schemas/skill/skill_output_schema.schema.json)
<!-- node: schema:src/schemas/skill/skill_output_schema.schema.json:outputProperty -->

$defs.outputProperty：单个输出字段的注解约定，x-type 取 artifact / artifact-manifest / file，并以 if/then 分支要求产物类输出必须带 x-role。
源码：[src/schemas/skill/skill_output_schema.schema.json](../../../../../../src/schemas/skill/skill_output_schema.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |
