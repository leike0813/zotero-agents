
# src/modules/synthesis/reviewInput.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/reviewInput.ts -->

构建概念审阅工作流输入：归一已解析论文与注册表行，裁剪出审阅所需的引用图谱切片并汇总缺失产物诊断。
源码：[src/modules/synthesis/reviewInput.ts](../../../../../../src/modules/synthesis/reviewInput.ts)

## 符号（4）
<!-- node: function:src/modules/synthesis/reviewInput.ts:buildReviewWorkflowInput -->
<!-- node: function:src/modules/synthesis/reviewInput.ts:buildStructuredTopicInput -->
<!-- node: function:src/modules/synthesis/reviewInput.ts:normalizeResolvedPapers -->
<!-- node: function:src/modules/synthesis/reviewInput.ts:projectCitationGraphSliceForReview -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildReviewWorkflowInput | 函数 | 317–377 | 复杂 | 输入构建、审阅工作流、工作流 | 0 | 组装概念审阅工作流的完整输入：结构化话题、已解析论文、注册表覆盖行与图谱切片。 |
| buildStructuredTopicInput | 函数 | 127–185 | 中等 | 输入构建、校验、审阅工作流 | 1 | 把任意结构化输入清洗为审阅工作流可接受的话题输入结构。 |
| normalizeResolvedPapers | 函数 | 210–237 | 中等 | 归一化、审阅工作流、快照 | 1 | 归一快照中的已解析论文列表，输出 paper_ref 与匹配理由。 |
| projectCitationGraphSliceForReview | 函数 | 257–296 | 中等 | citation-graph、切片、投影 | 1 | 从完整引用图谱中裁剪出与已解析论文相关的节点与边切片，避免把全图传给审阅工作流。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraph.ts](citationGraph.ts.md) | src/modules/synthesis/citationGraph.ts | Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。 |
| [foundation.ts](foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [registry.ts](registry.ts.md) | src/modules/synthesis/registry.ts | 文献 sidecar 注册表：归一文献元数据指纹、发现 managed note 中的产物覆盖情况，并生成 sidecar 索引行与分面统计。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildReviewWorkflowInput | 函数 | 317–377 | 组装概念审阅工作流的完整输入：结构化话题、已解析论文、注册表覆盖行与图谱切片。 |
| projectCitationGraphSliceForReview | 函数 | 257–296 | 从完整引用图谱中裁剪出与已解析论文相关的节点与边切片，避免把全图传给审阅工作流。 |
