
# scripts/content-package/prepare-content-package-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/prepare-content-package-release.ts -->

内容包发布准备脚本：校验工作区干净且远端 ref 包含当前 HEAD，提升内容版本，并可选择派发与观察 content-feed 工作流。
源码：[scripts/content-package/prepare-content-package-release.ts](../../../../../scripts/content-package/prepare-content-package-release.ts)

## 符号（7）
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:assertCleanWorkingTree -->
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:assertRemoteRefContainsHead -->
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:formatResult -->
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:main -->
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:nextCommands -->
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:parseContentPackageReleaseArgs -->
<!-- node: function:scripts/content-package/prepare-content-package-release.ts:prepareContentPackageRelease -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertCleanWorkingTree | 函数 | 145–155 | 简单 | assertion、git、release-gate | 0 | 断言 git 工作区没有未提交改动。 |
| assertRemoteRefContainsHead | 函数 | 157–174 | 简单 | assertion、git、release-gate | 0 | 断言远端 ref 已经包含本地 HEAD。 |
| formatResult | 函数 | 254–271 | 简单 | formatting、cli、release | 0 | 把发布准备结果格式化为可读输出。 |
| main | 函数 | 273–281 | 简单 | entry-point、cli、content-package | 0 | CLI 入口：解析参数并执行内容包发布准备。 |
| nextCommands | 函数 | 176–183 | 简单 | utility、release、cli | 0 | 生成发布后续需要人工执行的命令提示。 |
| parseContentPackageReleaseArgs | 函数 | 72–143 | 中等 | cli、parsing、release | 0 | 解析发布准备流程的全部 CLI 参数与默认值。 |
| prepareContentPackageRelease | 函数 | 185–252 | 中等 | release、orchestration、content-package | 0 | 主编排：前置校验 → 版本提升 → 可选派发并观察发布工作流。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [bump-content-package-version.ts](bump-content-package-version.ts.md) | scripts/content-package/bump-content-package-version.ts | 内容包版本提升工具：解析 patch/minor/major 或显式 semver 目标，强制单调递增后写回 content-package.version.json。 |
| [content-package-channels.ts](content-package-channels.ts.md) | scripts/content-package/content-package-channels.ts | 内容包发布频道的唯一事实源：定义 stable/beta/dev 频道枚举、解析与规范化，以及发布 ref 与所选频道范围的兼容校验。 |
| [github-workflow-run.ts](../github-workflow-run.ts.md) | scripts/github-workflow-run.ts | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseContentPackageReleaseArgs | 函数 | 72–143 | 解析发布准备流程的全部 CLI 参数与默认值。 |
| prepareContentPackageRelease | 函数 | 185–252 | 主编排：前置校验 → 版本提升 → 可选派发并观察发布工作流。 |
