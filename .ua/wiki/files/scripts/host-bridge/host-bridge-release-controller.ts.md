
# scripts/host-bridge/host-bridge-release-controller.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-release-controller.ts -->

Host Bridge 发布 receipt 状态机：创建 receipt、按事件推进状态，并原子写出受治理的发布身份文件与 surface 更新记录。
源码：[scripts/host-bridge/host-bridge-release-controller.ts](../../../../../scripts/host-bridge/host-bridge-release-controller.ts)

## 符号（3）
<!-- node: function:scripts/host-bridge/host-bridge-release-controller.ts:advanceHostBridgeReleaseReceipt -->
<!-- node: function:scripts/host-bridge/host-bridge-release-controller.ts:createHostBridgeReleaseReceipt -->
<!-- node: function:scripts/host-bridge/host-bridge-release-controller.ts:surfaceUpdates -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| advanceHostBridgeReleaseReceipt | 函数 | 109–213 | 复杂 | release、state-machine、receipt、governance | 0 | 按事件推进 receipt 状态机，处理状态迁移、非法转移拒绝与 surface 更新记录。 |
| createHostBridgeReleaseReceipt | 函数 | 54–107 | 中等 | release、receipt、governance、host-bridge | 0 | 创建 Host Bridge 发布 receipt，固化版本、平台集合、资产摘要与初始状态。 |
| surfaceUpdates | 函数 | 235–253 | 简单 | release、host-bridge、aggregation、surface | 0 | 从发布集合与状态中汇总需要同步到 agent-facing surface 的更新项。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| advanceHostBridgeReleaseReceipt | 函数 | 109–213 | 按事件推进 receipt 状态机，处理状态迁移、非法转移拒绝与 surface 更新记录。 |
| createHostBridgeReleaseReceipt | 函数 | 54–107 | 创建 Host Bridge 发布 receipt，固化版本、平台集合、资产摘要与初始状态。 |
