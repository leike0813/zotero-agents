
# src/modules/acp/skillRun/acpSkillSchemaAssets.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/skillRun](../../../../../modules/src/modules/acp/skillRun.md)
<!-- node: file:src/modules/acp/skillRun/acpSkillSchemaAssets.ts -->

汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。
源码：[src/modules/acp/skillRun/acpSkillSchemaAssets.ts](../../../../../../../src/modules/acp/skillRun/acpSkillSchemaAssets.ts)

## 符号（5）
<!-- node: function:src/modules/acp/skillRun/acpSkillSchemaAssets.ts:compileSkillJsonSchema -->
<!-- node: function:src/modules/acp/skillRun/acpSkillSchemaAssets.ts:resolveAcpSkillSchemaAsset -->
<!-- node: function:src/modules/acp/skillRun/acpSkillSchemaAssets.ts:validateAcpSkillRunRequestAgainstSchemas -->
<!-- node: function:src/modules/acp/skillRun/acpSkillSchemaAssets.ts:validateRunnerManifestShape -->
<!-- node: function:src/modules/acp/skillRun/acpSkillSchemaAssets.ts:validateSkillSchemaAnnotations -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compileSkillJsonSchema | 函数 | 546–571 | 中等 | validation、schema、cache、acp | 1 | 把原始 JSON Schema 编译为可执行的校验函数，并缓存编译结果避免每次 run 重复编译。 |
| resolveAcpSkillSchemaAsset | 函数 | 109–175 | 中等 | acp、skill-run、asset-resolution、path-resolution | 0 | 把内置 Skill 的 JSON Schema 资产名解析为 runtimePersistence 可读取的绝对路径，解析失败时返回结构化诊断而非抛异常。 |
| validateAcpSkillRunRequestAgainstSchemas | 函数 | 284–416 | 复杂 | validation、acp、schema、contract | 0 | 用编译后的 input/parameter/output schema 校验一次 ACP Skill run 请求，是发起运行前的最后一道契约闸门。 |
| validateRunnerManifestShape | 函数 | 418–506 | 中等 | validation、manifest、acp、type-guard | 1 | 校验 skill runner manifest 的必填字段与类型形状，用于识别不兼容或被裁剪过的 manifest。 |
| validateSkillSchemaAnnotations | 函数 | 508–544 | 中等 | validation、schema、acp、diagnostics | 0 | 检查 Skill schema 内的注解字段（标题、描述、示例）是否符合约定，缺注解时给出可执行的补全建议。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [contracts.ts](../../../providers/contracts.ts.md) | src/providers/contracts.ts | Provider 请求与执行结果的跨后端契约定义：声明 SkillRunner、ACP、Generic HTTP 与 PassThrough 各自的请求 DTO 与统一执行结果形状。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skill_input_schema.schema.json](../../../schemas/skill/skill_input_schema.schema.json.md) | src/schemas/skill/skill_input_schema.schema.json | Skill 输入的 JSON Schema：校验 Skill 声明的输入对象结构，并用 x-input-source 注解区分 file 与 inline 两种入参来源。 |
| [skill_output_schema.schema.json](../../../schemas/skill/skill_output_schema.schema.json.md) | src/schemas/skill/skill_output_schema.schema.json | Skill 输出的 JSON Schema：用 x-type 与 x-role 注解约束产物类型（artifact / artifact-manifest / file），并以条件分支强制 manifest 必带角色。 |
| [skill_parameter_schema.schema.json](../../../schemas/skill/skill_parameter_schema.schema.json.md) | src/schemas/skill/skill_parameter_schema.schema.json | Skill 参数包（parameters 段）的最小 JSON Schema：仅要求 type 为 object，并允许 properties 下的每个参数项自由声明。 |
| [skill_runner_manifest.schema.json](../../../schemas/skill/skill_runner_manifest.schema.json.md) | src/schemas/skill/skill_runner_manifest.schema.json | Skill Runner manifest 的 JSON Schema：约束 Skill 包的 id、执行模式、引擎白名单、入口与 MCP 依赖，是 ACP Skill 装配与运行请求校验的结构事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillOutputValidator.ts](acpSkillOutputValidator.ts.md) | src/modules/acp/skillRun/acpSkillOutputValidator.ts | Skill 输出校验器：按 schema 资产与产物 manifest 校验 skill run 输出结构，输出结构化错误而非松散字符串。 |
| [acpSkillRunnerOrchestrator.ts](acpSkillRunnerOrchestrator.ts.md) | src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts | Skill run 编排器：ACP Skills 执行的核心状态机，串联会话建立、依赖准备、物化、权限队列、产物校验与恢复流程。 |
| [pluginSkillRegistry.ts](../../workflow/catalog/pluginSkillRegistry.ts.md) | src/modules/workflow/catalog/pluginSkillRegistry.ts | 插件侧 Skill 注册表：汇总 workflow、Host Bridge bundle 与 ACP schema 资产中的 skill 定义，用 sha256 内容摘要去重与判活，并向 Skill-Runner/Host Bridge 投影可分发清单。 |
| [render_literature_deep_reading_skill.ts](../../../../skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts.md) | skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts | literature-deep-reading Skill 包的渲染器，依据 schema 资产生成 SKILL.md 与配套资源文件。 |
| [render_topic_synthesis_skills.ts](../../../../skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts.md) | skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts | topic-synthesis Skill 包的渲染器，把合约与模板批量渲染成可物化的 Skill 目录（含 manifest、prompt 与 schema 资产）。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| compileSkillJsonSchema | 函数 | 546–571 | 把原始 JSON Schema 编译为可执行的校验函数，并缓存编译结果避免每次 run 重复编译。 |
| resolveAcpSkillSchemaAsset | 函数 | 109–175 | 把内置 Skill 的 JSON Schema 资产名解析为 runtimePersistence 可读取的绝对路径，解析失败时返回结构化诊断而非抛异常。 |
| validateAcpSkillRunRequestAgainstSchemas | 函数 | 284–416 | 用编译后的 input/parameter/output schema 校验一次 ACP Skill run 请求，是发起运行前的最后一道契约闸门。 |
| validateRunnerManifestShape | 函数 | 418–506 | 校验 skill runner manifest 的必填字段与类型形状，用于识别不兼容或被裁剪过的 manifest。 |
| validateSkillSchemaAnnotations | 函数 | 508–544 | 检查 Skill schema 内的注解字段（标题、描述、示例）是否符合约定，缺注解时给出可执行的补全建议。 |
