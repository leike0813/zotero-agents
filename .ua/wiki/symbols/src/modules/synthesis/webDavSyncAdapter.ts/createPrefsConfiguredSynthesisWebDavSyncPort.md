
# createPrefsConfiguredSynthesisWebDavSyncPort
<!-- node: function:src/modules/synthesis/webDavSyncAdapter.ts:createPrefsConfiguredSynthesisWebDavSyncPort -->

构造由首选项驱动的 WebDAV 同步 port，实现集合确保、读写与远端描述查询，并统一附带凭据。
类型：函数  
复杂度：复杂  
入边数：1  
标签：port-实现、webdav、同步、首选项、核心  
所属文件：[src/modules/synthesis/webDavSyncAdapter.ts](../../../../../files/src/modules/synthesis/webDavSyncAdapter.ts.md)
源码：[src/modules/synthesis/webDavSyncAdapter.ts:87](../../../../../../../src/modules/synthesis/webDavSyncAdapter.ts#L87)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createSynthesisReverseHostHandlers](../reverseHost/synthesisReverseHostHandlers.ts/createSynthesisReverseHostHandlers.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts:139–293 | 构造 reverse host 的基础 handler 集合，把 sidecar 回调分派到各 host port 并重建契约结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [createDefaultSynthesisWebDavHttpClient](../../../../../files/src/modules/synthesis/webDavSyncClient.ts.md) | src/modules/synthesis/webDavSyncClient.ts:51–105 | 构造默认 WebDAV HTTP client：按方法发起请求、返回状态与头，并把凭据编码为 Basic 认证。 |
| [getSynthesisWebDavSyncPrefsConfig](../../../../../files/src/modules/synthesis/webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts:167–178 | 读取 WebDAV 同步首选项并组装为内部配置对象，缺失项以空值表示而不报错。 |
| [webDavRemoteUrl](../../../../../files/src/modules/synthesis/webDavSyncRemote.ts.md) | src/modules/synthesis/webDavSyncRemote.ts:22–31 | 把已脱敏的 base URL 与相对路径拼接为可直接请求的 WebDAV 远端地址。 |
