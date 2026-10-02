
# readHostBridgeCliReleaseManifest
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:readHostBridgeCliReleaseManifest -->

读取仓库中的 Host Bridge CLI release manifest。
类型：函数  
复杂度：简单  
入边数：2  
标签：manifest、host-bridge、filesystem  
所属文件：[scripts/host-bridge/host-bridge-cli-release-governance.mjs](../../../../files/scripts/host-bridge/host-bridge-cli-release-governance.mjs.md)
源码：[scripts/host-bridge/host-bridge-cli-release-governance.mjs:316](../../../../../../scripts/host-bridge/host-bridge-cli-release-governance.mjs#L316)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [checkHostBridgeCliPrebuildFreshness](../../../../files/scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs.md) | scripts/host-bridge/check-host-bridge-cli-prebuild-freshness.mjs:54–197 | 主流程：计算构建指纹并逐平台核对二进制与 manifest，输出 JSON 诊断。 |
| [syncHostBridgeCliPrebuilds](../../../../files/scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:559–653 | 主编排：拉取预构建 → 校验身份 → 替换资产树 → 提交变更。 |

## 调用

该符号没有记录对外调用。
