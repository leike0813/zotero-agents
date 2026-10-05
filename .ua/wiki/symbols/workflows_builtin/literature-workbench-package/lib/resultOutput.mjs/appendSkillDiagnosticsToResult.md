
# appendSkillDiagnosticsToResult
<!-- node: function:workflows_builtin/literature-workbench-package/lib/resultOutput.mjs:appendSkillDiagnosticsToResult -->

把采集到的诊断信息以 warnings 形式合并回结果对象，保证字段不覆盖已有内容。
类型：函数  
复杂度：简单  
入边数：3  
标签：diagnostics、result-contract、utility  
所属文件：[workflows_builtin/literature-workbench-package/lib/resultOutput.mjs](../../../../../files/workflows_builtin/literature-workbench-package/lib/resultOutput.mjs.md)
源码：[workflows_builtin/literature-workbench-package/lib/resultOutput.mjs:108](../../../../../../../workflows_builtin/literature-workbench-package/lib/resultOutput.mjs#L108)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult](../../../../../files/workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:240–347 | 解读结果回写：定位并读取笔记正文，创建会话笔记并写入条目，失败时附带回滚与诊断。 |
| [applyResultImpl](../../../../../files/workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs:115–197 | 标签引导回写主流程：加载暂存建议、归一化条目、写入标签并汇总诊断。 |
| [applyResultImpl](../../../../../files/workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/applyResult.mjs:1840–2077 | 标签治理回写主流程：解析输出、加载词表状态、驱动对话框收集决策、提交词表并写入标签。 |

## 调用

该符号没有记录对外调用。
