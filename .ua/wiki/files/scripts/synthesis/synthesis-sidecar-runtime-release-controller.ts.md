
# scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts -->

runtime release 回执的状态机控制器：创建初始回执并按阶段推进状态，保证发布生命周期有唯一可追踪记录。
源码：[scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts](../../../../../scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts:advanceSynthesisSidecarRuntimeReleaseReceipt -->
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts:createSynthesisSidecarRuntimeReleaseReceipt -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| advanceSynthesisSidecarRuntimeReleaseReceipt | 函数 | 58–87 | 中等 | 状态机、回执、发布 | 0 | 按合法转移推进回执阶段，拒绝跳跃或重复推进并保留失败原因。 |
| createSynthesisSidecarRuntimeReleaseReceipt | 函数 | 33–56 | 简单 | 回执、发布、入口 | 0 | 创建初始 release 回执，绑定 release set 身份与起始阶段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesis-sidecar-runtime-release-set.ts](synthesis-sidecar-runtime-release-set.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-set.ts | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| advanceSynthesisSidecarRuntimeReleaseReceipt | 函数 | 58–87 | 按合法转移推进回执阶段，拒绝跳跃或重复推进并保留失败原因。 |
| createSynthesisSidecarRuntimeReleaseReceipt | 函数 | 33–56 | 创建初始 release 回执，绑定 release set 身份与起始阶段。 |
