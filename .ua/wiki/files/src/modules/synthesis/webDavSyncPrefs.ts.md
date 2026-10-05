
# src/modules/synthesis/webDavSyncPrefs.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/webDavSyncPrefs.ts -->

WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。
源码：[src/modules/synthesis/webDavSyncPrefs.ts](../../../../../../src/modules/synthesis/webDavSyncPrefs.ts)

## 符号（5）
<!-- node: function:src/modules/synthesis/webDavSyncPrefs.ts:configStatus -->
<!-- node: function:src/modules/synthesis/webDavSyncPrefs.ts:getSynthesisWebDavSyncPrefsConfig -->
<!-- node: function:src/modules/synthesis/webDavSyncPrefs.ts:getWebDavSyncPrefsStatus -->
<!-- node: function:src/modules/synthesis/webDavSyncPrefs.ts:saveWebDavSyncPrefs -->
<!-- node: function:src/modules/synthesis/webDavSyncPrefs.ts:testWebDavSyncConfiguration -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [configStatus](../../../../symbols/src/modules/synthesis/webDavSyncPrefs.ts/configStatus.md) | 函数 | 88–142 | 中等 | 配置校验、webdav、诊断 | 2 | 评估 WebDAV 同步配置状态：校验 URL、目录与凭据完备性并输出具体诊断项。 |
| getSynthesisWebDavSyncPrefsConfig | 函数 | 167–178 | 简单 | 首选项、webdav、配置读取 | 1 | 读取 WebDAV 同步首选项并组装为内部配置对象，缺失项以空值表示而不报错。 |
| getWebDavSyncPrefsStatus | 函数 | 180–204 | 简单 | 首选项、状态投影、webdav | 1 | 读取当前 WebDAV 同步首选项并投影为状态对象供 UI 展示。 |
| saveWebDavSyncPrefs | 函数 | 206–256 | 中等 | 首选项、配置写入、校验 | 0 | 校验并保存 WebDAV 同步配置，URL 非法或凭据缺失时返回带诊断的失败。 |
| testWebDavSyncConfiguration | 函数 | 270–337 | 复杂 | webdav、连接测试、诊断 | 0 | 对当前或指定配置执行连接测试，报告远端可达性、认证结果与可用诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prefs.ts](../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [webDavSyncClient.ts](webDavSyncClient.ts.md) | src/modules/synthesis/webDavSyncClient.ts | WebDAV 同步的默认 HTTP client：基于 Zotero 运行时能力发起请求、解析响应头，并为请求附加凭据。 |
| [webDavSyncCredentialPrefs.ts](webDavSyncCredentialPrefs.ts.md) | src/modules/synthesis/webDavSyncCredentialPrefs.ts | WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。 |
| [webDavSyncRemote.ts](webDavSyncRemote.ts.md) | src/modules/synthesis/webDavSyncRemote.ts | WebDAV 远端地址的清洗与拼接：抹除 URL 中的凭据并把 base URL 与相对路径组合成可请求地址。 |
| [webDavSyncTypes.ts](webDavSyncTypes.ts.md) | src/modules/synthesis/webDavSyncTypes.ts | WebDAV 同步的插件侧类型出口：把 synthesis-contracts 中的配置状态与诊断类型重新导出，并定义连接测试结果 DTO，避免 UI 层直接依赖合约包路径。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hooks.ts](../../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [webDavSyncAdapter.ts](webDavSyncAdapter.ts.md) | src/modules/synthesis/webDavSyncAdapter.ts | WebDAV 同步 port 实现：从插件首选项读取连接配置，经 HTTP client 发起 PROPFIND/PUT/MKCOL 请求并重建契约化的读写结果与远端描述。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSyncCredentialPrefs.ts](webDavSyncCredentialPrefs.ts.md) | src/modules/synthesis/webDavSyncCredentialPrefs.ts | WebDAV 凭据的加密存取：基于插件主密钥派生密钥对凭据做加密后写入首选项，读取时解密并做基本校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getSynthesisWebDavSyncPrefsConfig | 函数 | 167–178 | 读取 WebDAV 同步首选项并组装为内部配置对象，缺失项以空值表示而不报错。 |
| getWebDavSyncPrefsStatus | 函数 | 180–204 | 读取当前 WebDAV 同步首选项并投影为状态对象供 UI 展示。 |
| saveWebDavSyncPrefs | 函数 | 206–256 | 校验并保存 WebDAV 同步配置，URL 非法或凭据缺失时返回带诊断的失败。 |
| testWebDavSyncConfiguration | 函数 | 270–337 | 对当前或指定配置执行连接测试，报告远端可达性、认证结果与可用诊断。 |
