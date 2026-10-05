
# syncSynthesisSidecarRuntimePrebuilds
<!-- node: function:scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts:syncSynthesisSidecarRuntimePrebuilds -->

同步主流程：按目标比对远端与本地差异，增量复制并重建预构建集合。
类型：函数  
复杂度：复杂  
入边数：1  
标签：同步、预构建、编排  
所属文件：[scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts](../../../../files/scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts.md)
源码：[scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts:70](../../../../../../scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts#L70)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [fetchExactPrebuildStore](../../../../files/scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:287–328 | 从指定 prebuild run 拉取精确的 store 快照，并校验其身份与请求一致。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [verifySynthesisSidecarRuntimeBundleDirectory](../synthesis-sidecar-runtime-release-governance.ts/verifySynthesisSidecarRuntimeBundleDirectory.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:416–487 | 完整校验 bundle 目录：清单、指针、可执行位、布局与指纹全部一致才算通过。 |
