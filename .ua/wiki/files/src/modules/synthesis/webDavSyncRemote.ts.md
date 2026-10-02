
# src/modules/synthesis/webDavSyncRemote.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/webDavSyncRemote.ts -->

WebDAV 远端地址的清洗与拼接：抹除 URL 中的凭据并把 base URL 与相对路径组合成可请求地址。
源码：[src/modules/synthesis/webDavSyncRemote.ts](../../../../../../src/modules/synthesis/webDavSyncRemote.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/webDavSyncRemote.ts:sanitizeWebDavUrl -->
<!-- node: function:src/modules/synthesis/webDavSyncRemote.ts:webDavRemoteUrl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| sanitizeWebDavUrl | 函数 | 5–12 | 简单 | webdav、url、脱敏、安全 | 1 | 抹除 WebDAV URL 中内嵌的用户名与密码，日志与状态投影只允许出现脱敏地址。 |
| webDavRemoteUrl | 函数 | 22–31 | 简单 | webdav、url、拼接 | 1 | 把已脱敏的 base URL 与相对路径拼接为可直接请求的 WebDAV 远端地址。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSyncAdapter.ts](webDavSyncAdapter.ts.md) | src/modules/synthesis/webDavSyncAdapter.ts | WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。 |
| [webDavSyncPrefs.ts](webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| sanitizeWebDavUrl | 函数 | 5–12 | 抹除 WebDAV URL 中内嵌的用户名与密码，日志与状态投影只允许出现脱敏地址。 |
| webDavRemoteUrl | 函数 | 22–31 | 把已脱敏的 base URL 与相对路径拼接为可直接请求的 WebDAV 远端地址。 |
