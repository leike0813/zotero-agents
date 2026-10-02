
# packages/synthesis-contracts/src/sidecarCanonicalStore.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/sidecarCanonicalStore.ts -->

主题 canonical store 快照的 schema 版本与快照重建函数，是 sidecar 与仓库之间的一致性锚点。
源码：[packages/synthesis-contracts/src/sidecarCanonicalStore.ts](../../../../../../packages/synthesis-contracts/src/sidecarCanonicalStore.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/sidecarCanonicalStore.ts:rebuildSynthesisTopicCanonicalStoreSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildSynthesisTopicCanonicalStoreSnapshot | 函数 | 12–39 | 简单 | contract、rebuild、canonical-store | 0 | 重建主题 canonical store 快照，校验版本、条目计数与内容哈希。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarSystem.ts](sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [topicCanonical.ts](../../synthesis-application/src/topicCanonical.ts.md) | packages/synthesis-application/src/topicCanonical.ts | 主题 canonical store：定义主题目录的路径 ID、章节文件名与 JSON 文本规范，按 metadata envelope、章节身份与声明哈希重建快照并支持 inspect 诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisTopicCanonicalStoreSnapshot | 函数 | 12–39 | 重建主题 canonical store 快照，校验版本、条目计数与内容哈希。 |
