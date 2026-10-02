
# skills_src/topic-synthesis/contracts/db-schema.sql
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts](../../../../modules/skills_src/topic-synthesis/contracts.md)
<!-- node: file:skills_src/topic-synthesis/contracts/db-schema.sql -->

topic-synthesis skill 的 SQLite 结构定义，声明 5 张表：运行时元数据、阶段状态、交接登记、论文工作集与论文分诊，为多阶段综合流程提供本地持久化。
源码：[skills_src/topic-synthesis/contracts/db-schema.sql](../../../../../../skills_src/topic-synthesis/contracts/db-schema.sql)
<!-- node: table:skills_src/topic-synthesis/contracts/db-schema.sql:handoff_registry -->

交接登记表，记录 handoff_key 到 manifest 路径、阶段与 skill 的映射关系，用于跨阶段交接物索引。
源码：[skills_src/topic-synthesis/contracts/db-schema.sql](../../../../../../skills_src/topic-synthesis/contracts/db-schema.sql)
<!-- node: table:skills_src/topic-synthesis/contracts/db-schema.sql:paper_triage -->

论文分诊表，保存每篇文献的分诊判定载荷 JSON 与更新时间，支撑纳入/排除决策的幂等重放。
源码：[skills_src/topic-synthesis/contracts/db-schema.sql](../../../../../../skills_src/topic-synthesis/contracts/db-schema.sql)
<!-- node: table:skills_src/topic-synthesis/contracts/db-schema.sql:paper_workset -->

论文工作集表，保存参与综合的文献条目（paper_ref、item_key、标题与元数据 JSON）。
源码：[skills_src/topic-synthesis/contracts/db-schema.sql](../../../../../../skills_src/topic-synthesis/contracts/db-schema.sql)
<!-- node: table:skills_src/topic-synthesis/contracts/db-schema.sql:runtime_metadata -->

运行时元数据表，以 key/value_json 形式存放 topic-synthesis 合约版本等全局元信息。
源码：[skills_src/topic-synthesis/contracts/db-schema.sql](../../../../../../skills_src/topic-synthesis/contracts/db-schema.sql)
<!-- node: table:skills_src/topic-synthesis/contracts/db-schema.sql:stage_state -->

阶段状态表，按 stage_id 与 skill_id 记录每个 skill 阶段的状态机值、结果 JSON 与更新时间，支撑断点续跑。
源码：[skills_src/topic-synthesis/contracts/db-schema.sql](../../../../../../skills_src/topic-synthesis/contracts/db-schema.sql)
