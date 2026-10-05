
# packages/synthesis-contracts/src/topicApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/topicApplication.ts -->

主题应用契约：apply / list / detail 请求重建，以及主题 ID 清洗、资产 ID 与 UTF-8 字节数等边界校验。
源码：[packages/synthesis-contracts/src/topicApplication.ts](../../../../../../packages/synthesis-contracts/src/topicApplication.ts)

## 符号（6）
<!-- node: function:packages/synthesis-contracts/src/topicApplication.ts:assetId -->
<!-- node: function:packages/synthesis-contracts/src/topicApplication.ts:cleanTopicId -->
<!-- node: function:packages/synthesis-contracts/src/topicApplication.ts:exactFields -->
<!-- node: function:packages/synthesis-contracts/src/topicApplication.ts:rebuildSynthesisTopicApplicationApplyRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicApplication.ts:rebuildSynthesisTopicApplicationListRequest -->
<!-- node: function:packages/synthesis-contracts/src/topicApplication.ts:utf8Bytes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assetId | 函数 | 165–179 | 简单 | validation、topic、parsing | 0 | 校验资产 ID 格式与长度。 |
| cleanTopicId | 函数 | 146–163 | 简单 | validation、topic、normalization | 0 | 归一主题 ID，去除非法字符并校验长度。 |
| exactFields | 函数 | 131–144 | 简单 | validation、contract、guard | 0 | 校验对象字段集合与契约完全一致，多余或缺失字段均判为契约错误。 |
| rebuildSynthesisTopicApplicationApplyRequest | 函数 | 201–267 | 中等 | contract、rebuild、application-layer | 0 | 重建主题 apply 请求，校验主题定义、资产引用与写入模式。 |
| rebuildSynthesisTopicApplicationListRequest | 函数 | 269–298 | 简单 | contract、rebuild、application-layer | 0 | 重建主题列表请求，校验分页、排序与过滤条件。 |
| utf8Bytes | 函数 | 181–199 | 简单 | utility、encoding、validation | 0 | 按 UTF-8 编码计算字符串字节数，用于体积上限判断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [topicDomain.ts](topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [topicApplication.ts](../../synthesis-application/src/topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisTopicApplicationApplyRequest | 函数 | 201–267 | 重建主题 apply 请求，校验主题定义、资产引用与写入模式。 |
| rebuildSynthesisTopicApplicationListRequest | 函数 | 269–298 | 重建主题列表请求，校验分页、排序与过滤条件。 |
