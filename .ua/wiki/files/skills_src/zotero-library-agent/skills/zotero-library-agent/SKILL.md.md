
# skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md
所属分层：[项目文档与规范](../../../../../layers/documentation.md)  
所属目录：[skills_src/zotero-library-agent/skills/zotero-library-agent](../../../../../modules/skills_src/zotero-library-agent/skills/zotero-library-agent.md)
<!-- node: document:skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md -->

库级总控 Skill 指令：把有界的 Zotero 研究请求路由到最小可用的专项 Skill，或协调多个 Skill 序列并保持 identity、evidence 与 authority 边界。
源码：[skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md](../../../../../../../skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [output.schema.json](../../shared/output.schema.json.md) | skills_src/zotero-library-agent/shared/output.schema.json | zotero-library-task.result.v1 业务结果 JSON Schema（draft-07），定义 status 三态、summary、evidence、artifacts 与 diagnostics 等字段。 |
