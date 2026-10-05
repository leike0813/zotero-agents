
# scripts/content-package/content-package-channels.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/content-package-channels.ts -->

内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。
源码：[scripts/content-package/content-package-channels.ts](../../../../../scripts/content-package/content-package-channels.ts)

## 符号（3）
<!-- node: function:scripts/content-package/content-package-channels.ts:canonicalizeContentPackageChannels -->
<!-- node: function:scripts/content-package/content-package-channels.ts:parseContentPackageChannels -->
<!-- node: function:scripts/content-package/content-package-channels.ts:validateContentPackagePublicationScope -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canonicalizeContentPackageChannels | 函数 | 15–33 | 简单 | normalization、validation、content-package | 1 | 规范化频道列表并按固定顺序输出，非法输入直接抛错。 |
| parseContentPackageChannels | 函数 | 35–39 | 简单 | parsing、content-package、cli | 1 | 解析逗号分隔的 --channels 参数。 |
| validateContentPackagePublicationScope | 函数 | 41–55 | 简单 | validation、release-gate、content-package | 0 | 校验发布 ref 与所选频道是否兼容，正式发布只允许 stable。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [build-content-package-feed.ts](build-content-package-feed.ts.md) | scripts/content-package/build-content-package-feed.ts | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [check-content-package-release.ts](check-content-package-release.ts.md) | scripts/content-package/check-content-package-release.ts | 内容包发布校验脚本：拉取 GitHub 上的 feed 与 release 资产，与本地重建结果交叉比对包签名、sha256 和字节数，确保已发布内容与仓库一致。 |
| [prepare-content-package-release.ts](prepare-content-package-release.ts.md) | scripts/content-package/prepare-content-package-release.ts | 内容包发布准备脚本：校验工作区干净且远端 ref 包含当前 HEAD，提升内容版本，并可选择派发与观察 content-feed 工作流。 |
| [publish-content-package-feeds.ts](publish-content-package-feeds.ts.md) | scripts/content-package/publish-content-package-feeds.ts | 内容包 feed 发布脚本：把构建好的 feed 资产提交并推送到 content-feed 分支，支持多频道与镜像仓库，并生成该分支的索引 README。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| canonicalizeContentPackageChannels | 函数 | 15–33 | 规范化频道列表并按固定顺序输出，非法输入直接抛错。 |
| parseContentPackageChannels | 函数 | 35–39 | 解析逗号分隔的 --channels 参数。 |
| validateContentPackagePublicationScope | 函数 | 41–55 | 校验发布 ref 与所选频道是否兼容，正式发布只允许 stable。 |
