
# src/modules/synthesis/citationGraph.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/citationGraph.ts -->

Citation Graph 投影层：把文献与引用输入归一为稳定 reference key，去重合并 canonical paper 后调用 synthesis-engine 计算统一引用图谱。
源码：[src/modules/synthesis/citationGraph.ts](../../../../../../src/modules/synthesis/citationGraph.ts)

## 符号（5）
<!-- node: function:src/modules/synthesis/citationGraph.ts:buildUnifiedCitationGraph -->
<!-- node: function:src/modules/synthesis/citationGraph.ts:compareCanonicalPaper -->
<!-- node: function:src/modules/synthesis/citationGraph.ts:groupCanonicalPapers -->
<!-- node: function:src/modules/synthesis/citationGraph.ts:provisionalReferenceKey -->
<!-- node: function:src/modules/synthesis/citationGraph.ts:referenceIdentityKeys -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildUnifiedCitationGraph | 函数 | 410–621 | 复杂 | citation-graph、synthesis-engine、图构建、核心 | 0 | 构建统一引用图谱：合并文献节点与引用节点、生成边并调用 synthesis-engine 完成布局与指标计算。 |
| compareCanonicalPaper | 函数 | 348–371 | 简单 | 去重、canonical、比较 | 1 | 按 canonical 判等规则比较两篇论文是否指向同一文献。 |
| groupCanonicalPapers | 函数 | 373–399 | 中等 | 去重、canonical、引用图谱 | 1 | 按 canonical 判等规则对论文分组，选出代表节点并合并其余同义条目。 |
| provisionalReferenceKey | 函数 | 249–286 | 中等 | 引用图谱、标识、归一化 | 1 | 为引用输入生成临时稳定 key，按 DOI、arXiv、ISBN、citekey 到标题逐级降级。 |
| referenceIdentityKeys | 函数 | 288–328 | 中等 | 引用图谱、去重、标识 | 0 | 收集引用输入的全部候选身份键，用于跨记录合并同一文献。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphBuild.ts](../../../packages/synthesis-engine/src/citationGraphBuild.ts.md) | packages/synthesis-engine/src/citationGraphBuild.ts | 引用图谱构建引擎：scope、库节点、参考文献、图节点、已解析边、聚合边、归属与轻量指标的 DTO 重建，以及边聚合与全量计算。 |
| [foundation.ts](foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [index.ts](../../../packages/synthesis-engine/src/index.ts.md) | packages/synthesis-engine/src/index.ts | Synthesis 引用图谱计算引擎：对引用图执行布局与指标（PageRank、连通分量）计算，并重建对应的 request/result contract。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [libraryAdapter.ts](libraryAdapter.ts.md) | src/modules/synthesis/libraryAdapter.ts | Synthesis 侧 Zotero 读端适配器：把 Broker 与分页查询得到的库条目投影为契约要求的 host read port，产出文献摘要、引用图输入与产物描述符。 |
| [reviewInput.ts](reviewInput.ts.md) | src/modules/synthesis/reviewInput.ts | 构建概念审阅工作流输入：归一已解析论文与注册表行，裁剪出审阅所需的引用图谱切片并汇总缺失产物诊断。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [foundation.ts](foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildUnifiedCitationGraph | 函数 | 410–621 | 构建统一引用图谱：合并文献节点与引用节点、生成边并调用 synthesis-engine 完成布局与指标计算。 |
| provisionalReferenceKey | 函数 | 249–286 | 为引用输入生成临时稳定 key，按 DOI、arXiv、ISBN、citekey 到标题逐级降级。 |
