
# scripts/host-bridge/prepare-host-bridge-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/prepare-host-bridge-release.ts -->

Host Bridge 发布准备入口：编排 release plan 与版本意图检查，输出可渲染、可发布的受治理工件状态。
源码：[scripts/host-bridge/prepare-host-bridge-release.ts](../../../../../scripts/host-bridge/prepare-host-bridge-release.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-release-plan.ts](host-bridge-release-plan.ts.md) | scripts/host-bridge/host-bridge-release-plan.ts | 计算 Host Bridge 发布计划：结合 release set 与 surface 物化结果，推导需要重建、复核与发布的受治理工件清单。 |
| [host-bridge-version-intent.ts](host-bridge-version-intent.ts.md) | scripts/host-bridge/host-bridge-version-intent.ts | 解析仓库中声明的 Host Bridge 版本意图（期望的 surface/发布版本），供发布准备阶段与实际结果做一致性校验。 |
