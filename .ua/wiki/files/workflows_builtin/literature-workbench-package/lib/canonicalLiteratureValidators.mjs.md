
# workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs -->

由 scripts/content-package 构建脚本生成的 ajv 校验器 bundle，内联编译后的 references/citation/score 三类规范产物的 JSON Schema 校验函数。
源码：[workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs:validateCitation -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs:validateReferences -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/canonicalLiteratureValidators.mjs:validateScore -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| validateCitation | 函数 | 7560–7560 | 中等 | validation、schema | 1 | 校验规范 citation-analysis 工件载荷，输出与 validateReferences 同构的布尔结果。 |
| validateReferences | 函数 | 7560–7560 | 中等 | validation、schema | 1 | 校验规范 references 工件载荷是否满足生成的 JSON Schema，失败时附 ajv errors。 |
| validateScore | 函数 | 7560–7560 | 中等 | validation、schema | 1 | 校验规范 literature-score 工件载荷，供导入路径拒绝不合规产物。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [importSchemas.mjs](importSchemas.mjs.md) | workflows_builtin/literature-workbench-package/lib/importSchemas.mjs | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| validateCitation | 函数 | 7560–7560 | 校验规范 citation-analysis 工件载荷，输出与 validateReferences 同构的布尔结果。 |
| validateReferences | 函数 | 7560–7560 | 校验规范 references 工件载荷是否满足生成的 JSON Schema，失败时附 ajv errors。 |
| validateScore | 函数 | 7560–7560 | 校验规范 literature-score 工件载荷，供导入路径拒绝不合规产物。 |
