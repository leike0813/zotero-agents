
# verifySynthesisSidecarRuntimeBundleDirectory
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:verifySynthesisSidecarRuntimeBundleDirectory -->

完整校验 bundle 目录：清单、指针、可执行位、布局与指纹全部一致才算通过。
类型：函数  
复杂度：复杂  
入边数：3  
标签：validation、产物校验、治理  
所属文件：[scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts](../../../../files/scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts.md)
源码：[scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts:416](../../../../../../scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts#L416)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [downloadSynthesisSidecarRuntimeCache](../../../../files/scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts.md) | scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts:150–226 | 缓存下载主流程：按目标过滤 run、选 artifact、下载解包并做摘要与布局校验。 |
| [stageSynthesisSidecarRuntimePrebuildSet](../../../../files/scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts.md) | scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts:64–166 | 暂存主流程：逐目标解包归档、校验布局与清单、写入 store 并更新预构建集合。 |
| [syncSynthesisSidecarRuntimePrebuilds](../sync-synthesis-sidecar-runtime-prebuilds.ts/syncSynthesisSidecarRuntimePrebuilds.md) | scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts:70–183 | 同步主流程：按目标比对远端与本地差异，增量复制并重建预构建集合。 |

## 调用

该符号没有记录对外调用。
