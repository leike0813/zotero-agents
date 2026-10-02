
# scripts/content-package
> 目录聚合页：11 个文件、48 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [scripts/content-package/build-canonical-literature-validators.ts](../../files/scripts/content-package/build-canonical-literature-validators.ts.md) | 文件 | 0 | 为 canonical literature 工作流包生成校验器配置，把契约定义编译成内容包可消费的验证规则。 |
| [scripts/content-package/build-content-package-feed.ts](../../files/scripts/content-package/build-content-package-feed.ts.md) | 文件 | 15 | 内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。 |
| [scripts/content-package/build-literature-deep-reading-graph-renderer.ts](../../files/scripts/content-package/build-literature-deep-reading-graph-renderer.ts.md) | 文件 | 1 | 构建 literature-deep-reading 内容包的图渲染器：把 workbench 文案的 i18n envelope 注入渲染器源码并输出到内容包目录。 |
| [scripts/content-package/bump-content-package-version.ts](../../files/scripts/content-package/bump-content-package-version.ts.md) | 文件 | 2 | 内容包版本提升工具：解析 patch/minor/major 或显式 semver 目标，强制单调递增后写回 content-package.version.json。 |
| [scripts/content-package/check-builtin-workflow-manifest.ts](../../files/scripts/content-package/check-builtin-workflow-manifest.ts.md) | 文件 | 2 | 校验内置工作流包清单与实际文件树是否一致，检查路径规范化、必需文件存在性与清单条目匹配。 |
| [scripts/content-package/check-content-package-release.ts](../../files/scripts/content-package/check-content-package-release.ts.md) | 文件 | 11 | 内容包发布校验脚本：拉取 GitHub 上的 feed 与 release 资产，与本地重建结果交叉比对包签名、sha256 和字节数，确保已发布内容与仓库一致。 |
| [scripts/content-package/content-package-channels.ts](../../files/scripts/content-package/content-package-channels.ts.md) | 文件 | 3 | 内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。 |
| [scripts/content-package/prepare-content-package-release.ts](../../files/scripts/content-package/prepare-content-package-release.ts.md) | 文件 | 7 | 内容包发布准备脚本：校验工作区干净且远端 ref 包含当前 HEAD，提升内容版本，并可选择派发与观察 content-feed 工作流。 |
| [scripts/content-package/publish-content-package-feeds.ts](../../files/scripts/content-package/publish-content-package-feeds.ts.md) | 文件 | 3 | 内容包 feed 发布脚本：把构建好的 feed 资产提交并推送到 content-feed 分支，支持多频道与镜像仓库，并生成该分支的索引 README。 |
| [scripts/content-package/publish-content-package-github.ts](../../files/scripts/content-package/publish-content-package-github.ts.md) | 文件 | 4 | 内容包发布脚本：解析发布参数、计算资产 SHA-256，并通过 gh CLI 把工作流包资产上传到 GitHub Release。 |
| [scripts/content-package/publish-skills.ps1](../../files/scripts/content-package/publish-skills.ps1.md) | 文件 | 0 | PowerShell 编写的 Skill 包发布脚本，负责组装 skills 资产、生成摘要并在 Windows 上完成上传。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [.](../index.md) | 1 |
| [scripts](../scripts.md) | 1 |
| [src/modules/harness](../src/modules/harness.md) | 1 |
| [src/modules/workflow/catalog](../src/modules/workflow/catalog.md) | 1 |
| [src/providers/skillrunner](../src/providers/skillrunner.md) | 1 |
