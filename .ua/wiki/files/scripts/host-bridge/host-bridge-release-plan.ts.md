
# scripts/host-bridge/host-bridge-release-plan.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-release-plan.ts -->

计算 Host Bridge 发布计划：结合 release set 与 surface 物化结果，推导需要重建、复核与发布的受治理工件清单。
源码：[scripts/host-bridge/host-bridge-release-plan.ts](../../../../../scripts/host-bridge/host-bridge-release-plan.ts)

## 符号（5）
<!-- node: function:scripts/host-bridge/host-bridge-release-plan.ts:collectHostBridgeReleaseChangedFiles -->
<!-- node: function:scripts/host-bridge/host-bridge-release-plan.ts:createHostBridgeReleasePlan -->
<!-- node: function:scripts/host-bridge/host-bridge-release-plan.ts:currentCliBuildFingerprint -->
<!-- node: function:scripts/host-bridge/host-bridge-release-plan.ts:git -->
<!-- node: function:scripts/host-bridge/host-bridge-release-plan.ts:resolveHostBridgeReleaseBase -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectHostBridgeReleaseChangedFiles | 函数 | 82–93 | 简单 | release、git、diff | 0 | 列出相对基线发生变更的受治理文件，作为发布范围的输入。 |
| createHostBridgeReleasePlan | 函数 | 95–156 | 复杂 | release、planning、orchestration | 0 | 汇总变更分类、CLI 指纹与 surface 版本，生成可落盘的 Host Bridge 发布计划。 |
| currentCliBuildFingerprint | 函数 | 33–58 | 中等 | fingerprint、release、checksum | 0 | 计算当前 Host Bridge CLI 构建指纹，判断二进制是否相对基线发生变化。 |
| git | 函数 | 14–24 | 简单 | git、utility、subprocess | 0 | 封装 git 子进程调用并清理输出，供发布基线与变更查询复用。 |
| resolveHostBridgeReleaseBase | 函数 | 60–80 | 简单 | release、git、baseline | 0 | 解析发布基线 commit：优先使用显式参数，否则回退到默认分支或既有 release set。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-release-set.ts](host-bridge-release-set.ts.md) | scripts/host-bridge/host-bridge-release-set.ts | 维护 Host Bridge release set：汇总当前发布身份、surface 版本与基线 commit，作为发布计划与渲染的输入快照。 |
| [materialize-host-bridge-surfaces.ts](materialize-host-bridge-surfaces.ts.md) | scripts/host-bridge/materialize-host-bridge-surfaces.ts | 把 surface 目录与命令契约物化为磁盘上的 SKILL.md 与 reference 文档，内含绝对深度门禁与固定 baseline 的厚度检查。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prepare-host-bridge-release.ts](prepare-host-bridge-release.ts.md) | scripts/host-bridge/prepare-host-bridge-release.ts | Host Bridge 发布准备入口：编排 release plan 与版本意图检查，输出可渲染、可发布的受治理工件状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collectHostBridgeReleaseChangedFiles | 函数 | 82–93 | 列出相对基线发生变更的受治理文件，作为发布范围的输入。 |
| createHostBridgeReleasePlan | 函数 | 95–156 | 汇总变更分类、CLI 指纹与 surface 版本，生成可落盘的 Host Bridge 发布计划。 |
| resolveHostBridgeReleaseBase | 函数 | 60–80 | 解析发布基线 commit：优先使用显式参数，否则回退到默认分支或既有 release set。 |
