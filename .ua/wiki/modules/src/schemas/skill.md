
# src/schemas/skill
> 目录聚合页：4 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/schemas/skill/skill_input_schema.schema.json](../../../files/src/schemas/skill/skill_input_schema.schema.json.md) | 配置 | 0 | Skill 输入的 JSON Schema：校验 Skill 声明的输入对象结构，并用 x-input-source 注解区分 file 与 inline 两种入参来源。 |
| [src/schemas/skill/skill_output_schema.schema.json](../../../files/src/schemas/skill/skill_output_schema.schema.json.md) | 配置 | 0 | Skill 输出的 JSON Schema：用 x-type 与 x-role 注解约束产物类型（artifact / artifact-manifest / file），并以条件分支强制 manifest 必带角色。 |
| [src/schemas/skill/skill_parameter_schema.schema.json](../../../files/src/schemas/skill/skill_parameter_schema.schema.json.md) | 配置 | 0 | Skill 参数包（parameters 段）的最小 JSON Schema：仅要求 type 为 object，并允许 properties 下的每个参数项自由声明。 |
| [src/schemas/skill/skill_runner_manifest.schema.json](../../../files/src/schemas/skill/skill_runner_manifest.schema.json.md) | 配置 | 0 | Skill Runner manifest 的 JSON Schema：约束 Skill 包的 id、执行模式、引擎白名单、入口与 MCP 依赖，是 ACP Skill 装配与运行请求校验的结构事实源。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/modules/acp/skillRun](../modules/acp/skillRun.md) | 4 |
