
# packages/synthesis-contracts/src/libraryIndex.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/libraryIndex.ts -->

文献库索引合约：定义 libraryIndex 子客户端方法与索引结果结构（文献数、artifact 覆盖度与索引哈希），并重建 capability 结果。
源码：[packages/synthesis-contracts/src/libraryIndex.ts](../../../../../../packages/synthesis-contracts/src/libraryIndex.ts)

## 符号（1）
<!-- node: function:packages/synthesis-contracts/src/libraryIndex.ts:rebuildSynthesisLibraryIndexResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| rebuildSynthesisLibraryIndexResult | 函数 | 80–88 | 简单 | 合约、文献库索引、校验 | 0 | 重建文献库索引结果：校验文献数、artifact 覆盖计数与索引哈希的形状。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisLibraryIndexResult | 函数 | 80–88 | 重建文献库索引结果：校验文献数、artifact 覆盖计数与索引哈希的形状。 |
