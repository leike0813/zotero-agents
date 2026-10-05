
# src/modules/synthesis/relatedItemsEffectAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/relatedItemsEffectAdapter.ts -->

Synthesis related-items effect port 实现：依据 portable ref 解析 Zotero 条目并以追加方式写入关联关系，缺失条目转为诊断信息。
源码：[src/modules/synthesis/relatedItemsEffectAdapter.ts](../../../../../../src/modules/synthesis/relatedItemsEffectAdapter.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/relatedItemsEffectAdapter.ts:createZoteroSynthesisRelatedItemsEffectPort -->
<!-- node: function:src/modules/synthesis/relatedItemsEffectAdapter.ts:hasRelatedItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createZoteroSynthesisRelatedItemsEffectPort | 函数 | 111–127 | 简单 | port-实现、effect、关联条目 | 1 | 构造 related-items effect port，把 ref 解析与关系写入组合成一个可注入的 port。 |
| hasRelatedItem | 函数 | 16–28 | 简单 | 去重、关联条目、utility | 1 | 判断条目之间是否已存在关联，避免重复写入 relations。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [zoteroItemRefAdapter.ts](zoteroItemRefAdapter.ts.md) | src/modules/synthesis/zoteroItemRefAdapter.ts | portable item ref 与 Zotero 实体之间的双向适配：按 ref 查找条目并从条目生成稳定 ref。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReverseHostHandlers.ts](reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createZoteroSynthesisRelatedItemsEffectPort | 函数 | 111–127 | 构造 related-items effect port，把 ref 解析与关系写入组合成一个可注入的 port。 |
