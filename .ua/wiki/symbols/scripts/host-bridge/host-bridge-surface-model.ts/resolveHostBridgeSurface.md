
# resolveHostBridgeSurface
<!-- node: function:scripts/host-bridge/host-bridge-surface-model.ts:resolveHostBridgeSurface -->

按身份解析 surface 定义，未命中时报错而不是静默回退。
类型：函数  
复杂度：中等  
入边数：2  
标签：lookup、contract、validation  
所属文件：[scripts/host-bridge/host-bridge-surface-model.ts](../../../../files/scripts/host-bridge/host-bridge-surface-model.ts.md)
源码：[scripts/host-bridge/host-bridge-surface-model.ts:217](../../../../../../scripts/host-bridge/host-bridge-surface-model.ts#L217)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [verifyPluginHostBridgeAssets](../../../../files/scripts/host-bridge/check-plugin-host-bridge-assets.ts.md) | scripts/host-bridge/check-plugin-host-bridge-assets.ts:171–341 | 主校验流程：逐项核对原生二进制与 skill bundle，汇总为结构化 issue 列表。 |
| [buildHostBridgeReleaseSet](../../../../files/scripts/host-bridge/host-bridge-release-set.ts.md) | scripts/host-bridge/host-bridge-release-set.ts:191–300 | 构建 release set：合并发布身份、surface 版本、变更分类与内容摘要，产出单一发布事实源。 |

## 调用

该符号没有记录对外调用。
