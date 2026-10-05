
# packages/synthesis-contracts/src/webDavSyncPort.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/webDavSyncPort.ts -->

宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。
源码：[packages/synthesis-contracts/src/webDavSyncPort.ts](../../../../../../packages/synthesis-contracts/src/webDavSyncPort.ts)

## 符号（12）
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:configStatus -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:diagnostics -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:managedPath -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:rebuildSynthesisHostWebDavSyncConnectionTest -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:rebuildSynthesisHostWebDavSyncDescription -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:rebuildSynthesisHostWebDavSyncEnsureCollectionResult -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:rebuildSynthesisHostWebDavSyncReadResult -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:rebuildSynthesisHostWebDavSyncWriteRequest -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:rebuildSynthesisHostWebDavSyncWriteResult -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:safeBaseUrl -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:stringValue -->
<!-- node: function:packages/synthesis-contracts/src/webDavSyncPort.ts:utf8Bytes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| configStatus | 函数 | 138–148 | 简单 | validation、webdav-sync、parsing | 0 | 把连接配置归一为受限的状态枚举值。 |
| diagnostics | 函数 | 118–129 | 简单 | validation、diagnostics、contract | 0 | 重建有界诊断列表，逐条校验 code/message 并截断到上限。 |
| managedPath | 函数 | 243–255 | 简单 | validation、contract、filesystem | 0 | 校验托管路径字段，确保路径落在受管目录内且不含越界片段。 |
| rebuildSynthesisHostWebDavSyncConnectionTest | 函数 | 157–241 | 中等 | contract、rebuild、webdav-sync、diagnostics | 0 | 重建连接测试结果，区分可达、鉴权失败与网络错误。 |
| rebuildSynthesisHostWebDavSyncDescription | 函数 | 306–364 | 中等 | contract、rebuild、webdav-sync | 0 | 重建远端集合描述，聚合子集合与容量信息。 |
| rebuildSynthesisHostWebDavSyncEnsureCollectionResult | 函数 | 479–505 | 简单 | contract、rebuild、webdav-sync | 0 | 重建集合确保结果，区分已存在与新建。 |
| rebuildSynthesisHostWebDavSyncReadResult | 函数 | 374–418 | 简单 | contract、rebuild、webdav-sync | 0 | 重建远端读取结果，携带 ETag、内容与 not-found 语义。 |
| rebuildSynthesisHostWebDavSyncWriteRequest | 函数 | 420–436 | 简单 | contract、rebuild、webdav-sync | 0 | 重建远端写入请求，校验目标路径、字节上限与条件写。 |
| rebuildSynthesisHostWebDavSyncWriteResult | 函数 | 438–469 | 简单 | contract、rebuild、webdav-sync | 0 | 重建远端写入结果，记录 ETag 与冲突信号。 |
| safeBaseUrl | 函数 | 287–304 | 简单 | validation、webdav-sync、security | 0 | 校验 WebDAV base URL 的协议与主机部分，拒绝非 http(s) 与凭据内嵌。 |
| stringValue | 函数 | 84–106 | 简单 | validation、contract、parsing | 0 | 把未知输入收敛为字符串，非法类型与超长值直接失败。 |
| utf8Bytes | 函数 | 257–275 | 简单 | utility、encoding、validation | 0 | 按 UTF-8 编码计算字符串字节数，用于体积上限判断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarProduction.ts](sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts | 生产运行时 sidecar 契约：discovery/health/handshake DTO、reverse-host 调用 schema、能力清单，以及响应体与超时上限。 |
| [webDavSync.ts](webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |
| [webDavSyncApplication.ts](../../synthesis-application/src/webDavSyncApplication.ts.md) | packages/synthesis-application/src/webDavSyncApplication.ts | WebDAV 同步应用层：编排快照指针读取、远端 head 比对与冲突报告，按重试退避策略驱动写入，并在同步状态陈旧时拒绝继续写入。 |
| [webDavSyncTypes.ts](../../../src/modules/synthesis/webDavSyncTypes.ts.md) | src/modules/synthesis/webDavSyncTypes.ts | WebDAV 同步的插件侧类型出口：把 synthesis-contracts 中的配置状态与诊断类型重新导出，并定义连接测试结果 DTO，避免 UI 层直接依赖合约包路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisHostWebDavSyncConnectionTest | 函数 | 157–241 | 重建连接测试结果，区分可达、鉴权失败与网络错误。 |
| rebuildSynthesisHostWebDavSyncDescription | 函数 | 306–364 | 重建远端集合描述，聚合子集合与容量信息。 |
| rebuildSynthesisHostWebDavSyncEnsureCollectionResult | 函数 | 479–505 | 重建集合确保结果，区分已存在与新建。 |
| rebuildSynthesisHostWebDavSyncReadResult | 函数 | 374–418 | 重建远端读取结果，携带 ETag、内容与 not-found 语义。 |
| rebuildSynthesisHostWebDavSyncWriteRequest | 函数 | 420–436 | 重建远端写入请求，校验目标路径、字节上限与条件写。 |
| rebuildSynthesisHostWebDavSyncWriteResult | 函数 | 438–469 | 重建远端写入结果，记录 ETag 与冲突信号。 |
