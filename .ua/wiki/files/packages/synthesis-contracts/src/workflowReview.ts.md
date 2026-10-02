
# packages/synthesis-contracts/src/workflowReview.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/workflowReview.ts -->

工作流审阅契约：审阅请求与结果重建，聚合 topic domain 与引用图谱数据。
源码：[packages/synthesis-contracts/src/workflowReview.ts](../../../../../../packages/synthesis-contracts/src/workflowReview.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/workflowReview.ts:rebuildSynthesisWorkflowReviewRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildSynthesisWorkflowReviewRequest | 函数 | 146–155 | 简单 | contract、rebuild、review-workflow | 0 | 重建工作流审阅请求，校验条目集合与审阅范围。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [graph.ts](graph.ts.md) | packages/synthesis-contracts/src/graph.ts | 引用图谱客户端合约：定义布局算法枚举、布局与指标刷新请求、命令结果状态集合，以及节点、边、窗口等 wire DTO。本文件为纯类型声明。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [topicDomain.ts](topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisWorkflowReviewRequest | 函数 | 146–155 | 重建工作流审阅请求，校验条目集合与审阅范围。 |
