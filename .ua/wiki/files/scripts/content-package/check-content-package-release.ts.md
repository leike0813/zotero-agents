
# scripts/content-package/check-content-package-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/check-content-package-release.ts -->

内容包发布校验脚本：拉取 GitHub 上的 feed 与 release 资产，与本地重建结果交叉比对包签名、sha256 和字节数，确保已发布内容与仓库一致。
源码：[scripts/content-package/check-content-package-release.ts](../../../../../scripts/content-package/check-content-package-release.ts)

## 符号（11）
<!-- node: function:scripts/content-package/check-content-package-release.ts:assertSameSignature -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:contentPackageAssetUrls -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:contentPackageMirrorAssetUrls -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:fetchGitHubContentJson -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:fetchGitHubFeed -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:main -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:packageSignature -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:parseContentPackageCheckArgs -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:runBuildContentFeeds -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:verifyContentPackageRelease -->
<!-- node: function:scripts/content-package/check-content-package-release.ts:verifyReleaseAssets -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSameSignature | 函数 | 251–263 | 简单 | assertion、validation、content-package | 0 | 断言两份 feed 中同一包的签名一致。 |
| contentPackageAssetUrls | 函数 | 118–122 | 简单 | utility、content-package、asset | 0 | 列出某个包的主资产 URL。 |
| contentPackageMirrorAssetUrls | 函数 | 124–128 | 简单 | utility、content-package、asset | 0 | 列出某个包的镜像资产 URL。 |
| fetchGitHubContentJson | 函数 | 158–180 | 简单 | network、github、fetch | 0 | 通过 GitHub Contents API 拉取并解析 JSON 文件。 |
| fetchGitHubFeed | 函数 | 182–197 | 简单 | network、content-package、fetch | 0 | 拉取指定频道已发布的 feed JSON。 |
| main | 函数 | 428–437 | 简单 | entry-point、cli、content-package | 0 | CLI 入口：解析参数后执行内容包发布校验。 |
| packageSignature | 函数 | 103–116 | 简单 | hashing、content-package、comparison | 0 | 计算 feed 中某个包的可比签名，用于跨源比对。 |
| parseContentPackageCheckArgs | 函数 | 62–91 | 简单 | cli、parsing、content-package | 0 | 解析校验脚本的 CLI 参数（频道、仓库、ref 等）。 |
| runBuildContentFeeds | 函数 | 199–249 | 中等 | build-system、content-package、comparison | 0 | 在临时目录本地重建 feed，作为发布内容的对照样本。 |
| verifyContentPackageRelease | 函数 | 300–426 | 中等 | validation、release-gate、content-package | 0 | 主校验流程：拉取远端 feed 与资产、本地重建、交叉比对签名与摘要。 |
| verifyReleaseAssets | 函数 | 265–298 | 简单 | validation、hashing、content-package | 0 | 逐个资产校验 sha256 与字节数是否与 feed 声明一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [content-package-channels.ts](content-package-channels.ts.md) | scripts/content-package/content-package-channels.ts | 内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseContentPackageCheckArgs | 函数 | 62–91 | 解析校验脚本的 CLI 参数（频道、仓库、ref 等）。 |
| verifyContentPackageRelease | 函数 | 300–426 | 主校验流程：拉取远端 feed 与资产、本地重建、交叉比对签名与摘要。 |
