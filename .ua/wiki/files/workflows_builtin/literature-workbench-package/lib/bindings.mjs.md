
# workflows_builtin/literature-workbench-package/lib/bindings.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/bindings.mjs -->

绑定模型的 re-export barrel：把 model.mjs 中的 parent binding 相关归一化函数单独暴露给工作流使用。
源码：[workflows_builtin/literature-workbench-package/lib/bindings.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/bindings.mjs)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../tag-regulator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs | 标签治理工作流的核心 hook（约 2000 行）：构建建议标签交互式对话框，接收人工决策后把建议并入受控词表或暂存区，提交受控词表并落盘标签变更。 |
