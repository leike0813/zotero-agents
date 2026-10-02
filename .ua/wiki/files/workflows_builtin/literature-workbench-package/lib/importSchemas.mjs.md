
# workflows_builtin/literature-workbench-package/lib/importSchemas.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs -->

导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。
源码：[workflows_builtin/literature-workbench-package/lib/importSchemas.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs)

## 符号（5）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:parseImportedCitationArtifact -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:parseImportedReferencesArtifact -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:parseImportedScoreArtifact -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:validateImportedCitationPayload -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/importSchemas.mjs:validateImportedReferencesPayload -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [parseImportedCitationArtifact](../../../../symbols/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs/parseImportedCitationArtifact.md) | 函数 | 41–43 | 简单 | parser、validation、import | 2 | 解析 citation-analysis 工件文本为对象并同步校验。 |
| [parseImportedReferencesArtifact](../../../../symbols/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs/parseImportedReferencesArtifact.md) | 函数 | 37–39 | 简单 | parser、validation、import | 3 | 解析 references 工件文本为对象并同步做 schema 校验。 |
| parseImportedScoreArtifact | 函数 | 45–47 | 简单 | parser、validation、import | 1 | 解析 literature-score 工件文本为对象并同步校验。 |
| validateImportedCitationPayload | 函数 | 23–25 | 简单 | validation、import | 0 | 校验导入的规范 citation-analysis 载荷，输出结构化错误列表。 |
| validateImportedReferencesPayload | 函数 | 19–21 | 简单 | validation、import | 0 | 校验导入的规范 references 载荷，把 ajv errors 格式化为可读字符串列表。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonicalLiteratureValidators.mjs](canonicalLiteratureValidators.mjs.md) | workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs | 由 scripts/content-package 构建脚本生成的 ajv 校验器 bundle，内联编译后的 references/citation/score 三类规范产物的 JSON Schema 校验函数。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../import-notes/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/import-notes/hooks/applyResult.mjs | import-notes 工作流的核心 applyResult hook（1400+ 行）：解析 Agent 产出的 digest、引用分析、参考文献与评分工件，经校验、冲突检测、交互式选择/编辑器后写入 Zotero 笔记，并驱动 Synthesis sidecar 应用。 |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |
| [buildRequest.mjs](../literature-analysis/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs | 文献分析工作流的请求构建 hook：检查所选文献的附件与题录就绪度，必要时经元数据策展补全，再组装 Agent 请求。 |
| [literatureBundle.mjs](literatureBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureBundle.mjs | 文献工作台的核心 bundle 库（2600+ 行）：负责可移植笔记 HTML 编解码、bundle/product 清单构建与文件校验、bundle 导出、legacy 迁移确认，以及 bundle/product/research 三类归档的导入。 |
| [literatureDeepReadingBundle.mjs](literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [parseImportedCitationArtifact](../../../../symbols/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs/parseImportedCitationArtifact.md) | 函数 | 41–43 | 解析 citation-analysis 工件文本为对象并同步校验。 |
| [parseImportedReferencesArtifact](../../../../symbols/workflows_builtin/literature-workbench-package/lib/importSchemas.mjs/parseImportedReferencesArtifact.md) | 函数 | 37–39 | 解析 references 工件文本为对象并同步做 schema 校验。 |
| parseImportedScoreArtifact | 函数 | 45–47 | 解析 literature-score 工件文本为对象并同步校验。 |
| validateImportedCitationPayload | 函数 | 23–25 | 校验导入的规范 citation-analysis 载荷，输出结构化错误列表。 |
| validateImportedReferencesPayload | 函数 | 19–21 | 校验导入的规范 references 载荷，把 ajv errors 格式化为可读字符串列表。 |
