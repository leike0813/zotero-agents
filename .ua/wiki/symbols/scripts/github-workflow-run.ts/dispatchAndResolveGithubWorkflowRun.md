
# dispatchAndResolveGithubWorkflowRun
<!-- node: function:scripts/github-workflow-run.ts:dispatchAndResolveGithubWorkflowRun -->

派发工作流并立即解析出对应 run 的一体化入口。
类型：函数  
复杂度：中等  
入边数：5  
标签：github、orchestration、dispatch  
所属文件：[scripts/github-workflow-run.ts](../../../files/scripts/github-workflow-run.ts.md)
源码：[scripts/github-workflow-run.ts:186](../../../../../scripts/github-workflow-run.ts#L186)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [prepareContentPackageRelease](../../../files/scripts/content-package/prepare-content-package-release.ts.md) | scripts/content-package/prepare-content-package-release.ts:185–252 | 主编排：前置校验 → 版本提升 → 可选派发并观察发布工作流。 |
| [dispatchHostBridgeRelease](../../../files/scripts/host-bridge/dispatch-host-bridge-release.ts.md) | scripts/host-bridge/dispatch-host-bridge-release.ts:176–254 | 主编排：本地门禁 → 派发 → 解析 run → 观察至完成。 |
| [prebuildZoteroBridgeCli](../../../files/scripts/host-bridge/prebuild-zotero-bridge-cli.ts.md) | scripts/host-bridge/prebuild-zotero-bridge-cli.ts:212–346 | 主编排：状态校验 → 派发 → 观察 → 下载产物 → 同步预构建。 |
| [dispatchSynthesisSidecarPrebuild](../../../files/scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts:134–285 | 预构建主流程：派发 workflow、等待 run 完成、下载 artifact 并按目标三元组分发到本地 bundle store。 |
| [dispatchSynthesisSidecarRelease](../../../files/scripts/synthesis/dispatch-synthesis-sidecar-release.ts.md) | scripts/synthesis/dispatch-synthesis-sidecar-release.ts:46–101 | 以 release set 身份派发发布 workflow，并返回可追踪的 run 引用。 |

## 调用

该符号没有记录对外调用。
