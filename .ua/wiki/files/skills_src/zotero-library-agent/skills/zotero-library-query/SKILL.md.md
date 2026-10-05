
# skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md
所属分层：[项目文档与规范](../../../../../layers/documentation.md)  
所属目录：[skills_src/zotero-library-agent/skills/zotero-library-query](../../../../../modules/skills_src/zotero-library-agent/skills/zotero-library-query.md)
<!-- node: document:skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md -->

库查询 Skill 指令：针对有界问题做只读实时检索，区分 live 事实与解释，产出有来源支撑的答案。
源码：[skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md](../../../../../../../skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [output.schema.json](../../shared/output.schema.json.md) | skills_src/zotero-library-agent/shared/output.schema.json | zotero-library-task.result.v1 业务结果 JSON Schema（draft-07），定义 status 三态、summary、evidence、artifacts 与 diagnostics 等字段。 |
