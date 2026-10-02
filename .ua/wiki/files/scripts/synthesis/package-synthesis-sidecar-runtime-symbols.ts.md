
# scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts -->

为已构建的 Synthesis sidecar runtime 生成符号清单（symbol manifest）并打包，支撑崩溃栈符号化与发布证据链。
源码：[scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts](../../../../../scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts)

## 符号（2）
<!-- node: function:scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts:packageSynthesisSidecarRuntimeSymbols -->
<!-- node: function:scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts:rebuildSynthesisSidecarRuntimeSymbolManifest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| packageSynthesisSidecarRuntimeSymbols | 函数 | 101–144 | 中等 | 打包、符号清单、sidecar | 0 | 收集目标三元组下的符号文件，写入 manifest 并打包成可发布产物。 |
| rebuildSynthesisSidecarRuntimeSymbolManifest | 函数 | 44–99 | 中等 | schema、符号清单、契约 | 0 | 按 runtime 符号集合重建并校验 symbol manifest，记录每个符号的地址、尺寸与来源。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [sidecarRuntimeBundle.ts](../../packages/synthesis-contracts/src/sidecarRuntimeBundle.ts.md) | packages/synthesis-contracts/src/sidecarRuntimeBundle.ts | 定义 Synthesis sidecar 运行时 bundle 的跨语言契约：schema 常量、七平台 target 三元组、平台身份，以及 bundle manifest 与 pointer 的严格重建校验。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [publish-synthesis-sidecar-runtime-prebuild.ts](publish-synthesis-sidecar-runtime-prebuild.ts.md) | scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts | 把预构建产物发布到不可变远端 store：以 copy-or-verify 方式幂等上传，校验目标证据后回写 prebuild 集合。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| packageSynthesisSidecarRuntimeSymbols | 函数 | 101–144 | 收集目标三元组下的符号文件，写入 manifest 并打包成可发布产物。 |
| rebuildSynthesisSidecarRuntimeSymbolManifest | 函数 | 44–99 | 按 runtime 符号集合重建并校验 symbol manifest，记录每个符号的地址、尺寸与来源。 |
