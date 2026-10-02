
# packages/synthesis-contracts/src/topicDomain.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/topicDomain.ts -->

主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。
源码：[packages/synthesis-contracts/src/topicDomain.ts](../../../../../../packages/synthesis-contracts/src/topicDomain.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicApplication.ts](../../synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |
| [topicApplication.ts](topicApplication.ts.md) | packages/synthesis-contracts/src/topicApplication.ts | 主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。 |
| [topics.ts](topics.ts.md) | packages/synthesis-contracts/src/topics.ts | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |
| [workflowReview.ts](workflowReview.ts.md) | packages/synthesis-contracts/src/workflowReview.ts | 工作流审阅契约：审阅请求与结果重建，聚合 topic domain 与引用图谱数据。 |
