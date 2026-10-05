
# skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts/payload-schemas](../../../../../modules/skills_src/topic-synthesis/contracts/payload-schemas.md)
<!-- node: config:skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json -->

topic-synthesis 工作流 Stage 20「resolver 与工作集解析」阶段的输出 payload JSON Schema，三个必填字段 resolver、resolver_reasoning、operation_intent 记录检索式解析、解析理由与操作意图，是检索工作集的交接契约。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json:string_or_string_array -->

与 Stage 10 同款的单值/数组兼容约束，用于 resolver 检索式等字段。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-20-resolver-and-workset.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [stages.yaml](../stages.yaml.md) | skills_src/topic-synthesis/contracts/stages.yaml | skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。 |
