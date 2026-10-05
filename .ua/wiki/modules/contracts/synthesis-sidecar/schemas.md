
# contracts/synthesis-sidecar/schemas
> 目录聚合页：6 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-result.v1.schema.json](../../../files/contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-result.v1.schema.json.md) | 配置 | 0 | Synthesis sidecar 运行时预构建结果 v1 契约。固定 11 个必填字段，用 const 锁定 schema id、预构建 workflow 文件名与预构建分支名，并用正则约束 commit（40 位 hex）与 fingerprint（64 位 hex）。 |
| [contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-result.v2.schema.json](../../../files/contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-result.v2.schema.json.md) | 配置 | 0 | 预构建结果契约的 v2 版本，在 v1 字段之上追加必填的 cache 对象，记录七个受支持目标平台的缓存命中/未命中情况及其来源 runId。 |
| [contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-set.v1.schema.json](../../../files/contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-prebuild-set.v1.schema.json.md) | 配置 | 0 | 预构建集合契约，要求 archives 数组恰好包含 7 条（win32-x64、darwin-x64/arm64 与四个 linux 变体），每条记录 target、归档文件名、sha256 与字节数。 |
| [contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-receipt.v1.schema.json](../../../files/contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-receipt.v1.schema.json.md) | 配置 | 0 | 运行时发布回执契约，以 status 枚举（in_progress / failed / complete）表达发布进度，并携带 releaseSetId、sourceCommit、aggregate 与自由形式的 steps 对象。 |
| [contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-set.v1.schema.json](../../../files/contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-release-set.v1.schema.json.md) | 配置 | 0 | 运行时发布集合契约的最简形态，只要求 releaseSetId、sourceCommit 以及 prebuild / materialized 两个不透明对象，由各自的 v2 契约进一步细化。 |
| [contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-symbol-manifest.v1.schema.json](../../../files/contracts/synthesis-sidecar/schemas/synthesis-sidecar-runtime-symbol-manifest.v1.schema.json.md) | 配置 | 0 | Windows 符号清单契约（win32-x64 / x86_64-pc-windows-msvc），通过 $defs 复用 file 子模式描述 executable、pdb 与 gzip 压缩的 archive，使 Rust 构建脚本可校验发布的调试符号。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [scripts/synthesis](../../scripts/synthesis.md) | 4 |
| [packages/synthesis-contracts/src](../../packages/synthesis-contracts/src.md) | 1 |
