
# skills_src/topic-synthesis/contracts/stages.yaml
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts](../../../../modules/skills_src/topic-synthesis/contracts.md)
<!-- node: config:skills_src/topic-synthesis/contracts/stages.yaml -->

skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。
源码：[skills_src/topic-synthesis/contracts/stages.yaml](../../../../../../skills_src/topic-synthesis/contracts/stages.yaml)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [gate.py](../runtime/topic_synthesis_runtime/common/gate.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py | topic-synthesis 运行时通用 gate 命令行入口，读取阶段 payload、交给数据库模块校验后以 JSON 输出 gate 结果。 |
| [render_topic_synthesis_skills.ts](../renderer/render_topic_synthesis_skills.ts.md) | skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts | topic-synthesis Skill 包的渲染器，把合约与模板批量渲染成可物化的 Skill 目录（含 manifest、prompt 与 schema 资产）。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [db-schema.sql](db-schema.sql.md) | skills_src/topic-synthesis/contracts/db-schema.sql | topic-synthesis skill 的 SQLite 结构定义，声明 5 张表：运行时元数据、阶段状态、交接登记、论文工作集与论文分诊，为多阶段综合流程提供本地持久化。 |
