
# normalizeJson
<!-- node: function:packages/synthesis-contracts/src/canonicalJson.ts:normalizeJson -->

递归规范化 JSON 值：对象键按 UTF-8 字节序排序、拒绝非有限数字与孤立代理项、统计节点数并限制深度。
类型：函数  
复杂度：复杂  
入边数：1  
标签：canonical-json、规范化、核心、递归  
所属文件：[packages/synthesis-contracts/src/canonicalJson.ts](../../../../../files/packages/synthesis-contracts/src/canonicalJson.ts.md)
源码：[packages/synthesis-contracts/src/canonicalJson.ts:201](../../../../../../../packages/synthesis-contracts/src/canonicalJson.ts#L201)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [canonicalizeSynthesisContractJsonArtifact](../../../../../files/packages/synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts:270–281 | 产出规范化 artifact：同时给出 canonical 文本、哈希与节点数，供合约层直接消费。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [utf8BytesUnchecked](../../../../../files/packages/synthesis-contracts/src/canonicalJson.ts.md) | packages/synthesis-contracts/src/canonicalJson.ts:69–93 | 把字符串逐字符编码为 UTF-8 字节序列，处理代理对与孤立代理项两种情况。 |
