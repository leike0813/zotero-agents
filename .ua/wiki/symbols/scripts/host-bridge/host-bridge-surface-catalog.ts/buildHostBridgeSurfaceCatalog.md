
# buildHostBridgeSurfaceCatalog
<!-- node: function:scripts/host-bridge/host-bridge-surface-catalog.ts:buildHostBridgeSurfaceCatalog -->

构建 surface 目录：按命令与 CLI 能力归组出 SKILL.md 与 reference 的分层结构。
类型：函数  
复杂度：复杂  
入边数：1  
标签：catalog、agent-surface、structure  
所属文件：[scripts/host-bridge/host-bridge-surface-catalog.ts](../../../../files/scripts/host-bridge/host-bridge-surface-catalog.ts.md)
源码：[scripts/host-bridge/host-bridge-surface-catalog.ts:152](../../../../../../scripts/host-bridge/host-bridge-surface-catalog.ts#L152)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [renderHostBridgeSurfaces](../../../../files/scripts/host-bridge/render-host-bridge-surfaces.ts.md) | scripts/host-bridge/render-host-bridge-surfaces.ts:1261–1393 | 渲染总入口：构建 surface 目录、渲染各 profile 的 SKILL.md 与 reference，并写入 Host Bridge 内置 skill 包。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [loadHostBridgeCommandContracts](../host-bridge-command-contracts.ts/loadHostBridgeCommandContracts.md) | scripts/host-bridge/host-bridge-command-contracts.ts:307–481 | 加载并交叉校验全部命令契约，是契约层唯一对外入口，向渲染与治理脚本提供一致事实源。 |
