
# src/modules/synthesis/zoteroItemRefAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/zoteroItemRefAdapter.ts -->

portable item ref 与 Zotero 实体之间的双向适配：按 ref 查找条目并从条目生成稳定 ref。
源码：[src/modules/synthesis/zoteroItemRefAdapter.ts](../../../../../../src/modules/synthesis/zoteroItemRefAdapter.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/zoteroItemRefAdapter.ts:findZoteroItemByRef -->
<!-- node: function:src/modules/synthesis/zoteroItemRefAdapter.ts:stableRefFromZoteroItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findZoteroItemByRef | 函数 | 21–39 | 简单 | portable-ref、zotero-适配、查询 | 0 | 按 libraryId 与 key 查找 Zotero 条目，找不到时返回 undefined 而不抛错。 |
| stableRefFromZoteroItem | 函数 | 41–51 | 简单 | portable-ref、zotero-适配、utility | 0 | 把 Zotero 条目转换为稳定 portable ref，必要时校验其所属 library。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [relatedItemsEffectAdapter.ts](relatedItemsEffectAdapter.ts.md) | src/modules/synthesis/relatedItemsEffectAdapter.ts | Synthesis related-items effect port 实现：依据 portable ref 解析 Zotero 条目并以追加方式写入关联关系，缺失条目转为诊断信息。 |
| [tagEffectAdapter.ts](tagEffectAdapter.ts.md) | src/modules/synthesis/tagEffectAdapter.ts | Synthesis 标签 effect port 实现：经 Broker 写入受审批的标签绑定，并支持 staged tag binding 的解析与迁移。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| findZoteroItemByRef | 函数 | 21–39 | 按 libraryId 与 key 查找 Zotero 条目，找不到时返回 undefined 而不抛错。 |
| stableRefFromZoteroItem | 函数 | 41–51 | 把 Zotero 条目转换为稳定 portable ref，必要时校验其所属 library。 |
