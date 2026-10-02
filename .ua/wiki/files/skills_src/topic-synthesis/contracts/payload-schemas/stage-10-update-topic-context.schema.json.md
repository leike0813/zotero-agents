
# skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts/payload-schemas](../../../../../modules/skills_src/topic-synthesis/contracts/payload-schemas.md)
<!-- node: config:skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json -->

topic-synthesis 工作流 Stage 10「更新决策与 resolver」阶段的输出 payload JSON Schema，以 update_decision 为唯一必填项，并允许附带 resolver 与 resolver_reasoning；$defs.string_or_string_array 统一了单值/数组两种写法。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json:string_or_string_array -->

anyOf 组合：允许 Agent 把单值字段写成字符串或字符串数组之一，兼容不同模型的输出习惯。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-10-update-topic-context.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [stages.yaml](../stages.yaml.md) | skills_src/topic-synthesis/contracts/stages.yaml | skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。 |
