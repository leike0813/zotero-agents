
# packages/synthesis-contracts/src/webDavSync.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/webDavSync.ts -->

WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。
源码：[packages/synthesis-contracts/src/webDavSync.ts](../../../../../../packages/synthesis-contracts/src/webDavSync.ts)

## 符号（12）
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:boundedInteger -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:boundedJson -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:boundedString -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:exact -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:rebuildSynthesisWebDavSnapshotPointer -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:rebuildSynthesisWebDavSyncConflictReport -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:rebuildSynthesisWebDavSyncDiagnostic -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:rebuildSynthesisWebDavSyncDiagnosticDetails -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:rebuildSynthesisWebDavSyncState -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:synthesisWebDavRemotePath -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:utcIso8601 -->
<!-- node: function:packages/synthesis-contracts/src/webDavSync.ts:utf8Bytes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedInteger | 函数 | 284–298 | 简单 | validation、contract、parsing | 0 | 读取有上下界的整数字段。 |
| boundedJson | 函数 | 320–333 | 简单 | validation、serialization、contract | 0 | 收敛有体积上限的 JSON 值，限制节点数与编码字节数。 |
| boundedString | 函数 | 242–256 | 简单 | validation、contract、parsing | 0 | 读取有长度上限的字符串字段，超限时抛出契约错误。 |
| exact | 函数 | 227–240 | 简单 | validation、contract、guard | 0 | 校验字段集合与契约一致，缺字段或多余字段都会失败。 |
| rebuildSynthesisWebDavSnapshotPointer | 函数 | 690–756 | 中等 | contract、rebuild、webdav-sync | 0 | 重建远端快照指针，校验 ETag、大小与时间戳。 |
| rebuildSynthesisWebDavSyncConflictReport | 函数 | 428–512 | 中等 | contract、rebuild、webdav-sync、conflict | 0 | 重建同步冲突报告，列出本地与远端分叉及可选解决动作。 |
| rebuildSynthesisWebDavSyncDiagnostic | 函数 | 342–372 | 简单 | contract、rebuild、webdav-sync | 0 | 重建同步诊断条目，保留稳定失败码与可读信息。 |
| rebuildSynthesisWebDavSyncDiagnosticDetails | 函数 | 374–419 | 简单 | contract、rebuild、diagnostics | 0 | 重建同步诊断细节，限制嵌套 JSON 的节点数与字节数。 |
| rebuildSynthesisWebDavSyncState | 函数 | 514–688 | 中等 | contract、rebuild、webdav-sync、state-machine | 0 | 重建 WebDAV 同步状态：阶段、游标、重试节奏、冲突与诊断。 |
| synthesisWebDavRemotePath | 函数 | 758–774 | 简单 | utility、webdav-sync、path | 0 | 按 base URL 与快照 ID 生成规范化远端路径。 |
| utcIso8601 | 函数 | 262–273 | 简单 | utility、formatting、time | 0 | 把时间值格式化为 UTC ISO 8601 字符串。 |
| utf8Bytes | 函数 | 300–318 | 简单 | utility、encoding、validation | 0 | 按 UTF-8 编码计算字符串字节数，用于体积上限判断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [durableBundle.ts](durableBundle.ts.md) | packages/synthesis-contracts/src/durableBundle.ts | durable bundle 合约（1060 行）：定义 manifest/asset/bundle 三层 schema 版本与实体种类上限，并通过 createSynthesisDurableBundleCodec 统一封装编码、路径校验与实体键推导。 |
| [durableBundleImport.ts](durableBundleImport.ts.md) | packages/synthesis-contracts/src/durableBundleImport.ts | durable bundle 导入合约：构建同步索引，校验导入条目路径与载荷标量，规范化 live envelope 并把条目分类为可新增、可更新、可跳过三类事实。 |
| [webDavSyncPort.ts](webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [sync.ts](sync.ts.md) | packages/synthesis-contracts/src/sync.ts | WebDAV 同步命令契约：冲突解决动作枚举、冲突解决请求，以及 SyncTransportClient 的 run/pause/resume/retry 接口。 |
| [webDavSyncApplication.ts](../../synthesis-application/src/webDavSyncApplication.ts.md) | packages/synthesis-application/src/webDavSyncApplication.ts | WebDAV 同步应用层：编排快照指针读取、远端 head 比对与冲突报告，按重试退避策略驱动写入，并在同步状态陈旧时拒绝继续写入。 |
| [webDavSyncTypes.ts](../../../src/modules/synthesis/webDavSyncTypes.ts.md) | src/modules/synthesis/webDavSyncTypes.ts | WebDAV 同步的插件侧类型出口：把 synthesis-contracts 中的配置状态与诊断类型重新导出，并定义连接测试结果 DTO，避免 UI 层直接依赖合约包路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisWebDavSnapshotPointer | 函数 | 690–756 | 重建远端快照指针，校验 ETag、大小与时间戳。 |
| rebuildSynthesisWebDavSyncConflictReport | 函数 | 428–512 | 重建同步冲突报告，列出本地与远端分叉及可选解决动作。 |
| rebuildSynthesisWebDavSyncDiagnostic | 函数 | 342–372 | 重建同步诊断条目，保留稳定失败码与可读信息。 |
| rebuildSynthesisWebDavSyncState | 函数 | 514–688 | 重建 WebDAV 同步状态：阶段、游标、重试节奏、冲突与诊断。 |
| synthesisWebDavRemotePath | 函数 | 758–774 | 按 base URL 与快照 ID 生成规范化远端路径。 |
