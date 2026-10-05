
# skills_src/topic-synthesis/contracts/handoff.schema.json
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts](../../../../modules/skills_src/topic-synthesis/contracts.md)
<!-- node: config:skills_src/topic-synthesis/contracts/handoff.schema.json -->

交接物 handoff manifest 的 JSON Schema 定义，约束 handoff_key、产出路径等必填字段并禁止额外属性。
源码：[skills_src/topic-synthesis/contracts/handoff.schema.json](../../../../../../skills_src/topic-synthesis/contracts/handoff.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [db-schema.sql](db-schema.sql.md) | skills_src/topic-synthesis/contracts/db-schema.sql | topic-synthesis skill 的 SQLite 结构定义，声明 5 张表：运行时元数据、阶段状态、交接登记、论文工作集与论文分诊，为多阶段综合流程提供本地持久化。 |
| [topic_synthesis_db.py](../runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py | topic-synthesis 运行时核心数据库与编排模块，负责运行态元数据、阶段记录、JSON Schema 校验、resolver 瀑布与最终报告物化。 |
