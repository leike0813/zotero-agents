
# packages/synthesis-contracts/src/topics.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/topics.ts -->

主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。
源码：[packages/synthesis-contracts/src/topics.ts](../../../../../../packages/synthesis-contracts/src/topics.ts)

## 符号（12）
<!-- node: function:packages/synthesis-contracts/src/topics.ts:exactObject -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicContextRequest -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicContextResult -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicFindRequest -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicFindResult -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicListRequest -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicListResult -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicResolverRequest -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisTopicResolverResult -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisWorkflowTopicOptionsRequest -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:rebuildSynthesisWorkflowTopicOptionsResult -->
<!-- node: function:packages/synthesis-contracts/src/topics.ts:strings -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| exactObject | 函数 | 346–361 | 简单 | validation、contract、guard | 0 | 读取并校验普通对象的字段集合。 |
| rebuildSynthesisTopicContextRequest | 函数 | 413–431 | 简单 | contract、rebuild、topic | 0 | 重建主题上下文请求，校验主题 ID 与邻域深度。 |
| rebuildSynthesisTopicContextResult | 函数 | 276–285 | 简单 | contract、rebuild、topic | 0 | 重建主题上下文结果，聚合关联文献、集合与图谱邻域。 |
| rebuildSynthesisTopicFindRequest | 函数 | 398–411 | 简单 | contract、rebuild、topic | 0 | 重建主题查找请求，校验查询串与匹配模式。 |
| rebuildSynthesisTopicFindResult | 函数 | 265–274 | 简单 | contract、rebuild、topic | 0 | 重建主题查找结果，区分命中、未命中与歧义。 |
| rebuildSynthesisTopicListRequest | 函数 | 378–396 | 简单 | contract、rebuild、topic | 0 | 重建主题列表请求，校验分页与过滤条件。 |
| rebuildSynthesisTopicListResult | 函数 | 254–263 | 简单 | contract、rebuild、topic | 0 | 重建主题列表结果，收敛条目与分页元数据。 |
| rebuildSynthesisTopicResolverRequest | 函数 | 433–488 | 中等 | contract、rebuild、resolver、topic | 0 | 重建主题 resolver 请求，校验 and/or/not 条件与合并模式。 |
| rebuildSynthesisTopicResolverResult | 函数 | 287–296 | 简单 | contract、rebuild、topic、resolver | 0 | 重建主题解析结果，输出匹配的文献引用与判定依据。 |
| rebuildSynthesisWorkflowTopicOptionsRequest | 函数 | 490–504 | 简单 | contract、rebuild、workflow | 0 | 重建工作流可选主题请求，校验筛选与数量上限。 |
| rebuildSynthesisWorkflowTopicOptionsResult | 函数 | 298–307 | 简单 | contract、rebuild、topic、workflow | 0 | 重建工作流可选主题列表结果。 |
| strings | 函数 | 363–376 | 简单 | validation、contract、parsing | 0 | 把输入收敛为字符串数组，逐项校验类型与长度。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [topicDomain.ts](topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisTopicContextRequest | 函数 | 413–431 | 重建主题上下文请求，校验主题 ID 与邻域深度。 |
| rebuildSynthesisTopicContextResult | 函数 | 276–285 | 重建主题上下文结果，聚合关联文献、集合与图谱邻域。 |
| rebuildSynthesisTopicFindRequest | 函数 | 398–411 | 重建主题查找请求，校验查询串与匹配模式。 |
| rebuildSynthesisTopicFindResult | 函数 | 265–274 | 重建主题查找结果，区分命中、未命中与歧义。 |
| rebuildSynthesisTopicListRequest | 函数 | 378–396 | 重建主题列表请求，校验分页与过滤条件。 |
| rebuildSynthesisTopicListResult | 函数 | 254–263 | 重建主题列表结果，收敛条目与分页元数据。 |
| rebuildSynthesisTopicResolverRequest | 函数 | 433–488 | 重建主题 resolver 请求，校验 and/or/not 条件与合并模式。 |
| rebuildSynthesisTopicResolverResult | 函数 | 287–296 | 重建主题解析结果，输出匹配的文献引用与判定依据。 |
| rebuildSynthesisWorkflowTopicOptionsRequest | 函数 | 490–504 | 重建工作流可选主题请求，校验筛选与数量上限。 |
| rebuildSynthesisWorkflowTopicOptionsResult | 函数 | 298–307 | 重建工作流可选主题列表结果。 |
