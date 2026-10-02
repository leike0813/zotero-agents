
# scripts/content-package/build-content-package-feed.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/build-content-package-feed.ts -->

内容包 feed 构建脚本：从 git 跟踪文件中收集内置工作流与 Skill 源码，打包 zip，并为 stable/beta/dev 各频道生成带 sha256 的 feed JSON。
源码：[scripts/content-package/build-content-package-feed.ts](../../../../../scripts/content-package/build-content-package-feed.ts)

## 符号（15）
<!-- node: function:scripts/content-package/build-content-package-feed.ts:collectFiles -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:collectSingleWorkflowEntries -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:collectSkillEntries -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:collectWorkflowEntries -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:collectWorkflowPackageEntries -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:isTrackedContentSourceFile -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:main -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:normalizeContentPackageFileBytes -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:normalizeRepoRelativePath -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:readContentVersionDescriptor -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:readGitRevision -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:readTrackedContentSourceFiles -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:resolveContentPackageBuildChannels -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:resolveContentPackageGeneratedAt -->
<!-- node: function:scripts/content-package/build-content-package-feed.ts:writeChannel -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectFiles | 函数 | 254–274 | 简单 | filesystem、content-package、traversal | 0 | 递归收集目录下应打包的内容文件。 |
| collectSingleWorkflowEntries | 函数 | 345–367 | 简单 | content-package、workflow、traversal | 0 | 收集单个工作流目录的 feed 条目。 |
| collectSkillEntries | 函数 | 405–432 | 简单 | content-package、skill、aggregation | 0 | 汇总内置 Skill 目录的 feed 条目。 |
| collectWorkflowEntries | 函数 | 369–403 | 简单 | content-package、workflow、aggregation | 0 | 汇总内置工作流包与单工作流的 feed 条目。 |
| collectWorkflowPackageEntries | 函数 | 284–343 | 中等 | content-package、workflow、traversal | 0 | 收集工作流包目录条目及其依赖声明。 |
| isTrackedContentSourceFile | 函数 | 63–74 | 简单 | content-package、filtering、validation | 0 | 判断某路径是否属于应进入内容包的工作流或 Skill 源文件。 |
| main | 函数 | 520–531 | 简单 | entry-point、cli、content-package | 0 | CLI 入口：解析参数后逐频道构建内容包 feed。 |
| normalizeContentPackageFileBytes | 函数 | 76–88 | 简单 | normalization、content-package、reproducibility | 0 | 归一化文件字节（统一换行），保证 feed 产物可复现。 |
| normalizeRepoRelativePath | 函数 | 56–61 | 简单 | utility、path、normalization | 0 | 把路径归一化为仓库相对的 posix 形式。 |
| readContentVersionDescriptor | 函数 | 191–234 | 简单 | content-package、versioning、parsing | 0 | 读取并解析 content-package.version.json 版本描述符。 |
| readGitRevision | 函数 | 112–129 | 简单 | git、utility、reproducibility | 0 | 读取当前 git 提交信息用于版本描述与生成时间。 |
| readTrackedContentSourceFiles | 函数 | 163–184 | 简单 | git、content-package、caching | 0 | 读取 git 跟踪文件集合，结果按进程缓存。 |
| resolveContentPackageBuildChannels | 函数 | 45–50 | 简单 | configuration、content-package、parsing | 0 | 解析 --channels 参数为规范化频道列表，默认 stable 与 dev。 |
| resolveContentPackageGeneratedAt | 函数 | 131–161 | 简单 | reproducibility、content-package、git | 0 | 解析 feed 的生成时间，优先取 git 提交时间以保证确定性。 |
| writeChannel | 函数 | 438–518 | 中等 | content-package、release、serialization | 0 | 生成并写入单个频道的 feed 文件与对应 zip 资产。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [content-package-channels.ts](content-package-channels.ts.md) | scripts/content-package/content-package-channels.ts | 内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。 |
| [contentPackageSubscription.ts](../../src/modules/workflow/catalog/contentPackageSubscription.ts.md) | src/modules/workflow/catalog/contentPackageSubscription.ts | 内容包订阅管理：解析并订阅用户声明的内容包来源，缓存索引、跟踪更新、计算订阅态与本地安装物，是工作流目录的数据入口。 |
| [package.json](../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [zipTransport.ts](../../src/providers/skillrunner/zipTransport.ts.md) | src/providers/skillrunner/zipTransport.ts | SkillRunner provider 的 zip 上传传输层：在 Zotero 沙箱内用纯 JS 构造 zip 与 multipart 负载，把 skill 包发送给旧版后端。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isTrackedContentSourceFile | 函数 | 63–74 | 判断某路径是否属于应进入内容包的工作流或 Skill 源文件。 |
| normalizeContentPackageFileBytes | 函数 | 76–88 | 归一化文件字节（统一换行），保证 feed 产物可复现。 |
| normalizeRepoRelativePath | 函数 | 56–61 | 把路径归一化为仓库相对的 posix 形式。 |
| resolveContentPackageBuildChannels | 函数 | 45–50 | 解析 --channels 参数为规范化频道列表，默认 stable 与 dev。 |
| resolveContentPackageGeneratedAt | 函数 | 131–161 | 解析 feed 的生成时间，优先取 git 提交时间以保证确定性。 |
