
# src/modules/synthesis/webDavSyncAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/webDavSyncAdapter.ts -->

WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。
源码：[src/modules/synthesis/webDavSyncAdapter.ts](../../../../../../src/modules/synthesis/webDavSyncAdapter.ts)

## 符号（3）
<!-- node: function:src/modules/synthesis/webDavSyncAdapter.ts:createPrefsConfiguredSynthesisWebDavSyncPort -->
<!-- node: function:src/modules/synthesis/webDavSyncAdapter.ts:descriptionFromStatus -->
<!-- node: function:src/modules/synthesis/webDavSyncAdapter.ts:descriptionUnavailable -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createPrefsConfiguredSynthesisWebDavSyncPort](../../../../symbols/src/modules/synthesis/webDavSyncAdapter.ts/createPrefsConfiguredSynthesisWebDavSyncPort.md) | 函数 | 87–266 | 复杂 | port-实现、webdav、同步、首选项、核心 | 1 | 构造由首选项驱动的 WebDAV 同步 port，实现集合确保、读写与远端描述查询，并统一附带凭据。 |
| descriptionFromStatus | 函数 | 52–70 | 简单 | webdav、投影、契约 | 0 | 把 WebDAV 远端状态转换为契约化的远端目录描述。 |
| descriptionUnavailable | 函数 | 32–43 | 简单 | webdav、降级、契约 | 1 | 构造远端目录不可用时的占位描述，保证 port 始终返回契约结构。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [webDavSyncClient.ts](webDavSyncClient.ts.md) | src/modules/synthesis/webDavSyncClient.ts | WebDAV 同步的默认 HTTP client：基于 Zotero 运行时能力发起请求、解析响应头，并为请求附加凭据。 |
| [webDavSyncPrefs.ts](webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |
| [webDavSyncRemote.ts](webDavSyncRemote.ts.md) | src/modules/synthesis/webDavSyncRemote.ts | WebDAV 远端地址的清洗与拼接：抹除 URL 中的凭据并把 base URL 与相对路径组合成可请求地址。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisReverseHostHandlers.ts](reverseHost/synthesisReverseHostHandlers.ts.md) | src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts | Synthesis reverse host 的 RPC handler 集合：把 sidecar 发回的宿主请求重建为契约 DTO 并分派到各 port，是 sidecar 与插件宿主之间的回调边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createPrefsConfiguredSynthesisWebDavSyncPort](../../../../symbols/src/modules/synthesis/webDavSyncAdapter.ts/createPrefsConfiguredSynthesisWebDavSyncPort.md) | 函数 | 87–266 | 构造由首选项驱动的 WebDAV 同步 port，实现集合确保、读写与远端描述查询，并统一附带凭据。 |
