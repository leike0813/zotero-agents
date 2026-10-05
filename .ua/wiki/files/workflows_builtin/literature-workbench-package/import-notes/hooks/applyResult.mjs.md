
# workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/import-notes/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/import-notes/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs -->

import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。
源码：[workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs)

## 符号（8）
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:applySelectedImportBatch -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:buildNonInteractiveSelection -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:createImportRenderer -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:getSelectedImportCandidateForKind -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:previewLegacyArtifactSetForImport -->
<!-- node: function:workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs:stripLegacyArtifactMarkupForImport -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 1470–1472 | 中等 | hook、entry-point、import | 0 | hook 入口，在 package runtime scope 内执行完整导入流程。 |
| applyResultImpl | 函数 | 1355–1468 | 复杂 | import、orchestration、note | 0 | 导入主流程：解析产物、构造预览、判定交互与非交互分支、批量写入并汇总 receipt。 |
| applySelectedImportBatch | 函数 | 1225–1291 | 中等 | import、note、batch | 0 | 按用户选中的工件集合批量 upsert 笔记，并跟踪已应用的类别以防重复。 |
| buildNonInteractiveSelection | 函数 | 385–452 | 中等 | import、automation、selection | 0 | 在无交互通道时按可识别的规范产物自动构建全量或跳过选择。 |
| createImportRenderer | 函数 | 463–934 | 复杂 | ui、renderer、import | 0 | 构建导入选择 UI 渲染器，按 digest/引用/参考文献/评分四类渲染可选工件行与冲突标记。 |
| getSelectedImportCandidateForKind | 函数 | 30–44 | 简单 | import、selection、state | 0 | 按工件类别读取当前已选中的候选，供 UI 状态复用。 |
| previewLegacyArtifactSetForImport | 函数 | 235–301 | 中等 | import、preview、legacy-compat | 0 | 为旧版非规范产物生成可读预览，供用户确认后再决定是否转换导入。 |
| stripLegacyArtifactMarkupForImport | 函数 | 308–347 | 中等 | import、normalization、legacy-compat | 0 | 剥离旧版工件中的历史标记与诊断块，得到可写入的干净笔记内容。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [importSchemas.mjs](../../lib/importSchemas.mjs.md) | workflows_builtin/literature-workbench-package/lib/importSchemas.mjs | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [literatureDigestSidecar.mjs](../../lib/literatureDigestSidecar.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestSidecar.mjs | Synthesis sidecar 对接层：把 digest 内容、载荷哈希与笔记 key 组装成输入，委派 sidecar 应用并把失败归一为可重试的 typed 结果。 |
| [path.mjs](../../lib/path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [representativeImage.mjs](../../lib/representativeImage.mjs.md) | workflows_builtin/literature-workbench-package/lib/representativeImage.mjs | 摘要笔记代表图的解析、导出、导入与附件生命周期模块：把 digest 产出的代表图定位符解析为本地图片，并维护可移植的导出块与 Zotero 附件清理。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureBundle.mjs](../../lib/literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 1470–1472 | hook 入口，在 package runtime scope 内执行完整导入流程。 |
| getSelectedImportCandidateForKind | 函数 | 30–44 | 按工件类别读取当前已选中的候选，供 UI 状态复用。 |
| previewLegacyArtifactSetForImport | 函数 | 235–301 | 为旧版非规范产物生成可读预览，供用户确认后再决定是否转换导入。 |
| stripLegacyArtifactMarkupForImport | 函数 | 308–347 | 剥离旧版工件中的历史标记与诊断块，得到可写入的干净笔记内容。 |
