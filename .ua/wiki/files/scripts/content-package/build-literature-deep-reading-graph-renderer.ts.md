
# scripts/content-package/build-literature-deep-reading-graph-renderer.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/build-literature-deep-reading-graph-renderer.ts -->

构建 literature-deep-reading 内容包的图渲染器：把 workbench 文案的 i18n envelope 注入渲染器源码并输出到内容包目录。
源码：[scripts/content-package/build-literature-deep-reading-graph-renderer.ts](../../../../../scripts/content-package/build-literature-deep-reading-graph-renderer.ts)

## 符号（1）
<!-- node: function:scripts/content-package/build-literature-deep-reading-graph-renderer.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 62–208 | 中等 | entry-point、build-script、i18n | 0 | 构建入口：读取 workbench i18n envelope 并生成 literature-deep-reading 图渲染器产物。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchI18nEnvelope.ts](../../src/modules/harness/synthesisWorkbenchI18nEnvelope.ts.md) | src/modules/harness/synthesisWorkbenchI18nEnvelope.ts | 为只读 Harness 解析 locale 并读取 FTL 资源，构建与正式工作台一致的 i18n envelope，使 Harness 页面复用同一套文案键。 |
