
# skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md
所属分层：[项目文档与规范](../../../../../layers/documentation.md)  
所属目录：[skills_src/zotero-library-agent/skills/zotero-research-synthesis](../../../../../modules/skills_src/zotero-library-agent/skills/zotero-research-synthesis.md)
<!-- node: document:skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md -->

研究综合 Skill 指令：围绕问题/topic/claim/图谱/缺口综合已验证来源，保留来源分歧、模型来源与新鲜度证据。
源码：[skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md](../../../../../../../skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [output.schema.json](../../shared/output.schema.json.md) | skills_src/zotero-library-agent/shared/output.schema.json | zotero-library-task.result.v1 业务结果 JSON Schema（draft-07），定义 status 三态、summary、evidence、artifacts 与 diagnostics 等字段。 |
| [SKILL.md](../zotero-library-curation/SKILL.md.md) | skills_src/zotero-library-agent/skills/zotero-library-curation/SKILL.md | 文献整理 Skill 指令：安全检视、提出、应用并 live-verify 对元数据、标签、分类、笔记、链接等库状态的变更。 |
| [SKILL.md](../zotero-literature-analysis/SKILL.md.md) | skills_src/zotero-library-agent/skills/zotero-literature-analysis/SKILL.md | 文献分析 Skill 指令：从已验证的 Zotero 来源产出有界摘要、抽取、对比或解读，带明确证据深度与定位符。 |
