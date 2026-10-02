
# scripts/check-runtime-diagnostics-release-elision.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/check-runtime-diagnostics-release-elision.ts -->

发布门禁脚本：用 esbuild 按诊断开关的多种组合打包 src/index.ts，验证 runtime diagnostics 与 Synthesis sidecar 诊断代码在正式构建中被完全消除。
源码：[scripts/check-runtime-diagnostics-release-elision.ts](../../../../scripts/check-runtime-diagnostics-release-elision.ts)

## 符号（7）
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:assertAbsent -->
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:bundle -->
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:bundleDashboard -->
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:bundleSynthesisWorkbench -->
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:checkRuntimeDiagnosticsReleaseElision -->
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:groupBytes -->
<!-- node: function:scripts/check-runtime-diagnostics-release-elision.ts:markerContext -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertAbsent | 函数 | 130–147 | 简单 | assertion、validation、diagnostics | 0 | 断言产物中不含指定 marker，失败时输出上下文片段。 |
| bundle | 函数 | 28–56 | 简单 | build-system、bundling、diagnostics | 0 | 按一组诊断开关执行 esbuild 打包并收集产物。 |
| bundleDashboard | 函数 | 58–80 | 简单 | build-system、bundling、diagnostics | 0 | 单独打包 Dashboard 入口，用于检查 sidecar 区域级消除。 |
| bundleSynthesisWorkbench | 函数 | 82–98 | 简单 | build-system、bundling、diagnostics | 0 | 单独打包 Synthesis workbench 入口以检查诊断消除。 |
| checkRuntimeDiagnosticsReleaseElision | 函数 | 149–333 | 中等 | validation、release-gate、entry-point | 0 | 主编排：逐开关组合打包，断言独占模块与 marker 已从正式产物中消除。 |
| groupBytes | 函数 | 100–113 | 简单 | utility、metrics、diagnostics | 0 | 从构建结果中收集某一组产物的字节数统计。 |
| markerContext | 函数 | 119–128 | 简单 | diagnostics、diagnostics-report、utility | 0 | 提取 marker 命中位置附近的上下文文本用于报错定位。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime-diagnostics-esbuild.ts](runtime-diagnostics-esbuild.ts.md) | scripts/runtime-diagnostics-esbuild.ts | runtime diagnostics 的 esbuild 插件：按开关把诊断独占模块标记为副作用并在正式构建中消除，同时对部分模块执行区域级 elision。 |
| [runtime-diagnostics-production-manifest.ts](runtime-diagnostics-production-manifest.ts.md) | scripts/runtime-diagnostics-production-manifest.ts | runtime diagnostics 正式构建清单的单一事实源：声明各诊断特性组的开关、define、独占模块、禁止出现的 marker 与静态豁免项。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| checkRuntimeDiagnosticsReleaseElision | 函数 | 149–333 | 主编排：逐开关组合打包，断言独占模块与 marker 已从正式产物中消除。 |
