
# src/modules/synthesis/tagEffectAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/tagEffectAdapter.ts -->

Synthesis 标签 effect port 实现：经 Broker 写入受审批的标签绑定，并支持 staged tag binding 的解析与迁移。
源码：[src/modules/synthesis/tagEffectAdapter.ts](../../../../../../src/modules/synthesis/tagEffectAdapter.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/tagEffectAdapter.ts:createZoteroSynthesisStagedTagBindingMigrationPort -->
<!-- node: function:src/modules/synthesis/tagEffectAdapter.ts:createZoteroSynthesisTagEffectPort -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createZoteroSynthesisStagedTagBindingMigrationPort | 函数 | 24–44 | 简单 | port-实现、标签、迁移 | 0 | 构造 staged tag binding 的迁移 port，供旧版标签绑定形态转换使用。 |
| createZoteroSynthesisTagEffectPort | 函数 | 107–122 | 简单 | port-实现、标签、broker、审批 | 1 | 构造标签 effect port，把标签写入请求经 Broker 转为受审批的宿主 mutation。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroItemRefAdapter.ts](zoteroItemRefAdapter.ts.md) | src/modules/synthesis/zoteroItemRefAdapter.ts | portable item ref 与 Zotero 实体之间的双向适配：按 ref 查找条目并从条目生成稳定 ref。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReverseHostHandlers.ts](reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createZoteroSynthesisStagedTagBindingMigrationPort | 函数 | 24–44 | 构造 staged tag binding 的迁移 port，供旧版标签绑定形态转换使用。 |
| createZoteroSynthesisTagEffectPort | 函数 | 107–122 | 构造标签 effect port，把标签写入请求经 Broker 转为受审批的宿主 mutation。 |
