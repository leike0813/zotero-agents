
# contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json
所属分层：[Zotero 宿主与 Bridge 集成](../../../../layers/zotero-host.md)  
所属目录：[contracts/host-bridge/schemas](../../../../modules/contracts/host-bridge/schemas.md)
<!-- node: config:contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json -->

定义 Host Bridge 可执行能力契约（capability contracts）v2 的 JSON Schema，约束每项能力的输入输出形状、mutation 语义与 note detail 输出结构，是 Broker 能力面与调用方之间的类型事实源。
源码：[contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json](../../../../../../contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../../../src/modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
