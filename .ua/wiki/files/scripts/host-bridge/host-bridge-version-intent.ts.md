
# scripts/host-bridge/host-bridge-version-intent.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-version-intent.ts -->

解析仓库中声明的 Host Bridge 版本意图（期望的 surface/发布版本），供发布准备阶段与实际结果做一致性校验。
源码：[scripts/host-bridge/host-bridge-version-intent.ts](../../../../../scripts/host-bridge/host-bridge-version-intent.ts)

## 符号（1）
<!-- node: function:scripts/host-bridge/host-bridge-version-intent.ts:resolveExactCliReleaseIntent -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveExactCliReleaseIntent | 函数 | 9–30 | 简单 | versioning、release、validation | 0 | 解析 CLI 发布的精确版本意图：要求 platform 与 version 完全匹配，不做模糊回退。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prepare-host-bridge-release.ts](prepare-host-bridge-release.ts.md) | scripts/host-bridge/prepare-host-bridge-release.ts | Host Bridge 发布准备入口：编排 release plan 与版本意图检查，输出可渲染、可发布的受治理工件状态。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveExactCliReleaseIntent | 函数 | 9–30 | 解析 CLI 发布的精确版本意图：要求 platform 与 version 完全匹配，不做模糊回退。 |
