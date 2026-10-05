
# src/schemas/skill/skill_runner_manifest.schema.json
所属分层：[工作流引擎与执行](../../../../layers/workflow-engine.md)  
所属目录：[src/schemas/skill](../../../../modules/src/schemas/skill.md)
<!-- node: config:src/schemas/skill/skill_runner_manifest.schema.json -->

Skill Runner manifest 的 JSON Schema：约束 Skill 包的 id、执行模式、引擎白名单、入口与 MCP 依赖，是 ACP Skill 装配与运行请求校验的结构事实源。
源码：[src/schemas/skill/skill_runner_manifest.schema.json](../../../../../../src/schemas/skill/skill_runner_manifest.schema.json)
<!-- node: schema:src/schemas/skill/skill_runner_manifest.schema.json:engine -->

$defs.engine：Skill 可用执行引擎的枚举（codex / claude / gemini / opencode / qwen），同时约束 engines 与 unsupported_engines 两个属性。
源码：[src/schemas/skill/skill_runner_manifest.schema.json](../../../../../../src/schemas/skill/skill_runner_manifest.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skill_input_schema.schema.json](skill_input_schema.schema.json.md) | src/schemas/skill/skill_input_schema.schema.json | Skill 输入的 JSON Schema：校验 Skill 声明的输入对象结构，并用 x-input-source 注解区分 file 与 inline 两种入参来源。 |
| [skill_output_schema.schema.json](skill_output_schema.schema.json.md) | src/schemas/skill/skill_output_schema.schema.json | Skill 输出的 JSON Schema：用 x-type 与 x-role 注解约束产物类型（artifact / artifact-manifest / file），并以条件分支强制 manifest 必带角色。 |
| [skill_parameter_schema.schema.json](skill_parameter_schema.schema.json.md) | src/schemas/skill/skill_parameter_schema.schema.json | Skill 参数包（parameters 段）的最小 JSON Schema：仅要求 type 为 object，并允许 properties 下的每个参数项自由声明。 |
