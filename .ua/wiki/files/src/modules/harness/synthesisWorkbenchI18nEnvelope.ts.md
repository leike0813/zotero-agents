
# src/modules/harness/synthesisWorkbenchI18nEnvelope.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/synthesisWorkbenchI18nEnvelope.ts -->

为只读 Harness 解析 locale 并读取 FTL 资源，构建与正式工作台一致的 i18n envelope，使 Harness 页面复用同一套文案键。
源码：[src/modules/harness/synthesisWorkbenchI18nEnvelope.ts](../../../../../../src/modules/harness/synthesisWorkbenchI18nEnvelope.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchI18n.ts](../../synthesisWorkbenchI18n.ts.md) | src/synthesisWorkbenchI18n.ts | Synthesis 工作台文案目录：以默认英文消息表为 SSOT，定义全部消息键，并把 sidecar 失败码投影为用户可读的失败卡片文案。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [build-literature-deep-reading-graph-renderer.ts](../../../scripts/content-package/build-literature-deep-reading-graph-renderer.ts.md) | scripts/content-package/build-literature-deep-reading-graph-renderer.ts | 构建 literature-deep-reading 内容包的图渲染器：把 workbench 文案的 i18n envelope 注入渲染器源码并输出到内容包目录。 |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [buildHarnessSynthesisI18nEnvelope](../../../../symbols/globals.md) | 函数 | 63–87 | 读取对应 locale 的 FTL 消息并与默认文案合并，产出注入页面的 i18n envelope。 |
| [resolveHarnessSynthesisLocale](../../../../symbols/globals.md) | 函数 | 41–61 | 结合 URL 查询参数与默认语言确定 Harness 使用的 locale，无法识别时回退到英文。 |
