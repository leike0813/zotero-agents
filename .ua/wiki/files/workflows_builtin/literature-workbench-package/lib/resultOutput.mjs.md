
# workflows_builtin/literature-workbench-package/lib/resultOutput.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/resultOutput.mjs -->

Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。
源码：[workflows_builtin/literature-workbench-package/lib/resultOutput.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/resultOutput.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/resultOutput.mjs:appendSkillDiagnosticsToResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/resultOutput.mjs:collectSkillOutputDiagnostics -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/resultOutput.mjs:formatSkillDiagnosticsForError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [appendSkillDiagnosticsToResult](../../../../symbols/workflows_builtin/literature-workbench-package/lib/resultOutput.mjs/appendSkillDiagnosticsToResult.md) | 函数 | 108–116 | 简单 | diagnostics、result-contract、utility | 3 | 把采集到的诊断信息以 warnings 形式合并回结果对象，保证字段不覆盖已有内容。 |
| collectSkillOutputDiagnostics | 函数 | 54–106 | 中等 | diagnostics、normalization、observability | 0 | 遍历 Skill 输出中的诊断性字段并归一化为统一结构，去重、限长并按严重度排序。 |
| formatSkillDiagnosticsForError | 函数 | 151–167 | 简单 | diagnostics、formatting、error-handling | 0 | 把诊断结构序列化为适合嵌入 Error 消息或日志的多行文本，超长时截断。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../literature-analysis/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/applyResult.mjs | 文献分析工作流的结果回写 hook：读取产物 bundle、过滤低质参考文献、写入 digest 与各类子笔记、附带代表图并完成状态迁移与诊断上报。 |
| [applyResult.mjs](../literature-deep-reading/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs | 深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。 |
| [applyResult.mjs](../literature-explainer/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs | 文献解读工作流的结果回写 hook：从运行结果中解析解读笔记路径、读取 Markdown 全文并创建会话笔记产物。 |
| [applyResult.mjs](../literature-translator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs | 翻译工作流的结果回写 hook：读取译文与对齐产物文本，物化为文件并更新或创建 Zotero 附件。 |
| [applyResult.mjs](../tag-bootstrapper/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs | 标签引导工作流的结果回写 hook：把 Agent 生成的标签建议归一化后写入条目标签，并读取 Synthesis 暂存词表辅助 facet 判定。 |
| [applyResult.mjs](../tag-regulator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs | 标签治理工作流的核心 hook（约 2000 行）：构建建议标签交互式对话框，接收人工决策后把建议并入受控词表或暂存区，提交受控词表并落盘标签变更。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [appendSkillDiagnosticsToResult](../../../../symbols/workflows_builtin/literature-workbench-package/lib/resultOutput.mjs/appendSkillDiagnosticsToResult.md) | 函数 | 108–116 | 把采集到的诊断信息以 warnings 形式合并回结果对象，保证字段不覆盖已有内容。 |
| collectSkillOutputDiagnostics | 函数 | 54–106 | 遍历 Skill 输出中的诊断性字段并归一化为统一结构，去重、限长并按严重度排序。 |
| formatSkillDiagnosticsForError | 函数 | 151–167 | 把诊断结构序列化为适合嵌入 Error 消息或日志的多行文本，超长时截断。 |
