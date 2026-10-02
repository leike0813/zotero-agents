
# scripts/host-bridge/host-bridge-surface-catalog.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-surface-catalog.ts -->

枚举 Host Bridge 的 agent-facing surface 目录：按命令契约决定哪些 skill 文档、reference 与 depth 层级需要物化。
源码：[scripts/host-bridge/host-bridge-surface-catalog.ts](../../../../../scripts/host-bridge/host-bridge-surface-catalog.ts)

## 符号（3）
<!-- node: function:scripts/host-bridge/host-bridge-surface-catalog.ts:buildHostBridgeSurfaceCatalog -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-catalog.ts:loadHostBridgeCliInventory -->
<!-- node: function:scripts/host-bridge/host-bridge-surface-catalog.ts:validateHostBridgeSurfaceCatalog -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [buildHostBridgeSurfaceCatalog](../../../symbols/scripts/host-bridge/host-bridge-surface-catalog.ts/buildHostBridgeSurfaceCatalog.md) | 函数 | 152–231 | 复杂 | catalog、agent-surface、structure | 1 | 构建 surface 目录：按命令与 CLI 能力归组出 SKILL.md 与 reference 的分层结构。 |
| loadHostBridgeCliInventory | 函数 | 122–150 | 中等 | loading、capability、cli | 0 | 加载 Host Bridge CLI 能力清单，作为 surface 目录构建的输入。 |
| validateHostBridgeSurfaceCatalog | 函数 | 233–287 | 中等 | validation、governance、catalog | 0 | 校验目录的绝对深度门禁、条目完整性与命名规范，确保 surface 结构可治理。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-command-contracts.ts](host-bridge-command-contracts.ts.md) | scripts/host-bridge/host-bridge-command-contracts.ts | Host Bridge 命令契约的单一事实源：以数据形式声明全部 MCP/CLI 命令的参数、审批范围、证据与终态语义，供渲染、校验与消费方指引共用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [render-host-bridge-release-set.ts](render-host-bridge-release-set.ts.md) | scripts/host-bridge/render-host-bridge-release-set.ts | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |
| [render-host-bridge-surfaces.ts](render-host-bridge-surfaces.ts.md) | scripts/host-bridge/render-host-bridge-surfaces.ts | Host Bridge agent-facing surface 的渲染器：把命令契约、surface 目录、内置工作流与插件 skill bundle 组合成多层 SKILL.md 与 reference 文档，本批最核心的生成脚本。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildHostBridgeSurfaceCatalog](../../../symbols/scripts/host-bridge/host-bridge-surface-catalog.ts/buildHostBridgeSurfaceCatalog.md) | 函数 | 152–231 | 构建 surface 目录：按命令与 CLI 能力归组出 SKILL.md 与 reference 的分层结构。 |
| loadHostBridgeCliInventory | 函数 | 122–150 | 加载 Host Bridge CLI 能力清单，作为 surface 目录构建的输入。 |
| validateHostBridgeSurfaceCatalog | 函数 | 233–287 | 校验目录的绝对深度门禁、条目完整性与命名规范，确保 surface 结构可治理。 |
