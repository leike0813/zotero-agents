
# skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/contracts/payload-schemas](../../../../../modules/skills_src/topic-synthesis/contracts/payload-schemas.md)
<!-- node: config:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json -->

topic-synthesis 工作流 Stage 40「核心综合」阶段的输出 payload JSON Schema，本合约集中最庞大的一份：$defs 抽出 14 个复用子结构（taxonomy_axis、timeline_event、claim、improvement_dimension、review_outline 等），顶层九个必填字段覆盖分类体系、时间线、论断、改进维度、概念标签、争议与未来方向。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:claim -->

论断条目，是 Stage 40 最重要的复用实体：正文、分析、适用范围、局限、置信度与出处文献齐备。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:future_direction -->

未来方向条目，含方向类型、当前局限、未来走向与论证理由，是综述展望章节的结构来源。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:improvement_dimension -->

改进维度条目，记录某研究维度的分析文字与支撑文献。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:non_empty_string -->

基础标量约束：非空字符串（minLength 至少 1），被 Stage 40 大量复用以保证 Agent 不会提交空白占位。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:non_empty_string_array -->

非空字符串数组约束，minItems 与 items.minLength 双重保证数组内无空项。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:review_outline -->

综述大纲顶层对象，聚合 topic_importance（主题重要性）、writing_strategies 列表与 recommended_strategy_id 推荐策略指针。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:source_paper_refs -->

来源论文引用数组约束，为 taxonomy/claim/timeline 等各类论断统一挂接文献出处。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:source_ref_object -->

来源引用对象，将文献 id、标题与对该来源的当前判断绑定在一起。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:taxonomy_axis -->

分类轴对象，绑定 axis_type 与 axis_rationale（选此轴的理由），并通过 nodes 承载该轴下的 taxonomy_route 列表。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:taxonomy_axis_type -->

分类轴类型枚举，收窄为 problem_formulation、technical_mechanism、evidence_scope、research_route、application_context 五种综述切分视角。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:taxonomy_route -->

分类体系中的技术路线节点，含 id、标题、核心问题、机制、优势、局限、成熟度与代表文献，是综述分类树的叶节点。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:text_summary -->

三段式文本摘要对象，由 text（原文）、analysis（分析）、overview（概述）组成，是 Stage 40 各实体共享的表达骨架。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:timeline_event -->

时间线事件条目，含年份、历史角色、所处阶段与出处文献，支撑综述的演进脉络叙述。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)
<!-- node: schema:skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json:writing_strategy -->

写作策略条目，含综述论点、写作策略、分节大纲、适用场景与风险，供用户选择综述组织方式。
源码：[skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json](../../../../../../../skills_src/topic-synthesis/contracts/payload-schemas/stage-40-core-synthesis.schema.json)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [stages.yaml](../stages.yaml.md) | skills_src/topic-synthesis/contracts/stages.yaml | skill 目录与阶段依赖的声明式清单，定义每个 skill 的标识、依赖阶段与执行顺序，供工作流编排与阶段状态机使用。 |
