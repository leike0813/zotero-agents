
# scripts/host-bridge/materialize-host-bridge-surfaces.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/materialize-host-bridge-surfaces.ts -->

把 surface 目录与命令契约物化为磁盘上的 SKILL.md 与 reference 文档，内含绝对深度门禁与固定 baseline 的厚度检查。
源码：[scripts/host-bridge/materialize-host-bridge-surfaces.ts](../../../../../scripts/host-bridge/materialize-host-bridge-surfaces.ts)

## 符号（7）
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:commonManifest -->
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:copyBinaries -->
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:copyResolvedSkills -->
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:materializeHostBridgeSurfaces -->
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:resetDirectory -->
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:stagedHostBridgePayloadDigests -->
<!-- node: function:scripts/host-bridge/materialize-host-bridge-surfaces.ts:stagingReleaseSet -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| commonManifest | 函数 | 75–90 | 简单 | manifest、data-model、release | 0 | 生成物化清单的公共部分：来源、surface 版本与生成标识。 |
| copyBinaries | 函数 | 92–106 | 简单 | filesystem、cli、distribution | 0 | 按七平台目录复制 Host Bridge CLI 预编译二进制到物化目录。 |
| copyResolvedSkills | 函数 | 112–132 | 简单 | filesystem、skill、distribution | 0 | 把已解析的 skill 包复制进物化目录，并保持相对路径结构。 |
| materializeHostBridgeSurfaces | 函数 | 134–253 | 复杂 | materialization、entry-point、release | 0 | 物化入口：重置目录、复制二进制与 skill、写入清单，并返回本次物化的结果摘要。 |
| resetDirectory | 函数 | 63–73 | 简单 | filesystem、cleanup、utility | 0 | 清空并重建目标目录，保证物化结果不含历史残留。 |
| stagedHostBridgePayloadDigests | 函数 | 304–322 | 简单 | checksum、release、verification | 0 | 计算暂存 payload 的内容摘要集合，供发布前比对与回执使用。 |
| stagingReleaseSet | 函数 | 255–283 | 中等 | staging、release、orchestration | 0 | 依据 release set 暂存本次发布所需的 surface 内容，收敛发布范围。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-release-plan.ts](host-bridge-release-plan.ts.md) | scripts/host-bridge/host-bridge-release-plan.ts | 计算 Host Bridge 发布计划：结合 release set 与 surface 物化结果，推导需要重建、复核与发布的受治理工件清单。 |
| [render-host-bridge-release-set.ts](render-host-bridge-release-set.ts.md) | scripts/host-bridge/render-host-bridge-release-set.ts | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| materializeHostBridgeSurfaces | 函数 | 134–253 | 物化入口：重置目录、复制二进制与 skill、写入清单，并返回本次物化的结果摘要。 |
| stagedHostBridgePayloadDigests | 函数 | 304–322 | 计算暂存 payload 的内容摘要集合，供发布前比对与回执使用。 |
