
# packages/synthesis-contracts/src/conceptKbApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/conceptKbApplication.ts -->

概念知识库应用层合约（1155 行，全批最大合约文件）：逐字段重建概念、义项、别名、关系、proposal、审阅项与主题链接，并定义 replace/ingest/review/delete/query 等请求与 mutation 结果。
源码：[packages/synthesis-contracts/src/conceptKbApplication.ts](../../../../../../packages/synthesis-contracts/src/conceptKbApplication.ts)

## 符号（13）
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:alias -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:concept -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:proposal -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:rebuildSynthesisConceptKbApplicationMutationResult -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:rebuildSynthesisConceptKbApplicationQueryRequest -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:rebuildSynthesisConceptKbApplicationReplaceRequest -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:rebuildSynthesisConceptKbApplicationSnapshot -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:rebuildSynthesisConceptKbApplicationState -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:relation -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:reviewItem -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:sense -->
<!-- node: class:packages/synthesis-contracts/src/conceptKbApplication.ts:SynthesisConceptKbApplicationContractError -->
<!-- node: function:packages/synthesis-contracts/src/conceptKbApplication.ts:topicLink -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| alias | 函数 | 432–467 | 中等 | 合约、别名、校验、有界 | 0 | 重建别名实体：校验别名原文、归一化形式与可选的 senseId 引用，限制单概念别名数量。 |
| [concept](../../../../symbols/packages/synthesis-contracts/src/conceptKbApplication.ts/concept.md) | 函数 | 290–355 | 复杂 | 合约、实体、概念知识库、校验 | 1 | 重建概念实体：校验 conceptId、标签、conceptType、domain 与状态枚举，截断过长定义文本。 |
| proposal | 函数 | 527–629 | 复杂 | 合约、proposal、校验、有界 | 0 | 重建概念卡片 proposal：校验标签、定义、义项与别名数组的规模上限，并归一化置信度与来源字段。 |
| rebuildSynthesisConceptKbApplicationMutationResult | 函数 | 1084–1152 | 复杂 | 合约、变更结果、概念知识库、诊断 | 0 | 重建概念知识库变更结果：统一 status、快照哈希、索引状态与结构化诊断，供 wire 层直接编码。 |
| rebuildSynthesisConceptKbApplicationQueryRequest | 函数 | 1030–1042 | 简单 | 合约、查询、请求校验 | 0 | 重建概念查询请求：归一化查询标签、返回条数上限与索引期望哈希。 |
| rebuildSynthesisConceptKbApplicationReplaceRequest | 函数 | 886–898 | 简单 | 合约、替换、basis-校验 | 0 | 重建整体替换请求：绑定期望快照哈希与新快照，阻断陈旧基础上的覆盖写入。 |
| rebuildSynthesisConceptKbApplicationSnapshot | 函数 | 742–884 | 复杂 | 合约、快照、概念知识库、一致性校验、核心 | 0 | 重建概念知识库快照：逐类重建全部实体行并校验跨类引用（义项归属概念、别名指向有效义项、关系端点存在）。 |
| rebuildSynthesisConceptKbApplicationState | 函数 | 1044–1082 | 中等 | 合约、状态、概念知识库、计数 | 0 | 重建概念知识库应用状态：汇总索引版本、快照哈希与各类实体计数，作为上层加载完成判据。 |
| relation | 函数 | 469–525 | 中等 | 合约、关系、校验、概念知识库 | 0 | 重建概念关系：校验源/目标概念 ID、关系类型与证据描述，拒绝自环关系。 |
| reviewItem | 函数 | 631–694 | 中等 | 合约、审阅、状态、校验 | 0 | 重建审阅项：校验待审实体引用、审阅原因与当前决定状态，保证审阅队列状态可比较。 |
| [sense](../../../../symbols/packages/synthesis-contracts/src/conceptKbApplication.ts/sense.md) | 函数 | 357–430 | 复杂 | 合约、义项、校验、概念知识库 | 1 | 重建义项实体：校验 senseId、所属 conceptId、标签与置信度，确保义项可被别名与 proposal 引用。 |
| SynthesisConceptKbApplicationContractError | 类 | 189–196 | 简单 | 错误类型、合约、概念知识库 | 0 | 概念知识库应用合约错误类型，携带字段定位与原因，用于概念/义项/别名等实体的重建失败。 |
| topicLink | 函数 | 696–735 | 中等 | 合约、主题链接、校验 | 0 | 重建主题与概念的链接记录：校验 topicId、conceptId 与关联强度，拒绝重复链接键。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbCore.ts](conceptKbCore.ts.md) | packages/synthesis-contracts/src/conceptKbCore.ts | 概念知识库索引核心类型：定义概念状态、置信度枚举，以及索引概念、义项、别名、查询请求与结果的共享结构，被 application 合约与 engine 共用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [conceptKbApplication.ts](../../synthesis-application/src/conceptKbApplication.ts.md) | packages/synthesis-application/src/conceptKbApplication.ts | 概念知识库（Concept KB）应用层：管理概念、义项、别名、关系与审阅项的快照读写，接收 topic synthesis 产出的概念卡片 proposal 并用 token 重叠做合并。 |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [knowledgeCheckpoint.ts](knowledgeCheckpoint.ts.md) | packages/synthesis-contracts/src/knowledgeCheckpoint.ts | 知识检查点合约：定义三类知识 basis（标签修订、概念清单、主题图）、载荷结构与计数族，并重建检查点对象与 apply 请求。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisConceptKbApplicationMutationResult | 函数 | 1084–1152 | 重建概念知识库变更结果：统一 status、快照哈希、索引状态与结构化诊断，供 wire 层直接编码。 |
| rebuildSynthesisConceptKbApplicationQueryRequest | 函数 | 1030–1042 | 重建概念查询请求：归一化查询标签、返回条数上限与索引期望哈希。 |
| rebuildSynthesisConceptKbApplicationReplaceRequest | 函数 | 886–898 | 重建整体替换请求：绑定期望快照哈希与新快照，阻断陈旧基础上的覆盖写入。 |
| rebuildSynthesisConceptKbApplicationSnapshot | 函数 | 742–884 | 重建概念知识库快照：逐类重建全部实体行并校验跨类引用（义项归属概念、别名指向有效义项、关系端点存在）。 |
| rebuildSynthesisConceptKbApplicationState | 函数 | 1044–1082 | 重建概念知识库应用状态：汇总索引版本、快照哈希与各类实体计数，作为上层加载完成判据。 |
| SynthesisConceptKbApplicationContractError | 类 | 189–196 | 概念知识库应用合约错误类型，携带字段定位与原因，用于概念/义项/别名等实体的重建失败。 |
