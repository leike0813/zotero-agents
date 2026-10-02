
# readSynthesisSidecarRuntimeReleaseSet
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-set.ts:readSynthesisSidecarRuntimeReleaseSet -->

从磁盘读取 release set JSON 并按 schema 重建受治理结构。
类型：函数  
复杂度：简单  
入边数：2  
标签：读取、契约、sidecar  
所属文件：[scripts/synthesis/synthesis-sidecar-runtime-release-set.ts](../../../../files/scripts/synthesis/synthesis-sidecar-runtime-release-set.ts.md)
源码：[scripts/synthesis/synthesis-sidecar-runtime-release-set.ts:22](../../../../../../scripts/synthesis/synthesis-sidecar-runtime-release-set.ts#L22)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [advanceSynthesisSidecarRuntimeReleaseReceipt](../../../../files/scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts:58–87 | 按合法转移推进回执阶段，拒绝跳跃或重复推进并保留失败原因。 |
| [createSynthesisSidecarRuntimeReleasePlan](../../../../files/scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts:10–35 | 从 release set 构造发布计划，逐目标绑定预构建结果与发布顺序。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisSidecarRuntimeReleaseSet](../../../../files/packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts:606–667 | 重建并校验 release set 的结构与聚合一致性。 |
