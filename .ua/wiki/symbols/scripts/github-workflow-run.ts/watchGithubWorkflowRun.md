
# watchGithubWorkflowRun
<!-- node: function:scripts/github-workflow-run.ts:watchGithubWorkflowRun -->

以固定间隔轮询等待某次 workflow run 结束。
类型：函数  
复杂度：简单  
入边数：2  
标签：github、polling、orchestration  
所属文件：[scripts/github-workflow-run.ts](../../../files/scripts/github-workflow-run.ts.md)
源码：[scripts/github-workflow-run.ts:295](../../../../../scripts/github-workflow-run.ts#L295)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [prepareContentPackageRelease](../../../files/scripts/content-package/prepare-content-package-release.ts.md) | scripts/content-package/prepare-content-package-release.ts:185–252 | 主编排：前置校验 → 版本提升 → 可选派发并观察发布工作流。 |
| [dispatchHostBridgeRelease](../../../files/scripts/host-bridge/dispatch-host-bridge-release.ts.md) | scripts/host-bridge/dispatch-host-bridge-release.ts:176–254 | 主编排：本地门禁 → 派发 → 解析 run → 观察至完成。 |

## 调用

该符号没有记录对外调用。
