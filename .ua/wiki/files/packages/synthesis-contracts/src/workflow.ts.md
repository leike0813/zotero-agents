
# packages/synthesis-contracts/src/workflow.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/workflow.ts -->

工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。
源码：[packages/synthesis-contracts/src/workflow.ts](../../../../../../packages/synthesis-contracts/src/workflow.ts)

## 符号（12）
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:boundedTopicPlanString -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisArtifactCapabilityResult -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisLiteratureDigestApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisLiteratureDigestApplyResult -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisTopicApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisTopicApplyResult -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisTopicPlanApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisTopicPlanApplyResult -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildSynthesisTopicReportResult -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildTopicPlanAction -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:rebuildTopicPlanRelation -->
<!-- node: function:packages/synthesis-contracts/src/workflow.ts:topicPlanStringArray -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedTopicPlanString | 函数 | 160–169 | 简单 | validation、contract、topic | 0 | 读取有长度上限的主题计划字符串字段。 |
| rebuildSynthesisArtifactCapabilityResult | 函数 | 655–666 | 简单 | contract、rebuild、capability | 0 | 重建 artifact 能力结果，声明支持的主题、摘要与报告动作。 |
| rebuildSynthesisLiteratureDigestApplyRequest | 函数 | 497–506 | 简单 | contract、rebuild、workflow、literature-analysis | 0 | 重建文献摘要 apply 请求，校验 artifact 引用与写入模式。 |
| rebuildSynthesisLiteratureDigestApplyResult | 函数 | 508–517 | 简单 | contract、rebuild、workflow | 0 | 重建文献摘要 apply 结果，记录落地条目与失败原因。 |
| rebuildSynthesisTopicApplyRequest | 函数 | 519–528 | 简单 | contract、rebuild、workflow、topic | 0 | 重建主题 apply 请求，校验主题定义与 artifact 集合。 |
| rebuildSynthesisTopicApplyResult | 函数 | 530–539 | 简单 | contract、rebuild、workflow | 0 | 重建主题 apply 结果，记录写入结果与 basis 哈希。 |
| rebuildSynthesisTopicPlanApplyRequest | 函数 | 304–365 | 中等 | contract、rebuild、workflow | 0 | 重建主题计划 apply 请求，校验动作集合、关系与幂等键。 |
| rebuildSynthesisTopicPlanApplyResult | 函数 | 367–472 | 中等 | contract、rebuild、workflow | 0 | 重建主题计划 apply 结果，逐条返回执行结果与冲突信息。 |
| rebuildSynthesisTopicReportResult | 函数 | 569–578 | 简单 | contract、rebuild、workflow、report | 0 | 重建主题报告结果，聚合统计、抽样与告警。 |
| rebuildTopicPlanAction | 函数 | 192–253 | 中等 | contract、rebuild、workflow、topic | 0 | 重建主题计划动作，区分创建、更新与删除意图。 |
| rebuildTopicPlanRelation | 函数 | 255–302 | 简单 | contract、rebuild、workflow、topic-graph | 0 | 重建主题计划中的关系条目，含关系类型与置信度。 |
| topicPlanStringArray | 函数 | 171–182 | 简单 | validation、contract、topic | 0 | 收敛主题计划中的字符串数组，限制条目数量与单项长度。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts | canonical JSON 与 SHA-256 的合约层实现：规范化 JSON 键序、拒绝孤立代理项、计算 UTF-8 字节长度与内容哈希，为所有 basis 身份提供唯一算法。 |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [literatureArtifacts.ts](literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts | 定义 literature score 摘要产物的 payload type、Zotero note kind 与 JSON Schema 引用，并提供该 artifact 的校验与解析函数。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [sourceReferenceArtifact.ts](sourceReferenceArtifact.ts.md) | packages/synthesis-contracts/src/sourceReferenceArtifact.ts | Source reference 与 citation analysis 两类 canonical artifact 的 SSOT：定义 JSON Schema 引用、ID 生成、逐字段校验、引用反查校验与 snippet 压缩，是文献引用图谱产物可信度的根。 |
| [topicApplication.ts](topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [topicDomain.ts](topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [topics.ts](topics.ts.md) | packages/synthesis-contracts/src/topics.ts | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisArtifactCapabilityResult | 函数 | 655–666 | 重建 artifact 能力结果，声明支持的主题、摘要与报告动作。 |
| rebuildSynthesisLiteratureDigestApplyRequest | 函数 | 497–506 | 重建文献摘要 apply 请求，校验 artifact 引用与写入模式。 |
| rebuildSynthesisLiteratureDigestApplyResult | 函数 | 508–517 | 重建文献摘要 apply 结果，记录落地条目与失败原因。 |
| rebuildSynthesisTopicApplyRequest | 函数 | 519–528 | 重建主题 apply 请求，校验主题定义与 artifact 集合。 |
| rebuildSynthesisTopicApplyResult | 函数 | 530–539 | 重建主题 apply 结果，记录写入结果与 basis 哈希。 |
| rebuildSynthesisTopicPlanApplyRequest | 函数 | 304–365 | 重建主题计划 apply 请求，校验动作集合、关系与幂等键。 |
| rebuildSynthesisTopicPlanApplyResult | 函数 | 367–472 | 重建主题计划 apply 结果，逐条返回执行结果与冲突信息。 |
| rebuildSynthesisTopicReportResult | 函数 | 569–578 | 重建主题报告结果，聚合统计、抽样与告警。 |
