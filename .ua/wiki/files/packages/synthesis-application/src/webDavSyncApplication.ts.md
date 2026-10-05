
# packages/synthesis-application/src/webDavSyncApplication.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application/src](../../../../modules/packages/synthesis-application/src.md)
<!-- node: file:packages/synthesis-application/src/webDavSyncApplication.ts -->

WebDAV 同步应用层：编排快照指针读取、远端 head 比对与冲突报告，按重试退避策略驱动写入，并在同步状态陈旧时拒绝继续写入。
源码：[packages/synthesis-application/src/webDavSyncApplication.ts](../../../../../../packages/synthesis-application/src/webDavSyncApplication.ts)

## 符号（2）
<!-- node: function:packages/synthesis-application/src/webDavSyncApplication.ts:createSynthesisWebDavSyncApplication -->
<!-- node: class:packages/synthesis-application/src/webDavSyncApplication.ts:SynthesisWebDavSyncApplicationError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisWebDavSyncApplication | 函数 | 106–872 | 复杂 | 工厂函数、webdav、同步、核心、命令集合 | 0 | WebDAV 同步应用工厂：提供描述读取、集合确保、远端读回与写入命令，处理陈旧同步标记、冲突报告与重试退避。 |
| SynthesisWebDavSyncApplicationError | 类 | 29–37 | 简单 | 错误类型、webdav、诊断 | 0 | WebDAV 同步应用层错误类型，携带错误码与远端 head/冲突上下文，用于同步失败与陈旧状态上报。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSync.ts](../../synthesis-contracts/src/webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |
| [webDavSyncPort.ts](../../synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisWebDavSyncApplication | 函数 | 106–872 | WebDAV 同步应用工厂：提供描述读取、集合确保、远端读回与写入命令，处理陈旧同步标记、冲突报告与重试退避。 |
| SynthesisWebDavSyncApplicationError | 类 | 29–37 | WebDAV 同步应用层错误类型，携带错误码与远端 head/冲突上下文，用于同步失败与陈旧状态上报。 |
