
# workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs -->

参考文献抽取质量闸门：判定解析出的参考文献是否具备可用的题录信息，并在写入 digest 笔记前过滤低质量条目。
源码：[workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs:classifyReferenceExtractionQuality -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs:contentTokens -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/referenceQualityGate.mjs:filterReferencesForDigestApply -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| classifyReferenceExtractionQuality | 函数 | 169–215 | 中等 | validation、quality-gate、classification、references | 0 | 综合题名形态、作者前缀、文献后缀与标识符特征，把单条参考文献判定为可信或低质量。 |
| contentTokens | 函数 | 77–105 | 中等 | text-mining、tokenization、heuristic | 0 | 从参考文献文本中抽取内容词元并去除停用词，用于计算题录与正文的重合度。 |
| filterReferencesForDigestApply | 函数 | 227–267 | 中等 | validation、quality-gate、filtering、references | 1 | 对整份参考文献列表逐条过闸门，保留可用条目并汇总被过滤原因供结果诊断使用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| classifyReferenceExtractionQuality | 函数 | 169–215 | 综合题名形态、作者前缀、文献后缀与标识符特征，把单条参考文献判定为可信或低质量。 |
| filterReferencesForDigestApply | 函数 | 227–267 | 对整份参考文献列表逐条过闸门，保留可用条目并汇总被过滤原因供结果诊断使用。 |
