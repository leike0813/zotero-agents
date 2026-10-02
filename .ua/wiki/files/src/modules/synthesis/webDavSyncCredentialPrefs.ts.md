
# src/modules/synthesis/webDavSyncCredentialPrefs.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/webDavSyncCredentialPrefs.ts -->

WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。
源码：[src/modules/synthesis/webDavSyncCredentialPrefs.ts](../../../../../../src/modules/synthesis/webDavSyncCredentialPrefs.ts)

## 符号（2）
<!-- node: function:src/modules/synthesis/webDavSyncCredentialPrefs.ts:readSynthesisWebDavSyncCredential -->
<!-- node: function:src/modules/synthesis/webDavSyncCredentialPrefs.ts:storeSynthesisWebDavSyncCredential -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| readSynthesisWebDavSyncCredential | 函数 | 148–193 | 中等 | webdav、凭据、解密、诊断 | 0 | 从首选项读取并解密 WebDAV 凭据，缺失或损坏时返回不可用诊断。 |
| storeSynthesisWebDavSyncCredential | 函数 | 103–146 | 中等 | webdav、凭据、加密、首选项 | 1 | 加密 WebDAV 凭据并写入首选项，避免明文保存密码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeAuth.ts](../hostBridge/server/hostBridgeAuth.ts.md) | src/modules/hostBridge/server/hostBridgeAuth.ts | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [prefs.ts](../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSyncClient.ts](webDavSyncClient.ts.md) | src/modules/synthesis/webDavSyncClient.ts | WebDAV 同步的默认 HTTP client：基于 Zotero 运行时能力发起请求、解析响应头，并为请求附加凭据。 |
| [webDavSyncPrefs.ts](webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| readSynthesisWebDavSyncCredential | 函数 | 148–193 | 从首选项读取并解密 WebDAV 凭据，缺失或损坏时返回不可用诊断。 |
| storeSynthesisWebDavSyncCredential | 函数 | 103–146 | 加密 WebDAV 凭据并写入首选项，避免明文保存密码。 |
