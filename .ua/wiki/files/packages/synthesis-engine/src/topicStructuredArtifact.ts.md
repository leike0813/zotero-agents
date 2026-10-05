
# packages/synthesis-engine/src/topicStructuredArtifact.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-engine/src](../../../../modules/packages/synthesis-engine/src.md)
<!-- node: file:packages/synthesis-engine/src/topicStructuredArtifact.ts -->

主题结构化产物引擎：校验 topic analysis manifest 与 synthesis report 深度、组装主题 artifact 并应用章节补丁，是主题产物装配的契约入口。
源码：[packages/synthesis-engine/src/topicStructuredArtifact.ts](../../../../../../packages/synthesis-engine/src/topicStructuredArtifact.ts)

## 符号（10）
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:applyTopicSectionPatch -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:assembleTopicArtifact -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:createInProcessSynthesisTopicStructuredArtifactEngine -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:rebuildSynthesisTopicArtifactAssemblyRequest -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:rebuildSynthesisTopicArtifactValidationRequest -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:rebuildSynthesisTopicManifestValidationRequest -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:rebuildSynthesisTopicSectionPatchRequest -->
<!-- node: class:packages/synthesis-engine/src/topicStructuredArtifact.ts:SynthesisTopicStructuredArtifactContractError -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:validateTopicAnalysisManifest -->
<!-- node: function:packages/synthesis-engine/src/topicStructuredArtifact.ts:validateTopicSynthesisArtifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyTopicSectionPatch | 函数 | 1186–1239 | 中等 | patch、topic-artifact、engine | 0 | 对已装配的主题 artifact 应用单个章节补丁并重建结果。 |
| assembleTopicArtifact | 函数 | 1173–1184 | 简单 | assembly、topic-artifact、engine | 0 | 按 manifest 与报告装配主题 artifact，处理 section 缺口与失败条目。 |
| createInProcessSynthesisTopicStructuredArtifactEngine | 函数 | 1683–1733 | 中等 | factory、engine、topic-artifact | 0 | 创建进程内主题结构化产物引擎，绑定校验、组装与章节补丁能力。 |
| rebuildSynthesisTopicArtifactAssemblyRequest | 函数 | 1269–1297 | 简单 | contract、validation、assembly | 0 | 校验并重建 artifact 组装请求，规范化分类路由与侧车条目。 |
| rebuildSynthesisTopicArtifactValidationRequest | 函数 | 1299–1319 | 简单 | contract、validation、topic-artifact | 0 | 校验并重建 artifact 校验请求，约束深度判定阈值。 |
| rebuildSynthesisTopicManifestValidationRequest | 函数 | 1249–1267 | 简单 | contract、validation、manifest | 0 | 校验并重建 manifest 校验请求，规范化语言、维度与 sidecar 列表。 |
| rebuildSynthesisTopicSectionPatchRequest | 函数 | 1321–1365 | 简单 | contract、validation、patch | 0 | 校验并重建章节补丁请求，限定目标 section 与替换内容形态。 |
| SynthesisTopicStructuredArtifactContractError | 类 | 160–167 | 简单 | error-type、contract、topic-artifact | 0 | 主题结构化产物契约错误类型，承载校验、组装与补丁三类失败。 |
| validateTopicAnalysisManifest | 函数 | 508–610 | 中等 | validation、manifest、topic-artifact | 0 | 校验主题分析 manifest 的结构、维度覆盖与 sidecar 条目一致性。 |
| validateTopicSynthesisArtifact | 函数 | 692–796 | 中等 | validation、topic-artifact、depth-check | 0 | 校验 synthesis report 的章节深度、审阅大纲与来源论文引用完整性。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topicCanonical.ts](../../synthesis-application/src/topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyTopicSectionPatch | 函数 | 1186–1239 | 对已装配的主题 artifact 应用单个章节补丁并重建结果。 |
| assembleTopicArtifact | 函数 | 1173–1184 | 按 manifest 与报告装配主题 artifact，处理 section 缺口与失败条目。 |
| createInProcessSynthesisTopicStructuredArtifactEngine | 函数 | 1683–1733 | 创建进程内主题结构化产物引擎，绑定校验、组装与章节补丁能力。 |
| rebuildSynthesisTopicArtifactAssemblyRequest | 函数 | 1269–1297 | 校验并重建 artifact 组装请求，规范化分类路由与侧车条目。 |
| rebuildSynthesisTopicArtifactValidationRequest | 函数 | 1299–1319 | 校验并重建 artifact 校验请求，约束深度判定阈值。 |
| rebuildSynthesisTopicManifestValidationRequest | 函数 | 1249–1267 | 校验并重建 manifest 校验请求，规范化语言、维度与 sidecar 列表。 |
| rebuildSynthesisTopicSectionPatchRequest | 函数 | 1321–1365 | 校验并重建章节补丁请求，限定目标 section 与替换内容形态。 |
| SynthesisTopicStructuredArtifactContractError | 类 | 160–167 | 主题结构化产物契约错误类型，承载校验、组装与补丁三类失败。 |
| validateTopicAnalysisManifest | 函数 | 508–610 | 校验主题分析 manifest 的结构、维度覆盖与 sidecar 条目一致性。 |
| validateTopicSynthesisArtifact | 函数 | 692–796 | 校验 synthesis report 的章节深度、审阅大纲与来源论文引用完整性。 |
