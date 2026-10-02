
# workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/export-research-bundle/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/export-research-bundle/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs -->

export-research-bundle 工作流的 applyResult hook：读取 Agent 产出的选区清单工件，物化为研究产品并统计各类警告。
源码：[workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs)

## 符号（1）
<!-- node: function:workflows_builtin/literature-workbench-package/export-research-bundle/hooks/applyResult.mjs:applyResult -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 3–35 | 中等 | hook、entry-point、export | 0 | 校验 run 状态后读取选区清单工件，物化研究产品并按 warning code 汇总计数。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [researchBundle.mjs](../../lib/researchBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/researchBundle.mjs | 研究产物包（research product）的 schema 定义、选文归一化与打包物化模块：把 Agent 输出的研究选题与论文清单编译成可导出的 bundle。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 3–35 | 校验 run 状态后读取选区清单工件，物化研究产品并按 warning code 汇总计数。 |
