
# skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/literature-deep-reading/renderer](../../../../modules/skills_src/literature-deep-reading/renderer.md)
<!-- node: file:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts -->

literature-deep-reading Skill 包的渲染器，依据 schema 资产生成 SKILL.md 与配套资源文件。
源码：[skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts](../../../../../../skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts)

## 符号（6）
<!-- node: function:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:copyDirectory -->
<!-- node: function:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:renderAssets -->
<!-- node: function:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:renderLiteratureDeepReadingSkill -->
<!-- node: function:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:renderRendererTemplates -->
<!-- node: function:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:renderSkillMd -->
<!-- node: function:skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts:validateSourceAssetsBeforeRender -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| copyDirectory | 函数 | 76–87 | 简单 | skill-template、file-copy、utility | 0 | 递归复制模板目录到目标 Skill 目录，保持附带资源文件结构不变。 |
| renderAssets | 函数 | 104–121 | 中等 | skill-template、renderer、asset | 0 | 输出 Skill 附带资产（渲染器模板、schema 引用、辅助脚本）到目标目录。 |
| renderLiteratureDeepReadingSkill | 函数 | 145–165 | 中等 | skill-template、entry-point、renderer | 0 | literature-deep-reading Skill 包渲染入口：校验源资产后依次产出 SKILL.md、renderer 模板与附带资产。 |
| renderRendererTemplates | 函数 | 130–143 | 简单 | skill-template、renderer、template | 0 | 渲染内嵌的 renderer 模板文件，保证 Skill 内部的渲染逻辑与合约一致。 |
| renderSkillMd | 函数 | 89–102 | 简单 | skill-template、prompt、renderer | 0 | 渲染 literature-deep-reading 的 SKILL.md 正文，注入运行时提示与参数占位。 |
| validateSourceAssetsBeforeRender | 函数 | 50–70 | 中等 | skill-template、validation、precondition | 0 | 渲染前校验源资产（模板、schema、runner manifest）是否齐备，避免产出不完整的 Skill 包。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillSchemaAssets.ts](../../../src/modules/acp/skillRun/acpSkillSchemaAssets.ts.md) | src/modules/acp/skillRun/acpSkillSchemaAssets.ts | 汇集 ACP Skill 运行所需的 JSON Schema 资产（skill 输入/输出/参数/manifest），在插件沙箱内通过 runtimePersistence 读取并提供给后端做校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| renderLiteratureDeepReadingSkill | 函数 | 145–165 | literature-deep-reading Skill 包渲染入口：校验源资产后依次产出 SKILL.md、renderer 模板与附带资产。 |
