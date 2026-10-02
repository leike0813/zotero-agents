
# skills_src/topic-synthesis/contracts/paths.yaml
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts](../../../../modules/skills_src/topic-synthesis/contracts.md)
<!-- node: config:skills_src/topic-synthesis/contracts/paths.yaml -->

合约路径锚点配置，声明 db_path、handoff_paths、result_paths 与 schema_paths 四类路径基准，约束各阶段读写位置。
源码：[skills_src/topic-synthesis/contracts/paths.yaml](../../../../../../skills_src/topic-synthesis/contracts/paths.yaml)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [db-schema.sql](db-schema.sql.md) | skills_src/topic-synthesis/contracts/db-schema.sql | topic-synthesis skill 的 SQLite 结构定义，声明 5 张表：运行时元数据、阶段状态、交接登记、论文工作集与论文分诊，为多阶段综合流程提供本地持久化。 |
| [gate.py](../runtime/topic_synthesis_runtime/common/gate.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py | topic-synthesis 运行时通用 gate 命令行入口，读取阶段 payload、交给数据库模块校验后以 JSON 输出 gate 结果。 |
