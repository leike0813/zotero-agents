
# src/modules/synthesis/webDavSyncTypes.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/webDavSyncTypes.ts -->

WebDAV 同步的插件侧类型出口：把 synthesis-contracts 中的配置状态与诊断类型重新导出，并定义连接测试结果 DTO，避免 UI 层直接依赖合约包路径。
源码：[src/modules/synthesis/webDavSyncTypes.ts](../../../../../../src/modules/synthesis/webDavSyncTypes.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSync.ts](../../../packages/synthesis-contracts/src/webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |
| [webDavSyncPort.ts](../../../packages/synthesis-contracts/src/webDavSyncPort.ts.md) | packages/synthesis-contracts/src/webDavSyncPort.ts | 宿主 WebDAV 端口契约：连接测试、远端描述、读写与 ensure-collection 的请求结果重建，含托管路径与 base URL 安全校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [webDavSyncPrefs.ts](webDavSyncPrefs.ts.md) | src/modules/synthesis/webDavSyncPrefs.ts | WebDAV 同步首选项的配置读写与状态投影：校验配置、暴露配置状态、执行连接测试并统一生成诊断信息。 |
