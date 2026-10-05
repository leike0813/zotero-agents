
# scripts/release-coordinator-gate.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/release-coordinator-gate.ts -->

发布协调门禁：比对本地与远端 main/tag/GitHub Release 状态，判定 Host Bridge 与内容包的发布阻塞项，并给出下一步动作与建议命令。
源码：[scripts/release-coordinator-gate.ts](../../../../scripts/release-coordinator-gate.ts)

## 符号（10）
<!-- node: function:scripts/release-coordinator-gate.ts:analyzeReleaseGate -->
<!-- node: function:scripts/release-coordinator-gate.ts:collectChangedFiles -->
<!-- node: function:scripts/release-coordinator-gate.ts:inspectRemote -->
<!-- node: function:scripts/release-coordinator-gate.ts:parseGitHubReleaseState -->
<!-- node: function:scripts/release-coordinator-gate.ts:parseReleaseGateCliArgs -->
<!-- node: function:scripts/release-coordinator-gate.ts:parseRemoteMainState -->
<!-- node: function:scripts/release-coordinator-gate.ts:parseTagState -->
<!-- node: function:scripts/release-coordinator-gate.ts:resolveNextAction -->
<!-- node: function:scripts/release-coordinator-gate.ts:runOptional -->
<!-- node: function:scripts/release-coordinator-gate.ts:suggestedCommands -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| analyzeReleaseGate | 函数 | 427–659 | 复杂 | release、gate、governance、entry-point、ci | 0 | 发布门禁分析主流程：检查工作区洁净度、远端同步、Host Bridge 与内容包资产完整性，输出结构化 blocker 列表与下一步动作。 |
| collectChangedFiles | 函数 | 237–264 | 中等 | git、discovery、release、diff | 0 | 收集目标分支相对本地的变更文件，用于判断 Host Bridge 与内容包是否需要重新发布。 |
| inspectRemote | 函数 | 322–350 | 中等 | release、github、git、aggregation | 0 | 汇总远端 main、tag 与 GitHub Release 状态，形成统一的远端视图。 |
| parseGitHubReleaseState | 函数 | 307–320 | 简单 | github、parsing、release、state | 0 | 解析 gh 查询到的 GitHub Release 状态，识别草稿、已发布或缺失的发布。 |
| parseReleaseGateCliArgs | 函数 | 670–715 | 中等 | parsing、release、cli、utility | 0 | 解析发布门禁命令行参数，得到目标版本、远端信息与运行模式选项。 |
| parseRemoteMainState | 函数 | 266–290 | 中等 | git、parsing、release、branch-state | 0 | 解析远端 main 分支的 ahead/behind 与最新提交信息，作为发布同步状态依据。 |
| parseTagState | 函数 | 292–305 | 简单 | git、parsing、release、tag | 0 | 解析目标版本 tag 的存在性与指向提交，判断是否需要新建 tag。 |
| resolveNextAction | 函数 | 361–396 | 中等 | release、gate、decision、workflow | 0 | 根据阻塞项列表推导发布流程的下一步动作。 |
| runOptional | 函数 | 218–235 | 简单 | utility、process、gate、wrapper | 0 | 执行可选的外部命令并返回退出码与输出，命令缺失时视为无结果而非失败。 |
| suggestedCommands | 函数 | 398–425 | 中等 | release、developer-experience、gate、cli | 0 | 为每个阻塞项生成可直接执行的建议命令，降低发布协调的人工成本。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| analyzeReleaseGate | 函数 | 427–659 | 发布门禁分析主流程：检查工作区洁净度、远端同步、Host Bridge 与内容包资产完整性，输出结构化 blocker 列表与下一步动作。 |
| parseReleaseGateCliArgs | 函数 | 670–715 | 解析发布门禁命令行参数，得到目标版本、远端信息与运行模式选项。 |
