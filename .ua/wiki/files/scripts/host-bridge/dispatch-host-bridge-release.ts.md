
# scripts/host-bridge/dispatch-host-bridge-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/dispatch-host-bridge-release.ts -->

Host Bridge 正式发布派发脚本：确认 ref 必须是 main、不可变发布源可达且本地门禁通过后，派发并观察 release-host-bridge 工作流。
源码：[scripts/host-bridge/dispatch-host-bridge-release.ts](../../../../../scripts/host-bridge/dispatch-host-bridge-release.ts)

## 符号（9）
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:assertDispatchPreconditions -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:assertPublicationSourceIsReachable -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:dispatchHostBridgeRelease -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:main -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:readImmutablePublicationSource -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:resolveHostBridgePublicationRef -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:resolvePublicationSource -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:runLocalGates -->
<!-- node: function:scripts/host-bridge/dispatch-host-bridge-release.ts:selectDispatchedHostBridgeRun -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertDispatchPreconditions | 函数 | 65–84 | 简单 | assertion、validation、release-gate | 0 | 断言派发前置条件：ref、request id 与 prebuild 要求均满足。 |
| assertPublicationSourceIsReachable | 函数 | 111–127 | 简单 | assertion、git、release-gate | 0 | 断言发布源 commit 在远端确实可达。 |
| dispatchHostBridgeRelease | 函数 | 176–254 | 中等 | release、orchestration、host-bridge | 0 | 主编排：本地门禁 → 派发 → 解析 run → 观察至完成。 |
| main | 函数 | 256–267 | 简单 | entry-point、cli、host-bridge | 0 | CLI 入口：解析参数后派发 Host Bridge 正式发布。 |
| readImmutablePublicationSource | 函数 | 48–63 | 简单 | release、manifest、host-bridge | 0 | 从发布 manifest 中读取不可变的发布源 commit。 |
| resolveHostBridgePublicationRef | 函数 | 24–30 | 简单 | validation、release-gate、host-bridge | 0 | 强制正式发布只能使用 main 分支作为 ref。 |
| resolvePublicationSource | 函数 | 86–109 | 简单 | release、git、host-bridge | 0 | 解析发布源 commit 及其远端可达性。 |
| runLocalGates | 函数 | 129–174 | 简单 | validation、release-gate、orchestration | 0 | 依次执行本地门禁命令并汇总任何失败。 |
| selectDispatchedHostBridgeRun | 函数 | 32–46 | 简单 | github、selection、host-bridge | 0 | 在 run 列表中定位刚派发的 Host Bridge 发布运行。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [github-workflow-run.ts](../github-workflow-run.ts.md) | scripts/github-workflow-run.ts | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| dispatchHostBridgeRelease | 函数 | 176–254 | 主编排：本地门禁 → 派发 → 解析 run → 观察至完成。 |
| readImmutablePublicationSource | 函数 | 48–63 | 从发布 manifest 中读取不可变的发布源 commit。 |
| resolveHostBridgePublicationRef | 函数 | 24–30 | 强制正式发布只能使用 main 分支作为 ref。 |
| selectDispatchedHostBridgeRun | 函数 | 32–46 | 在 run 列表中定位刚派发的 Host Bridge 发布运行。 |
