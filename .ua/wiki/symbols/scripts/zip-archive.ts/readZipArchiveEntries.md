
# readZipArchiveEntries
<!-- node: function:scripts/zip-archive.ts:readZipArchiveEntries -->

读取 zip 中央目录，返回规范化后的条目列表与归档整体元信息。
类型：函数  
复杂度：中等  
入边数：3  
标签：zip、解析、入口  
所属文件：[scripts/zip-archive.ts](../../../files/scripts/zip-archive.ts.md)
源码：[scripts/zip-archive.ts:38](../../../../../scripts/zip-archive.ts#L38)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [verifyPluginHostBridgeAssets](../../../files/scripts/host-bridge/check-plugin-host-bridge-assets.ts.md) | scripts/host-bridge/check-plugin-host-bridge-assets.ts:171–341 | 主校验流程：逐项核对原生二进制与 skill bundle，汇总为结构化 issue 列表。 |
| [verifyArchiveSet](../../../files/scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts.md) | scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts:332–387 | 校验归档集合的 aggregate 与发布身份一致性。 |
| [readCandidateXpi](../system-e2e/acceptance.ts/readCandidateXpi.md) | scripts/system-e2e/acceptance.ts:27–106 | 读取候选 XPI 内的 manifest 与关键资产，缺失或版本不符即判定候选无效。 |

## 调用

该符号没有记录对外调用。
