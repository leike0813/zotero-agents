
# scripts/runtime-diagnostics-esbuild.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/runtime-diagnostics-esbuild.ts -->

runtime diagnostics 的 esbuild 插件：按开关把诊断独占模块标记为副作用并在正式构建中消除，同时对部分模块执行区域级 elision。
源码：[scripts/runtime-diagnostics-esbuild.ts](../../../../scripts/runtime-diagnostics-esbuild.ts)

## 符号（2）
<!-- node: function:scripts/runtime-diagnostics-esbuild.ts:dashboardSynthesisSidecarRegionElisionPlugin -->
<!-- node: function:scripts/runtime-diagnostics-esbuild.ts:runtimeDiagnosticsSideEffectsPlugin -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| dashboardSynthesisSidecarRegionElisionPlugin | 函数 | 119–141 | 简单 | build-system、plugin、diagnostics | 1 | Dashboard 侧 esbuild 插件：把仅供 sidecar 区域使用的模块限制在对应区域内打包。 |
| runtimeDiagnosticsSideEffectsPlugin | 函数 | 142–298 | 中等 | build-system、plugin、diagnostics | 1 | esbuild 插件：按各诊断特性的开关与独占模块清单决定保留或消除对应代码。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime-diagnostics-production-manifest.ts](runtime-diagnostics-production-manifest.ts.md) | scripts/runtime-diagnostics-production-manifest.ts | runtime diagnostics 正式构建清单的单一事实源：声明各诊断特性组的开关、define、独占模块、禁止出现的 marker 与静态豁免项。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-runtime-diagnostics-release-elision.ts](check-runtime-diagnostics-release-elision.ts.md) | scripts/check-runtime-diagnostics-release-elision.ts | 发布门禁脚本：用 esbuild 按诊断开关的多种组合打包 src/index.ts，验证 runtime diagnostics 与 Synthesis sidecar 诊断代码在正式构建中被完全消除。 |
| [zotero-plugin.config.ts](../zotero-plugin.config.ts.md) | zotero-plugin.config.ts | zotero-plugin-toolkit 的构建配置：定义入口、输出目录、首启首选项、headless 测试环境与 E2E fixture 暂存逻辑。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| dashboardSynthesisSidecarRegionElisionPlugin | 函数 | 119–141 | Dashboard 侧 esbuild 插件：把仅供 sidecar 区域使用的模块限制在对应区域内打包。 |
| runtimeDiagnosticsSideEffectsPlugin | 函数 | 142–298 | esbuild 插件：按各诊断特性的开关与独占模块清单决定保留或消除对应代码。 |
