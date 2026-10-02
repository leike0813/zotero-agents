
# skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/renderer](../../../../modules/skills_src/topic-synthesis/renderer.md)
<!-- node: file:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts -->

topic-synthesis Skill 包的渲染器，把合约与模板批量渲染成可物化的 Skill 目录（含 manifest、prompt 与 schema 资产）。
源码：[skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts](../../../../../../skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts)

## 符号（17）
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:canceledOutputSchema -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:finalOutputSchema -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:handoffOutputSchema -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:inputSchemaForSkill -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:llmRuntimeBoundary -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:operationSchemaForSkill -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:parameterSchemaForSkill -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderContextAcquisition -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderOutputContractBody -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderSkillMd -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderSkillPackage -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderStage -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderStageSequence -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:renderTopicSynthesisSkills -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:runnerJson -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:skillQualityGoals -->
<!-- node: function:skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts:validateSkillPackageBeforeRender -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canceledOutputSchema | 函数 | 660–676 | 简单 | skill-template、schema、contract | 0 | 渲染取消态输出 schema，定义用户中止时 Agent 应返回的结构。 |
| finalOutputSchema | 函数 | 678–760 | 复杂 | skill-template、schema、contract | 0 | 渲染最终输出 schema，定义 synthesis 终态产物的完整字段结构。 |
| handoffOutputSchema | 函数 | 618–658 | 中等 | skill-template、schema、contract | 0 | 渲染阶段交接（handoff）输出 schema，约束中间态产物的结构以便跨阶段续跑。 |
| inputSchemaForSkill | 函数 | 551–573 | 中等 | skill-template、schema、contract | 0 | 为 Skill 渲染输入 JSON Schema，声明所需的库内选择、文献集合与参数结构。 |
| llmRuntimeBoundary | 函数 | 148–211 | 中等 | skill-template、prompt、security | 0 | 渲染 LLM 运行时边界章节，明确 Agent 可调用的工具范围与不得越界的行为约束。 |
| operationSchemaForSkill | 函数 | 274–284 | 简单 | skill-template、schema、contract | 0 | 为指定 Skill 选取对应的 operation JSON Schema 定义，输出 schema 资产文件。 |
| parameterSchemaForSkill | 函数 | 575–616 | 中等 | skill-template、schema、contract | 0 | 为 Skill 渲染参数 JSON Schema，逐字段给出类型、必填性与取值说明。 |
| renderContextAcquisition | 函数 | 238–272 | 中等 | skill-template、documentation、workflow | 0 | 渲染上下文获取章节，说明如何按阶段从工作区与文献库读取必要素材。 |
| renderOutputContractBody | 函数 | 286–304 | 简单 | skill-template、contract、documentation | 0 | 渲染输出契约章节，说明最终产物结构、字段语义与失败形态。 |
| renderSkillMd | 函数 | 418–484 | 复杂 | skill-template、renderer、prompt | 0 | 渲染 topic-synthesis 各 Skill 的 SKILL.md 主文档，组装 frontmatter、质量目标与阶段章节。 |
| renderSkillPackage | 函数 | 809–877 | 复杂 | skill-template、renderer、entry-point | 0 | 渲染单个 Skill 包的完整文件树：主文档、各类 schema、runner manifest 与附带资产。 |
| renderStage | 函数 | 313–416 | 复杂 | skill-template、workflow、renderer | 0 | 渲染单个 stage 的完整章节，包含目标、输入、动作、输出与终止条件。 |
| renderStageSequence | 函数 | 213–236 | 简单 | skill-template、workflow、documentation | 0 | 渲染多阶段执行顺序说明，把各 stage 的输入输出契约串成可读的流程描述。 |
| renderTopicSynthesisSkills | 函数 | 879–891 | 中等 | skill-template、entry-point、renderer | 0 | topic-synthesis Skill 渲染总入口：遍历全部 Skill 定义并逐个渲染成物化目录。 |
| runnerJson | 函数 | 524–549 | 中等 | skill-template、manifest、serialization | 0 | 序列化渲染 Skill 的 runner manifest（命令、入口、环境变量），作为运行期契约来源。 |
| skillQualityGoals | 函数 | 116–146 | 中等 | skill-template、prompt、documentation | 0 | 生成 Skill 文档中的质量目标章节，把分层综述与引用核验的验收标准写入 SKILL.md。 |
| validateSkillPackageBeforeRender | 函数 | 787–807 | 中等 | skill-template、validation、precondition | 0 | 在渲染 Skill 包前校验必需文件（SKILL.md、schema、manifest）齐备且可解析。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../../src/modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| renderTopicSynthesisSkills | 函数 | 879–891 | topic-synthesis Skill 渲染总入口：遍历全部 Skill 定义并逐个渲染成物化目录。 |
