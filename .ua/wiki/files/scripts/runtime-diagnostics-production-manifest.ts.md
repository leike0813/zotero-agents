
# scripts/runtime-diagnostics-production-manifest.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/runtime-diagnostics-production-manifest.ts -->

runtime diagnostics 正式构建清单的单一事实源：声明各诊断特性组的开关、define、独占模块、禁止出现的 marker 与静态豁免项。
源码：[scripts/runtime-diagnostics-production-manifest.ts](../../../../scripts/runtime-diagnostics-production-manifest.ts)

## 符号（1）
<!-- node: function:scripts/runtime-diagnostics-production-manifest.ts:runtimeDiagnosticsModuleBasenames -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| runtimeDiagnosticsModuleBasenames | 函数 | 160–164 | 简单 | utility、diagnostics、derivation | 1 | 汇总所有诊断独占模块的文件名，供 esbuild 插件做匹配。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-runtime-diagnostics-release-elision.ts](check-runtime-diagnostics-release-elision.ts.md) | scripts/check-runtime-diagnostics-release-elision.ts | 发布门禁脚本：用 esbuild 按诊断开关的多种组合打包 src/index.ts，验证 runtime diagnostics 与 Synthesis sidecar 诊断代码在正式构建中被完全消除。 |
| [runtime-diagnostics-esbuild.ts](runtime-diagnostics-esbuild.ts.md) | scripts/runtime-diagnostics-esbuild.ts | runtime diagnostics 的 esbuild 插件：按开关把诊断独占模块标记为副作用并在正式构建中消除，同时对部分模块执行区域级 elision。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| runtimeDiagnosticsModuleBasenames | 函数 | 160–164 | 汇总所有诊断独占模块的文件名，供 esbuild 插件做匹配。 |
