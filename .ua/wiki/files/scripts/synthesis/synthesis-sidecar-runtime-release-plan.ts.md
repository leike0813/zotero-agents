
# scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts -->

把 release set 展开为可执行的 release plan，列出每个目标三元组及其对应的预构建结果。
源码：[scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts](../../../../../scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts)

## 符号（1）
<!-- node: function:scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts:createSynthesisSidecarRuntimeReleasePlan -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createSynthesisSidecarRuntimeReleasePlan | 函数 | 10–35 | 中等 | 发布、计划、入口 | 0 | 从 release set 构造发布计划，逐目标绑定预构建结果与发布顺序。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesis-sidecar-runtime-release-set.ts](synthesis-sidecar-runtime-release-set.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-set.ts | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createSynthesisSidecarRuntimeReleasePlan | 函数 | 10–35 | 从 release set 构造发布计划，逐目标绑定预构建结果与发布顺序。 |
