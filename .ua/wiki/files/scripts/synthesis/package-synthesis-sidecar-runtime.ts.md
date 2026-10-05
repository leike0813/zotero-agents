
# scripts/synthesis/package-synthesis-sidecar-runtime.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/package-synthesis-sidecar-runtime.ts -->

Synthesis sidecar runtime 的打包 CLI：按平台目标收集 Rust 构建产物、清单与指针文件，组装成可分发的 bundle 目录。
源码：[scripts/synthesis/package-synthesis-sidecar-runtime.ts](../../../../../scripts/synthesis/package-synthesis-sidecar-runtime.ts)

## 符号（1）
<!-- node: function:scripts/synthesis/package-synthesis-sidecar-runtime.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 64–199 | 复杂 | 入口、打包、cli | 0 | 打包入口：解析目标参数、收集 bundle 文件、写入 manifest/pointer 并输出打包摘要。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [sidecarSystem.ts](../../packages/synthesis-contracts/src/sidecarSystem.ts.md) | packages/synthesis-contracts/src/sidecarSystem.ts | sidecar 系统层契约核心：能力矩阵、错误码、调用 envelope、compute pool 与 repository 快照，以及 health/handshake 重建。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |
