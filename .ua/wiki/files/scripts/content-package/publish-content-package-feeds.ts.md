
# scripts/content-package/publish-content-package-feeds.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/publish-content-package-feeds.ts -->

内容包 feed 发布脚本：把构建好的 feed 资产提交并推送到 content-feed 分支，支持多频道与镜像仓库，并生成该分支的索引 README。
源码：[scripts/content-package/publish-content-package-feeds.ts](../../../../../scripts/content-package/publish-content-package-feeds.ts)

## 符号（3）
<!-- node: function:scripts/content-package/publish-content-package-feeds.ts:main -->
<!-- node: function:scripts/content-package/publish-content-package-feeds.ts:publishContentPackageFeeds -->
<!-- node: function:scripts/content-package/publish-content-package-feeds.ts:readme -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 177–197 | 简单 | entry-point、cli、content-package | 0 | CLI 入口：解析频道与目标仓库后执行 feed 发布。 |
| publishContentPackageFeeds | 函数 | 77–175 | 中等 | release、content-package、git | 0 | 克隆或初始化 feed 仓库、写入各频道资产、提交并推送。 |
| readme | 函数 | 64–75 | 简单 | documentation、content-package、generation | 0 | 生成 content-feed 分支上的 README 索引内容。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [content-package-channels.ts](content-package-channels.ts.md) | scripts/content-package/content-package-channels.ts | 内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| publishContentPackageFeeds | 函数 | 77–175 | 克隆或初始化 feed 仓库、写入各频道资产、提交并推送。 |
