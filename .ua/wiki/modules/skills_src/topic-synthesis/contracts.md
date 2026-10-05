
# skills_src/topic-synthesis/contracts
> 目录聚合页：6 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [skills_src/topic-synthesis/contracts/db-schema.sql](../../../files/skills_src/topic-synthesis/contracts/db-schema.sql.md) | 文件 | 0 | topic-synthesis skill 的 SQLite 结构定义，声明 5 张表：运行时元数据、阶段状态、交接登记、论文工作集与论文分诊，为多阶段综合流程提供本地持久化。 |
| [skills_src/topic-synthesis/contracts/handoff.schema.json](../../../files/skills_src/topic-synthesis/contracts/handoff.schema.json.md) | 配置 | 0 | 交接物 handoff manifest 的 JSON Schema 定义，约束 handoff_key、产出路径等必填字段并禁止额外属性。 |
| [skills_src/topic-synthesis/contracts/paths.yaml](../../../files/skills_src/topic-synthesis/contracts/paths.yaml.md) | 配置 | 0 | 合约路径锚点配置，声明 db_path、handoff_paths、result_paths 与 schema_paths 四类路径基准，约束各阶段读写位置。 |
| [skills_src/topic-synthesis/contracts/stage-guidance.yaml](../../../files/skills_src/topic-synthesis/contracts/stage-guidance.yaml.md) | 配置 | 0 | 各阶段执行指引主文件，为 topic-synthesis 的每个阶段给出 prompt 级操作说明、输入输出要求与失败处理，是 skill 行为语义的单一来源。 |
| [skills_src/topic-synthesis/contracts/stages.yaml](../../../files/skills_src/topic-synthesis/contracts/stages.yaml.md) | 配置 | 0 | skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。 |
| [skills_src/topic-synthesis/contracts/stdout-envelope.schema.json](../../../files/skills_src/topic-synthesis/contracts/stdout-envelope.schema.json.md) | 配置 | 0 | Skill Runner 标准输出信封的 JSON Schema，用 oneOf 区分成功与失败两种信封形态，约束阶段进程与 runner 之间的输出协议。 |

## 子目录
- [payload-schemas](contracts/payload-schemas.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common](runtime/topic_synthesis_runtime/common.md) | 4 |
| [skills_src/topic-synthesis/renderer](renderer.md) | 3 |
