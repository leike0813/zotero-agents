
# scripts/host-bridge/host-bridge-surface-version.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-surface-version.ts -->

基于 surface model 推导 Host Bridge surface 版本号与变更标识，供 release set 和渲染层判断是否需要重建。
源码：[scripts/host-bridge/host-bridge-surface-version.ts](../../../../../scripts/host-bridge/host-bridge-surface-version.ts)

## 符号（1）
<!-- node: function:scripts/host-bridge/host-bridge-surface-version.ts:inspectOrBumpHostBridgeSurfaceVersion -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| inspectOrBumpHostBridgeSurfaceVersion | 函数 | 16–33 | 简单 | versioning、cli、entry-point | 0 | 版本脚本入口：检查 surface 当前版本，或按需递增 patch 位并回写。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| inspectOrBumpHostBridgeSurfaceVersion | 函数 | 16–33 | 版本脚本入口：检查 surface 当前版本，或按需递增 patch 位并回写。 |
