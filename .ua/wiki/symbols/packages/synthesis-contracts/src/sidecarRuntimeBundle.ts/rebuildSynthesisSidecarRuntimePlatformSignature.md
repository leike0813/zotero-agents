
# rebuildSynthesisSidecarRuntimePlatformSignature
<!-- node: function:packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:rebuildSynthesisSidecarRuntimePlatformSignature -->

重建平台签名并校验其与 target、平台身份的对应关系。
类型：函数  
复杂度：简单  
入边数：5  
标签：contract、validation、sidecar  
所属文件：[packages/synthesis-contracts/src/sidecarRuntimeBundle.ts](../../../../../files/packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md)
源码：[packages/synthesis-contracts/src/sidecarRuntimeBundle.ts:251](../../../../../../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts#L251)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisSidecarDiscovery](../../../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts:350–456 | 重建 sidecar 发现记录，校验端点、身份指纹与就绪时间。 |
| [rebuildSynthesisSidecarLaunchConfig](../../../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts:171–348 | 重建 sidecar 启动配置，校验可执行文件绝对路径、平台目标与超时参数。 |
| [productionRuntimeIdentity](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:478–519 | 重建生产运行时身份：实现、平台目标与 bundle 指纹。 |
| [rebuildSynthesisProductionDiscovery](../../../../../files/packages/synthesis-contracts/src/sidecarProduction.ts.md) | packages/synthesis-contracts/src/sidecarProduction.ts:561–652 | 重建生产发现记录，包含端点、身份、能力与快照。 |
| [rebuildNativeRuntimeIdentity](../../../../../files/packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts:1074–1133 | 重建 native runtime 身份，校验实现标识、平台目标与 bundle 哈希。 |

## 调用

该符号没有记录对外调用。
