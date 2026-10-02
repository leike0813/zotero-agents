
# src/schemas/zoteroHostMutationSchemas.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/schemas](../../../modules/src/schemas.md)
<!-- node: file:src/schemas/zoteroHostMutationSchemas.ts -->

Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。

规模：1619 行
源码：[src/schemas/zoteroHostMutationSchemas.ts](../../../../../src/schemas/zoteroHostMutationSchemas.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [render-host-mutation-contract.ts](../../scripts/host-bridge/render-host-mutation-contract.ts.md) | scripts/host-bridge/render-host-mutation-contract.ts | 构建期脚本，把 canonical mutation 的 JSON Schema 渲染成 Host Bridge agent-facing 契约文本，保证代理侧看到的 mutation 语义与插件侧 schema 同源。 |
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
