
# scripts/synthesis/dispatch-synthesis-sidecar-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/dispatch-synthesis-sidecar-release.ts -->

触发正式 runtime release 的 workflow dispatch 脚本，先校验 checkout 处于预期分支与干净状态，再派发发布流水线。
源码：[scripts/synthesis/dispatch-synthesis-sidecar-release.ts](../../../../../scripts/synthesis/dispatch-synthesis-sidecar-release.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-release.ts:assertSynthesisSidecarReleaseDispatchCheckout -->
<!-- node: function:scripts/synthesis/dispatch-synthesis-sidecar-release.ts:dispatchSynthesisSidecarRelease -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertSynthesisSidecarReleaseDispatchCheckout | 函数 | 20–44 | 中等 | validation、git、发布 | 0 | 断言当前 checkout 满足发布派发前提：分支正确、工作区无未提交变更。 |
| dispatchSynthesisSidecarRelease | 函数 | 46–101 | 中等 | ci-cd、发布、编排 | 0 | 以 release set 身份派发发布 workflow，并返回可追踪的 run 引用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [github-workflow-run.ts](../github-workflow-run.ts.md) | scripts/github-workflow-run.ts | GitHub Actions 工作流编排工具：派发 workflow_dispatch、按 request id 精确解析出对应 run，并支持查看、轮询等待与下载产物。 |
| [synthesis-sidecar-runtime-release-set.ts](synthesis-sidecar-runtime-release-set.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-set.ts | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| assertSynthesisSidecarReleaseDispatchCheckout | 函数 | 20–44 | 断言当前 checkout 满足发布派发前提：分支正确、工作区无未提交变更。 |
| dispatchSynthesisSidecarRelease | 函数 | 46–101 | 以 release set 身份派发发布 workflow，并返回可追踪的 run 引用。 |
