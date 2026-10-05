
# skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts/payload-schemas](../../../../../modules/skills_src/topic-synthesis/contracts/payload-schemas.md)
<!-- node: config:skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json -->

topic-synthesis 工作流 Stage 50「知识图谱富化」阶段的输出 payload JSON Schema，四个必填字段 concept_details、existing_topic_relation_proposals、prospective_topic_relation_proposals、topic_matching_terms 描述概念明细与对既有/潜在主题的关系提案，关系类型统一由 $defs.relation_type 收窄。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json:relation_type -->

主题关系类型枚举：更宽泛候选、更窄候选、相关候选、重叠候选、对照候选五种，用于知识图谱富化阶段的关系提案。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-50-kg-enrichment.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [stages.yaml](../stages.yaml.md) | skills_src/topic-synthesis/contracts/stages.yaml | skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。 |
