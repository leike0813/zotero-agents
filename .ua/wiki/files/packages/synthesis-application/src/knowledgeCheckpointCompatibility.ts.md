
# packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts -->

知识检查点的兼容归一化工具：把非安全整数或负数的计数折叠为 0 并按键排序，再对记录集取 canonical 哈希生成稳定签名。
源码：[packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts](../../../../../../packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts)

## 符号（2）
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts:buildSynthesisKnowledgeSignature -->
<!-- node: function:packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts:normalizeSynthesisKnowledgeCounts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildSynthesisKnowledgeSignature | 函数 | 19–27 | 简单 | 签名、hash、知识检查点、纯函数 | 0 | 组合归一化计数与记录集 canonical 哈希，产出跨版本可比较的知识签名。 |
| normalizeSynthesisKnowledgeCounts | 函数 | 3–17 | 简单 | 归一化、兼容性、纯函数 | 0 | 把计数字典中的非法数值折叠为 0 并按键名排序，使不同来源的计数记录可以稳定比较。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalJson.ts](../../synthesis-engine/src/canonicalJson.ts.md) | packages/synthesis-engine/src/canonicalJson.ts | synthesis-engine 的 canonical JSON 门面：把 contracts 包的 canonicalize / hash / UTF-8 工具以 engine 命名空间重导出，保持包边界清晰。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildSynthesisKnowledgeSignature | 函数 | 19–27 | 组合归一化计数与记录集 canonical 哈希，产出跨版本可比较的知识签名。 |
| normalizeSynthesisKnowledgeCounts | 函数 | 3–17 | 把计数字典中的非法数值折叠为 0 并按键名排序，使不同来源的计数记录可以稳定比较。 |
