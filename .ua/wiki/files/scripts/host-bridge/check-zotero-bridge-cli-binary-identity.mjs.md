
# scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs -->

校验 Host Bridge CLI 预编译二进制的身份文件：读取构建 recipe 与 identity JSON，确认平台、版本与摘要一致。
源码：[scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs](../../../../../scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs)

## 符号（2）
<!-- node: function:scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs:checkHostBridgeCliBinaryIdentity -->
<!-- node: function:scripts/host-bridge/check-zotero-bridge-cli-binary-identity.mjs:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| checkHostBridgeCliBinaryIdentity | 函数 | 20–75 | 中等 | validation、identity、release、host-bridge | 0 | 比对构建 recipe、平台目录与 identity 文件，确认预编译 CLI 的平台、版本与摘要一致。 |
| main | 函数 | 77–86 | 简单 | entry-point、validation、cli、identity | 0 | CLI 入口：解析参数后执行二进制身份校验并在不一致时以非零码退出。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkHostBridgeCliBinaryIdentity | 函数 | 20–75 | 比对构建 recipe、平台目录与 identity 文件，确认预编译 CLI 的平台、版本与摘要一致。 |
