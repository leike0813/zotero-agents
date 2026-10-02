
# workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-translator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-translator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs -->

翻译工作流的结果回写 hook：读取译文与对齐产物文本，物化为文件并更新或创建 Zotero 附件。
源码：[workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs)

## 符号（4）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs:readResultJson -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs:readTranslatorArtifactTexts -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 184–186 | 简单 | workflow-hook、entry-point | 0 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| applyResultImpl | 函数 | 90–182 | 复杂 | orchestration、attachment-lifecycle、translation | 0 | 翻译回写主流程：物化产物文本、按既有附件路径做幂等更新，并追加状态迁移诊断。 |
| readResultJson | 函数 | 46–63 | 简单 | result-contract、parsing、validation | 0 | 读取并解析翻译工作流的结果 JSON，结构非法时抛出带产物路径的错误。 |
| readTranslatorArtifactTexts | 函数 | 65–88 | 简单 | translation、parsing、extraction | 0 | 从运行结果中提取译文与对齐文本，缺失时给出明确的产物缺失诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [resultOutput.mjs](../../lib/resultOutput.mjs.md) | workflows_builtin/literature-workbench-package/lib/resultOutput.mjs | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [translatorArtifacts.mjs](../../lib/translatorArtifacts.mjs.md) | workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 184–186 | applyResult 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
