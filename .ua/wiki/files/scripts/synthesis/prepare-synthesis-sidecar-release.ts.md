
# scripts/synthesis/prepare-synthesis-sidecar-release.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/prepare-synthesis-sidecar-release.ts -->

正式发布前的准备脚本：确认 git 状态与校验结果齐备，生成 release plan 与 release set 作为后续派发的输入。
源码：[scripts/synthesis/prepare-synthesis-sidecar-release.ts](../../../../../scripts/synthesis/prepare-synthesis-sidecar-release.ts)

## 符号（1）
<!-- node: function:scripts/synthesis/prepare-synthesis-sidecar-release.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 23–72 | 中等 | 入口、发布、cli | 0 | 准备入口：读取校验结论与预构建集合，输出最终 release set 与 plan。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [resolve-synthesis-sidecar-verification.ts](resolve-synthesis-sidecar-verification.ts.md) | scripts/synthesis/resolve-synthesis-sidecar-verification.ts | 解析并重新验证 sidecar runtime 的校验回执：只接受可信来源的 verification result，并按当前内容重新核对身份与指纹。 |
| [sidecarRuntimeRelease.ts](../../packages/synthesis-contracts/src/sidecarRuntimeRelease.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeRelease.ts | 定义 Synthesis sidecar 运行时发布治理的跨语言契约：prebuild 集合/结果、verification 结果、release set 与 receipt 的 schema 常量及严格重建与一致性断言。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |
| [synthesis-sidecar-runtime-release-set.ts](synthesis-sidecar-runtime-release-set.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-set.ts | 定义 runtime release set 的文件布局与读写：集中 release set 与 receipt 的路径常量，并提供从磁盘读取校验的入口。 |
