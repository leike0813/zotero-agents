
# scripts/github-workflow-run.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/github-workflow-run.ts -->

GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。
源码：[scripts/github-workflow-run.ts](../../../../scripts/github-workflow-run.ts)

## 符号（12）
<!-- node: function:scripts/github-workflow-run.ts:buildGithubWorkflowDispatchArgs -->
<!-- node: function:scripts/github-workflow-run.ts:buildGithubWorkflowRunListArgs -->
<!-- node: function:scripts/github-workflow-run.ts:createGithubWorkflowRequestId -->
<!-- node: function:scripts/github-workflow-run.ts:defaultCommandRunner -->
<!-- node: function:scripts/github-workflow-run.ts:dispatchAndResolveGithubWorkflowRun -->
<!-- node: function:scripts/github-workflow-run.ts:downloadGithubWorkflowArtifact -->
<!-- node: function:scripts/github-workflow-run.ts:listGithubWorkflowRuns -->
<!-- node: function:scripts/github-workflow-run.ts:parseWorkflowRuns -->
<!-- node: function:scripts/github-workflow-run.ts:resolveGithubWorkflowRun -->
<!-- node: function:scripts/github-workflow-run.ts:selectGithubWorkflowRun -->
<!-- node: function:scripts/github-workflow-run.ts:viewGithubWorkflowRun -->
<!-- node: function:scripts/github-workflow-run.ts:watchGithubWorkflowRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildGithubWorkflowDispatchArgs | 函数 | 91–110 | 简单 | github、cli、utility | 0 | 拼装 workflow_dispatch 所需的 gh CLI 参数。 |
| buildGithubWorkflowRunListArgs | 函数 | 112–130 | 简单 | github、cli、utility | 0 | 拼装查询 workflow run 列表的 gh CLI 参数。 |
| createGithubWorkflowRequestId | 函数 | 63–65 | 简单 | utility、github、identity | 0 | 生成带前缀的 request id，用于在 run 列表中精确定位本次派发。 |
| defaultCommandRunner | 函数 | 28–42 | 简单 | utility、process、github | 0 | 默认的 execFile 命令执行器，统一 maxBuffer 与错误处理。 |
| [dispatchAndResolveGithubWorkflowRun](../../symbols/scripts/github-workflow-run.ts/dispatchAndResolveGithubWorkflowRun.md) | 函数 | 186–244 | 中等 | github、orchestration、dispatch | 5 | 派发工作流并立即解析出对应 run 的一体化入口。 |
| downloadGithubWorkflowArtifact | 函数 | 309–328 | 简单 | github、artifact、download | 1 | 下载指定 run 的产物到本地目录。 |
| listGithubWorkflowRuns | 函数 | 132–145 | 简单 | github、network、query | 0 | 查询指定 workflow 的最近 run 列表。 |
| parseWorkflowRuns | 函数 | 48–61 | 简单 | parsing、github、serialization | 0 | 解析 gh run list 输出的 JSON 行。 |
| resolveGithubWorkflowRun | 函数 | 147–184 | 简单 | github、orchestration、polling | 0 | 轮询直到解析出目标 run，超时后输出诊断信息。 |
| selectGithubWorkflowRun | 函数 | 67–89 | 简单 | github、selection、validation | 1 | 从 run 列表中挑出 headSha 与 request id 都匹配的那次运行。 |
| viewGithubWorkflowRun | 函数 | 246–294 | 简单 | github、reporting、query | 1 | 拉取并格式化单次 workflow run 的详情。 |
| [watchGithubWorkflowRun](../../symbols/scripts/github-workflow-run.ts/watchGithubWorkflowRun.md) | 函数 | 295–307 | 简单 | github、polling、orchestration | 2 | 以固定间隔轮询等待某次 workflow run 结束。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dispatch-host-bridge-release.ts](host-bridge/dispatch-host-bridge-release.ts.md) | scripts/host-bridge/dispatch-host-bridge-release.ts | Host Bridge 正式发布派发脚本：确认 ref 必须是 main、不可变发布源可达且本地门禁通过后，派发并观察 release-host-bridge 工作流。 |
| [dispatch-synthesis-sidecar-prebuild.ts](synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts | Synthesis sidecar 预构建的 CI 分发入口：解析命令行参数、校验工作区无未提交改动后，通过 GitHub workflow dispatch 触发 prebuild 分支构建并拉取产物。 |
| [dispatch-synthesis-sidecar-release.ts](synthesis/dispatch-synthesis-sidecar-release.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-release.ts | 触发正式 runtime release 的 workflow dispatch 脚本，先校验 checkout 处于预期分支与干净状态，再派发发布流水线。 |
| [prebuild-zotero-bridge-cli.ts](host-bridge/prebuild-zotero-bridge-cli.ts.md) | scripts/host-bridge/prebuild-zotero-bridge-cli.ts | Host Bridge CLI 预构建的 CLI 入口：锁定发布身份并校验源码状态，派发七平台预构建工作流、下载产物并同步回本地预构建树。 |
| [prepare-content-package-release.ts](content-package/prepare-content-package-release.ts.md) | scripts/content-package/prepare-content-package-release.ts | 内容包发布准备脚本：校验工作区干净且远端 ref 包含当前 HEAD，提升内容版本，并可选择派发与观察 content-feed 工作流。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildGithubWorkflowDispatchArgs | 函数 | 91–110 | 拼装 workflow_dispatch 所需的 gh CLI 参数。 |
| buildGithubWorkflowRunListArgs | 函数 | 112–130 | 拼装查询 workflow run 列表的 gh CLI 参数。 |
| createGithubWorkflowRequestId | 函数 | 63–65 | 生成带前缀的 request id，用于在 run 列表中精确定位本次派发。 |
| defaultCommandRunner | 函数 | 28–42 | 默认的 execFile 命令执行器，统一 maxBuffer 与错误处理。 |
| [dispatchAndResolveGithubWorkflowRun](../../symbols/scripts/github-workflow-run.ts/dispatchAndResolveGithubWorkflowRun.md) | 函数 | 186–244 | 派发工作流并立即解析出对应 run 的一体化入口。 |
| downloadGithubWorkflowArtifact | 函数 | 309–328 | 下载指定 run 的产物到本地目录。 |
| resolveGithubWorkflowRun | 函数 | 147–184 | 轮询直到解析出目标 run，超时后输出诊断信息。 |
| selectGithubWorkflowRun | 函数 | 67–89 | 从 run 列表中挑出 headSha 与 request id 都匹配的那次运行。 |
| viewGithubWorkflowRun | 函数 | 246–294 | 拉取并格式化单次 workflow run 的详情。 |
| [watchGithubWorkflowRun](../../symbols/scripts/github-workflow-run.ts/watchGithubWorkflowRun.md) | 函数 | 295–307 | 以固定间隔轮询等待某次 workflow run 结束。 |
