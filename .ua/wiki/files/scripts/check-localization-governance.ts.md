
# scripts/check-localization-governance.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/check-localization-governance.ts -->

本地化治理检查脚本，比对各语言 FTL 键集合、抽取 Synthesis Workbench 与 Dashboard 页面中的 UI 硬编码文案，并核对默认值一致性。
源码：[scripts/check-localization-governance.ts](../../../../scripts/check-localization-governance.ts)

## 符号（7）
<!-- node: function:scripts/check-localization-governance.ts:diffKeys -->
<!-- node: function:scripts/check-localization-governance.ts:listPageSources -->
<!-- node: function:scripts/check-localization-governance.ts:main -->
<!-- node: function:scripts/check-localization-governance.ts:parseFluentKeys -->
<!-- node: function:scripts/check-localization-governance.ts:reportAssistantWorkspaceHtmlHardcodes -->
<!-- node: function:scripts/check-localization-governance.ts:reportDashboardUiHardcodes -->
<!-- node: function:scripts/check-localization-governance.ts:reportSynthesisWorkbenchUiHardcodes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| diffKeys | 函数 | 211–225 | 简单 | i18n、diff、utility、validation | 0 | 计算两个键集合的缺失项与多余项，输出可用于报告的双向差异。 |
| listPageSources | 函数 | 79–94 | 简单 | i18n、discovery、validation、filesystem | 0 | 列出页面目录下参与本地化治理检查的源文件（Preact 区域与 HTML 页面）。 |
| main | 函数 | 236–441 | 复杂 | validation、i18n、governance、entry-point、ci | 0 | 本地化治理检查主流程：比对各语言 FTL 键、扫描硬编码文案、核对 Workbench 默认值，发现违规即以非零码退出。 |
| parseFluentKeys | 函数 | 96–106 | 简单 | i18n、parsing、validation、fluent | 0 | 从 FTL 资源中解析全部消息键，用于跨语言键集合比对。 |
| reportAssistantWorkspaceHtmlHardcodes | 函数 | 188–209 | 中等 | i18n、validation、hardcode-detection、assistant | 0 | 检查 Assistant Workspace 的 HTML 模板是否存在应被提取为 FTL 键的硬编码文案。 |
| reportDashboardUiHardcodes | 函数 | 160–186 | 中等 | i18n、validation、hardcode-detection、dashboard | 0 | 扫描 Dashboard 页面源码中的 UI 硬编码文案并按白名单放行合法字符串。 |
| reportSynthesisWorkbenchUiHardcodes | 函数 | 128–158 | 中等 | i18n、validation、hardcode-detection、synthesis | 0 | 扫描 Synthesis Workbench 区域源码，报告未走本地化的 UI 硬编码文案。 |
