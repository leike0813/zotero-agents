
# scripts/sync-gitee-publication.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/sync-gitee-publication.ts -->

把插件发布物与工作流包同步到 Gitee 的发布脚本，负责 release 资产下载校验、插件引用推送以及工作流 feed 分支更新。
源码：[scripts/sync-gitee-publication.ts](../../../../scripts/sync-gitee-publication.ts)

## 符号（12）
<!-- node: function:scripts/sync-gitee-publication.ts:assertRemoteRef -->
<!-- node: function:scripts/sync-gitee-publication.ts:downloadReleaseAssets -->
<!-- node: function:scripts/sync-gitee-publication.ts:filesIn -->
<!-- node: function:scripts/sync-gitee-publication.ts:parseGiteePublicationArgs -->
<!-- node: function:scripts/sync-gitee-publication.ts:pushPluginRefsToGitee -->
<!-- node: function:scripts/sync-gitee-publication.ts:pushWorkflowFeedBranchToGitee -->
<!-- node: function:scripts/sync-gitee-publication.ts:readGiteeToken -->
<!-- node: function:scripts/sync-gitee-publication.ts:releaseMetadata -->
<!-- node: function:scripts/sync-gitee-publication.ts:runGiteeReleaseSync -->
<!-- node: function:scripts/sync-gitee-publication.ts:syncGiteePublication -->
<!-- node: function:scripts/sync-gitee-publication.ts:syncPluginRelease -->
<!-- node: function:scripts/sync-gitee-publication.ts:syncWorkflowPackage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertRemoteRef | 函数 | 159–176 | 简单 | script、tooling、build-system | 0 | 校验远端 ref 存在且指向预期 commit，避免推送覆盖他人提交。 |
| downloadReleaseAssets | 函数 | 214–234 | 简单 | script、tooling、build-system | 0 | 下载 Gitee Release 资产到本地目录并返回下载结果清单。 |
| filesIn | 函数 | 200–212 | 简单 | script、tooling、build-system | 0 | 递归列出目录内文件清单，供打包与清理使用。 |
| parseGiteePublicationArgs | 函数 | 40–99 | 中等 | script、tooling、build-system | 0 | 解析命令行参数，判定执行模式是仅推引用、仅同步发布物还是全量同步。 |
| pushPluginRefsToGitee | 函数 | 270–284 | 简单 | script、tooling、build-system | 0 | 把插件 tags 与分支引用推送到 Gitee 远端。 |
| pushWorkflowFeedBranchToGitee | 函数 | 349–376 | 中等 | script、tooling、build-system | 0 | 把工作流 feed 分支强制推送到 Gitee，保持订阅源最新。 |
| readGiteeToken | 函数 | 146–153 | 简单 | script、tooling、build-system | 0 | 从环境变量或参数读取 Gitee 访问令牌，缺失时直接失败。 |
| releaseMetadata | 函数 | 183–194 | 简单 | script、tooling、build-system | 0 | 生成 Release 元数据，解析版本、说明与产物路径。 |
| runGiteeReleaseSync | 函数 | 236–268 | 中等 | script、tooling、build-system | 0 | 驱动 Gitee Release 同步流程，串联资产校验、下载与引用推送。 |
| syncGiteePublication | 函数 | 416–431 | 简单 | script、tooling、build-system | 0 | 发布同步的顶层编排函数，串联插件发布与工作流包同步两个子任务。 |
| syncPluginRelease | 函数 | 286–347 | 复杂 | script、tooling、build-system | 0 | 同步插件发布资产到 Gitee Release 并校验远端 tag 指向。 |
| syncWorkflowPackage | 函数 | 378–414 | 中等 | script、tooling、build-system | 0 | 同步单个工作流包目录到 Gitee 远端并清理目标分支残留文件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseGiteePublicationArgs | 函数 | 40–99 | 解析命令行参数，判定执行模式是仅推引用、仅同步发布物还是全量同步。 |
| syncGiteePublication | 函数 | 416–431 | 发布同步的顶层编排函数，串联插件发布与工作流包同步两个子任务。 |
