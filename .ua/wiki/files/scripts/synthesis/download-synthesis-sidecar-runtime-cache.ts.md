
# scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts -->

从 GitHub Actions artifact 下载 Synthesis sidecar runtime 压缩包并解包到本地 tar.gz 缓存，同时校验目标三元组与摘要。
源码：[scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts](../../../../../scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts)

## 符号（4）
<!-- node: function:scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts:downloadArtifactZip -->
<!-- node: function:scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts:downloadSynthesisSidecarRuntimeCache -->
<!-- node: function:scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts:extractSynthesisSidecarRuntimeArchive -->
<!-- node: function:scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts:extractZipToTarGz -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| downloadArtifactZip | 函数 | 59–99 | 中等 | 下载、http、ci-cd | 0 | 带鉴权头下载 workflow artifact 的 zip 到临时路径并返回其位置。 |
| downloadSynthesisSidecarRuntimeCache | 函数 | 150–226 | 复杂 | 下载、缓存、编排、sidecar | 0 | 缓存下载主流程：按目标过滤 run、选 artifact、下载解包并做摘要与布局校验。 |
| extractSynthesisSidecarRuntimeArchive | 函数 | 134–148 | 简单 | 解压、sidecar、入口 | 0 | 把 runtime archive 解压到指定目录并返回解压后的根路径。 |
| extractZipToTarGz | 函数 | 101–127 | 中等 | 解压、打包、工具函数 | 0 | 将下载的 zip 转成规范命名的 tar.gz，便于按目标三元组缓存复用。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |
| [synthesis-sidecar-runtime-release-governance.ts](synthesis-sidecar-runtime-release-governance.ts.md) | scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts | Synthesis sidecar runtime 的治理事实源：定义目标矩阵、构建配方读取、身份与指纹计算、归档布局断言和 bundle 目录校验。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| downloadSynthesisSidecarRuntimeCache | 函数 | 150–226 | 缓存下载主流程：按目标过滤 run、选 artifact、下载解包并做摘要与布局校验。 |
| extractSynthesisSidecarRuntimeArchive | 函数 | 134–148 | 把 runtime archive 解压到指定目录并返回解压后的根路径。 |
