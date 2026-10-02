
# getHostBridgeCliReleaseStatus
<!-- node: function:scripts/host-bridge/host-bridge-cli-release-governance.mjs:getHostBridgeCliReleaseStatus -->

汇总当前发布状态：版本、构建指纹与预构建缺口。
类型：函数  
复杂度：简单  
入边数：2  
标签：reporting、host-bridge、release-governance  
所属文件：[scripts/host-bridge/host-bridge-cli-release-governance.mjs](../../../../files/scripts/host-bridge/host-bridge-cli-release-governance.mjs.md)
源码：[scripts/host-bridge/host-bridge-cli-release-governance.mjs:328](../../../../../../scripts/host-bridge/host-bridge-cli-release-governance.mjs#L328)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [prebuildZoteroBridgeCli](../../../../files/scripts/host-bridge/prebuild-zotero-bridge-cli.ts.md) | scripts/host-bridge/prebuild-zotero-bridge-cli.ts:212–346 | 主编排：状态校验 → 派发 → 观察 → 下载产物 → 同步预构建。 |
| [syncHostBridgeCliPrebuilds](../../../../files/scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:559–653 | 主编排：拉取预构建 → 校验身份 → 替换资产树 → 提交变更。 |

## 调用

该符号没有记录对外调用。
