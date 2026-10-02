
# contracts/host-bridge/capabilities.v2.json
所属分层：[Zotero 宿主与 Bridge 集成](../../../layers/zotero-host.md)  
所属目录：[contracts/host-bridge](../../../modules/contracts/host-bridge.md)
<!-- node: config:contracts/host-bridge/capabilities.v2.json -->

Host Bridge v2 能力契约的单一事实源，以 5 万余行 JSON Schema 声明每项 Zotero 宿主能力的输入输出、mutation 语义与 note 详情结构。Rust 侧桥与插件侧校验器都从这份契约派生，保证 MCP/CLI 暴露面与 Zotero 宿主实现不漂移。
源码：[contracts/host-bridge/capabilities.v2.json](../../../../../contracts/host-bridge/capabilities.v2.json)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../../src/modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeCapabilityContract.ts](../../src/modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | src/modules/hostBridge/server/hostBridgeCapabilityContract.ts | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
