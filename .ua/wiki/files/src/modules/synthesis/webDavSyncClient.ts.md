
# src/modules/synthesis/webDavSyncClient.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/webDavSyncClient.ts -->

WebDAV 同步的默认 HTTP client：基于 Zotero 运行时能力发起请求、解析响应头，并为请求附加凭据。
源码：[src/modules/synthesis/webDavSyncClient.ts](../../../../../../src/modules/synthesis/webDavSyncClient.ts)

## 符号（3）
<!-- node: function:src/modules/synthesis/webDavSyncClient.ts:createDefaultSynthesisWebDavHttpClient -->
<!-- node: function:src/modules/synthesis/webDavSyncClient.ts:responseHeader -->
<!-- node: function:src/modules/synthesis/webDavSyncClient.ts:webDavCredentialForRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createDefaultSynthesisWebDavHttpClient | 函数 | 51–105 | 中等 | webdav、http-client、factory、认证 | 1 | 构造默认 WebDAV HTTP client：按方法发起请求、返回状态与头，并把凭据编码为 Basic 认证。 |
| responseHeader | 函数 | 28–47 | 简单 | webdav、http-client、utility | 0 | 从响应头集合中按大小写不敏感方式读取指定头值。 |
| webDavCredentialForRequest | 函数 | 107–110 | 简单 | webdav、认证、utility | 1 | 把用户名与密码拼装为 WebDAV Basic 认证凭据。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [wait.ts](../../utils/wait.ts.md) | src/utils/wait.ts | 等待与轮询工具：提供 delay、超时等待与带中止信号的条件轮询，被各模块的异步流程广泛复用。 |
| [webDavSyncCredentialPrefs.ts](webDavSyncCredentialPrefs.ts.md) | src/modules/synthesis/webDavSyncCredentialPrefs.ts | WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSyncAdapter.ts](webDavSyncAdapter.ts.md) | src/modules/synthesis/webDavSyncAdapter.ts | WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。 |
| [webDavSyncPrefs.ts](webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createDefaultSynthesisWebDavHttpClient | 函数 | 51–105 | 构造默认 WebDAV HTTP client：按方法发起请求、返回状态与头，并把凭据编码为 Basic 认证。 |
| webDavCredentialForRequest | 函数 | 107–110 | 把用户名与密码拼装为 WebDAV Basic 认证凭据。 |
