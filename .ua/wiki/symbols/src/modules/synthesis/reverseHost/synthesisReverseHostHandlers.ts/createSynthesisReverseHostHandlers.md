
# createSynthesisReverseHostHandlers
<!-- node: function:src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:createSynthesisReverseHostHandlers -->

构造 reverse host 的基础 handler 集合，把 sidecar 回调分派到各 host port 并重建契约结果。
类型：函数  
复杂度：复杂  
入边数：1  
标签：rpc-handler、reverse-host、sidecar、核心  
所属文件：[src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts](../../../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md)
源码：[src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:139](../../../../../../../../src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts#L139)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createScopedSynthesisReverseHostHandlers](createScopedSynthesisReverseHostHandlers.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:295–463 | 在基础 handler 上叠加 library scope 与库修订号缓存，阻止跨库读取与过期快照复用。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisHostExportDeliveryPort](../../../../../../files/src/modules/synthesis/exportDeliveryAdapter.ts.md) | src/modules/synthesis/exportDeliveryAdapter.ts:51–110 | 构造导出交付 port：把导出条目写入运行时目录、注册 Host Bridge 文件句柄并重建交付结果。 |
| [createZoteroSynthesisRelatedItemsEffectPort](../../../../../../files/src/modules/synthesis/relatedItemsEffectAdapter.ts.md) | src/modules/synthesis/relatedItemsEffectAdapter.ts:111–127 | 构造 related-items effect port，把 ref 解析与关系写入组合成一个可注入的 port。 |
| [createZoteroSynthesisRepresentativeImageReadPort](../../representativeImageReadAdapter.ts/createZoteroSynthesisRepresentativeImageReadPort.md) | src/modules/synthesis/representativeImageReadAdapter.ts:128–249 | 构造代表图读取 port：定位 digest 条目、读取附件字节并以 base64 返回，失败时给出结构化诊断。 |
| [exactPayload](../../../../../../files/src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:120–137 | 严格校验 RPC 载荷字段：要求必填字段存在且不含未声明字段。 |
| [createZoteroSynthesisTagEffectPort](../../../../../../files/src/modules/synthesis/tagEffectAdapter.ts.md) | src/modules/synthesis/tagEffectAdapter.ts:107–122 | 构造标签 effect port，把标签写入请求经 Broker 转为受审批的宿主 mutation。 |
| [createPrefsConfiguredSynthesisWebDavSyncPort](../../webDavSyncAdapter.ts/createPrefsConfiguredSynthesisWebDavSyncPort.md) | src/modules/synthesis/webDavSyncAdapter.ts:87–266 | 构造由首选项驱动的 WebDAV 同步 port，实现集合确保、读写与远端描述查询，并统一附带凭据。 |
