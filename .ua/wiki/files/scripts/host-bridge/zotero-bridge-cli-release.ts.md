
# scripts/host-bridge/zotero-bridge-cli-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/zotero-bridge-cli-release.ts -->

声明 Host Bridge CLI 预编译二进制的发布身份（七平台目录与身份文件），供 release set 渲染与校验引用。
源码：[scripts/host-bridge/zotero-bridge-cli-release.ts](../../../../../scripts/host-bridge/zotero-bridge-cli-release.ts)

## 符号（1）
<!-- node: function:scripts/host-bridge/zotero-bridge-cli-release.ts:readZoteroBridgeCliRelease -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| readZoteroBridgeCliRelease | 函数 | 15–34 | 简单 | loading、release、validation | 1 | 读取并校验 CLI 发布身份文件，返回七平台二进制目录与版本信息。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [render-host-bridge-release-set.ts](render-host-bridge-release-set.ts.md) | scripts/host-bridge/render-host-bridge-release-set.ts | 渲染 Host Bridge release set 文档：把发布身份、surface 目录与 CLI 发布信息写成受治理的发布清单工件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| readZoteroBridgeCliRelease | 函数 | 15–34 | 读取并校验 CLI 发布身份文件，返回七平台二进制目录与版本信息。 |
