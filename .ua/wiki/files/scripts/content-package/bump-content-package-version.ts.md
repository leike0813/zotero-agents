
# scripts/content-package/bump-content-package-version.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/bump-content-package-version.ts -->

内容包版本提升工具：解析 patch/minor/major 或显式 semver 目标，强制单调递增后写回 content-package.version.json。
源码：[scripts/content-package/bump-content-package-version.ts](../../../../../scripts/content-package/bump-content-package-version.ts)

## 符号（2）
<!-- node: function:scripts/content-package/bump-content-package-version.ts:bumpContentPackageVersion -->
<!-- node: function:scripts/content-package/bump-content-package-version.ts:resolveContentPackageVersionBump -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bumpContentPackageVersion | 函数 | 37–59 | 简单 | versioning、content-package、filesystem | 1 | 读取版本文件、执行版本提升并回写。 |
| resolveContentPackageVersionBump | 函数 | 9–35 | 简单 | versioning、validation、utility | 0 | 解析并校验目标版本递增量，拒绝非法或非递增的目标版本。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [prepare-content-package-release.ts](prepare-content-package-release.ts.md) | scripts/content-package/prepare-content-package-release.ts | 内容包发布准备脚本：校验工作区干净且远端 ref 包含当前 HEAD，提升内容版本，并可选择派发与观察 content-feed 工作流。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bumpContentPackageVersion | 函数 | 37–59 | 读取版本文件、执行版本提升并回写。 |
| resolveContentPackageVersionBump | 函数 | 9–35 | 解析并校验目标版本递增量，拒绝非法或非递增的目标版本。 |
