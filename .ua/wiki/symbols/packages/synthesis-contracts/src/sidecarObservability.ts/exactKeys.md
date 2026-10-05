
# exactKeys
<!-- node: function:packages/synthesis-contracts/src/sidecarObservability.ts:exactKeys -->

校验对象键集合与契约完全一致，阻止未声明字段混入 wire 数据。
类型：函数  
复杂度：简单  
入边数：2  
标签：validation、contract、guard  
所属文件：[packages/synthesis-contracts/src/sidecarObservability.ts](../../../../../files/packages/synthesis-contracts/src/sidecarObservability.ts.md)
源码：[packages/synthesis-contracts/src/sidecarObservability.ts:121](../../../../../../../packages/synthesis-contracts/src/sidecarObservability.ts#L121)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [rebuildSynthesisSidecarDiscovery](../../../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts:350–456 | 重建 sidecar 发现记录，校验端点、身份指纹与就绪时间。 |
| [rebuildSynthesisSidecarLaunchConfig](../../../../../files/packages/synthesis-contracts/src/sidecarLifecycle.ts.md) | packages/synthesis-contracts/src/sidecarLifecycle.ts:171–348 | 重建 sidecar 启动配置，校验可执行文件绝对路径、平台目标与超时参数。 |

## 调用

该符号没有记录对外调用。
