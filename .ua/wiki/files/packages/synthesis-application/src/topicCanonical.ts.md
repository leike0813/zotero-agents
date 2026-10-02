
# packages/synthesis-application/src/topicCanonical.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/topicCanonical.ts -->

主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。
源码：[packages/synthesis-application/src/topicCanonical.ts](../../../../../../packages/synthesis-application/src/topicCanonical.ts)

## 符号（13）
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:computeSynthesisTopicCurrentHashes -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:projectSynthesisTopicCanonicalInspectResult -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:rebuildBoundedSnapshotJson -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:rebuildMarkdown -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:rebuildSectionDescriptor -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:rebuildSynthesisTopicCanonicalInspectResult -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:rebuildSynthesisTopicCanonicalSnapshot -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:strictRecord -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:strictTopicId -->
<!-- node: class:packages/synthesis-application/src/topicCanonical.ts:SynthesisTopicCanonicalContractError -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:validateDeclaredHashes -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:validateMetadataEnvelope -->
<!-- node: function:packages/synthesis-application/src/topicCanonical.ts:validateSectionIdentity -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeSynthesisTopicCurrentHashes | 函数 | 253–288 | 中等 | 哈希计算、canonical-json、主题、核心 | 1 | 对主题的 metadata、artifact 与各章节内容分别计算 canonical 哈希，组成当前事实的哈希集合。 |
| projectSynthesisTopicCanonicalInspectResult | 函数 | 579–604 | 中等 | 投影、诊断、有界、主题 | 0 | 把 inspect 结果投影为面向调试界面的有界诊断视图，裁剪过长字段并保持稳定顺序。 |
| rebuildBoundedSnapshotJson | 函数 | 316–345 | 中等 | 有界、快照、序列化、主题 | 0 | 生成有界大小的快照 JSON 文本，超出节点数或字节上限时截断并附加截断标记。 |
| rebuildMarkdown | 函数 | 290–314 | 中等 | 规范化、markdown、主题 | 0 | 把主题的 Markdown 章节内容按 canonical 规则重建为稳定文本，消除行尾与空白的漂移。 |
| rebuildSectionDescriptor | 函数 | 470–494 | 中等 | 章节、描述符、重建、主题 | 0 | 由章节内容与哈希重建章节描述符，包含文件名、大小、更新时间与内容哈希。 |
| rebuildSynthesisTopicCanonicalInspectResult | 函数 | 496–577 | 复杂 | inspect、哈希漂移、诊断、主题、核心 | 0 | 重建 canonical store 的 inspect 结果：逐章节比对声明哈希与实际内容，输出漂移、缺失与多余章节的诊断列表。 |
| rebuildSynthesisTopicCanonicalSnapshot | 函数 | 416–457 | 复杂 | 快照重建、哈希计算、主题、核心 | 0 | 从磁盘读取的 metadata 与章节内容重建主题 canonical 快照，同时计算当前哈希用于后续 compare-and-set。 |
| strictRecord | 函数 | 180–195 | 简单 | 校验、JSON、守卫、主题 | 0 | 把任意输入收敛为严格 JSON 记录，命中非对象或含非 JSON 值时立即抛出合约错误。 |
| strictTopicId | 函数 | 197–211 | 简单 | 校验、路径安全、主题 | 0 | 校验主题 ID 的字符集与长度上限，并拒绝路径分隔符等可能越出目录的输入。 |
| SynthesisTopicCanonicalContractError | 类 | 161–168 | 简单 | 错误类型、合约、主题、诊断 | 0 | 主题 canonical 合约错误类型，携带字段定位与原因码，用于身份、哈希和 metadata envelope 校验失败。 |
| validateDeclaredHashes | 函数 | 393–414 | 中等 | 哈希校验、合约、主题 | 1 | 校验 metadata 中声明的哈希集合与实际内容一致，缺失或多余条目均以合约错误失败。 |
| validateMetadataEnvelope | 函数 | 347–369 | 中等 | 校验、metadata、合约、主题 | 1 | 校验主题 metadata envelope 的字段精确性、schema 版本与路径 ID 形状，拒绝未知字段。 |
| validateSectionIdentity | 函数 | 371–391 | 中等 | 校验、章节身份、主题 | 0 | 校验章节描述符中的章节 ID、所属主题与文件名一致，阻断跨主题错位写入。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |
| [sidecarCanonicalStore.ts](../../synthesis-contracts/src/sidecarCanonicalStore.ts.md) | packages/synthesis-contracts/src/sidecarCanonicalStore.ts | 主题 canonical store 快照的 schema 版本与快照重建函数，是 sidecar 与仓库之间的一致性锚点。 |
| [topicStructuredArtifact.ts](../../synthesis-engine/src/topicStructuredArtifact.ts.md) | packages/synthesis-engine/src/topicStructuredArtifact.ts | 主题结构化产物引擎：校验 topic analysis manifest 与 synthesis report 深度、组装主题 artifact 并应用章节补丁，是主题产物装配的契约入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMaintenanceApplication.ts](debugMaintenanceApplication.ts.md) | packages/synthesis-application/src/debugMaintenanceApplication.ts | sidecar 调试与维护能力的应用层：聚合 repository 捕获、profiler 结果与 topic canonical store，产出隔离快照、缓存/操作列表及 checkpoint、durable、reset 维护入口。 |
| [durableBundleApplication.ts](durableBundleApplication.ts.md) | packages/synthesis-application/src/durableBundleApplication.ts | durable bundle（可持久化主题包）应用层：以 repository topic basis 校验既有草稿，驱动合约 codec 完成导出、导入事实分类与 apply，阻断 basis 漂移导致的覆盖。 |
| [foundation.ts](../../../src/modules/synthesis/foundation.ts.md) | src/modules/synthesis/foundation.ts | Synthesis 层基础设施：统一 canonical JSON 序列化与哈希、topic 路径 id 生成，以及知识图谱与 topic 存储目录布局。 |
| [topicApplication.ts](topicApplication.ts.md) | packages/synthesis-application/src/topicApplication.ts | 主题（topic）应用层：读取主题状态与 bundle 依赖快照，校验候选 bundle 资产完整性，产出主题列表/详情的就绪度与投影视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| computeSynthesisTopicCurrentHashes | 函数 | 253–288 | 对主题的 metadata、artifact 与各章节内容分别计算 canonical 哈希，组成当前事实的哈希集合。 |
| projectSynthesisTopicCanonicalInspectResult | 函数 | 579–604 | 把 inspect 结果投影为面向调试界面的有界诊断视图，裁剪过长字段并保持稳定顺序。 |
| rebuildSynthesisTopicCanonicalInspectResult | 函数 | 496–577 | 重建 canonical store 的 inspect 结果：逐章节比对声明哈希与实际内容，输出漂移、缺失与多余章节的诊断列表。 |
| rebuildSynthesisTopicCanonicalSnapshot | 函数 | 416–457 | 从磁盘读取的 metadata 与章节内容重建主题 canonical 快照，同时计算当前哈希用于后续 compare-and-set。 |
| SynthesisTopicCanonicalContractError | 类 | 161–168 | 主题 canonical 合约错误类型，携带字段定位与原因码，用于身份、哈希和 metadata envelope 校验失败。 |
