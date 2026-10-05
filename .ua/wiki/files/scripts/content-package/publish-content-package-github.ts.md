
# scripts/content-package/publish-content-package-github.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/publish-content-package-github.ts -->

内容包发布脚本：解析发布参数、计算资产 SHA-256，并通过 gh CLI 把工作流包资产上传到 GitHub Release。
源码：[scripts/content-package/publish-content-package-github.ts](../../../../../scripts/content-package/publish-content-package-github.ts)

## 符号（4）
<!-- node: function:scripts/content-package/publish-content-package-github.ts:parseGithubContentPublicationArgs -->
<!-- node: function:scripts/content-package/publish-content-package-github.ts:publishContentPackageToGithub -->
<!-- node: function:scripts/content-package/publish-content-package-github.ts:releaseAssets -->
<!-- node: function:scripts/content-package/publish-content-package-github.ts:run -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| parseGithubContentPublicationArgs | 函数 | 23–50 | 简单 | release、parsing、content-package、cli | 0 | 解析内容包发布命令行参数，得到 tag、资产路径与仓库等发布选项。 |
| publishContentPackageToGithub | 函数 | 93–153 | 中等 | release、github、content-package、upload | 0 | 把内容包资产发布到指定 GitHub Release：创建或复用 release、上传资产并校验上传结果。 |
| releaseAssets | 函数 | 64–85 | 简单 | release、asset、checksum、content-package | 0 | 整理待上传的发布资产清单并计算各资产的 SHA-256 摘要。 |
| run | 函数 | 52–62 | 简单 | utility、process、cli、wrapper | 0 | 同步执行外部命令并透传 stdio，用于包装 gh CLI 调用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseGithubContentPublicationArgs | 函数 | 23–50 | 解析内容包发布命令行参数，得到 tag、资产路径与仓库等发布选项。 |
| publishContentPackageToGithub | 函数 | 93–153 | 把内容包资产发布到指定 GitHub Release：创建或复用 release、上传资产并校验上传结果。 |
