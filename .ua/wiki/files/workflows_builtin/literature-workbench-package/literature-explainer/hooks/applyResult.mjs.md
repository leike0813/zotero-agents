
# workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-explainer/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-explainer/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs -->

文献解读工作流的结果回写 hook：从运行结果中解析解读笔记路径、读取 Markdown 全文并创建会话笔记产物。
源码：[workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs)

## 符号（7）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:getNotePathFromRecord -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:readNoteMarkdown -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:resolveBundleEntryPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:resolveNotePath -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:resolveNotePathFromRunResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-explainer/hooks/applyResult.mjs:stringifyUnknownError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 240–347 | 复杂 | orchestration、note-writing、conversation-note | 0 | 解读结果回写：定位并读取笔记正文，创建会话笔记并写入条目，失败时附带回滚与诊断。 |
| getNotePathFromRecord | 函数 | 46–58 | 简单 | parsing、path-handling、resolution | 0 | 从结果记录中提取笔记文件路径，兼容多种字段命名与相对路径写法。 |
| readNoteMarkdown | 函数 | 163–212 | 中等 | markdown、file-io、parsing | 0 | 读取解读笔记的 Markdown 全文，必要时拼接 bundle 中的多个片段。 |
| resolveBundleEntryPath | 函数 | 86–111 | 简单 | bundle、path-handling、resolution | 0 | 在解读 bundle 中解析目标条目的实际路径，处理大小写与分隔符差异。 |
| resolveNotePath | 函数 | 113–140 | 中等 | path-handling、resolution、resilience | 0 | 解读笔记路径解析主流程：按结果记录、bundle 清单与文件名依次回退查找。 |
| resolveNotePathFromRunResult | 函数 | 60–73 | 简单 | parsing、resolution、result-contract | 0 | 在完整运行结果中定位解读笔记产物路径，支持按 kind 与文件名两种匹配。 |
| stringifyUnknownError | 函数 | 9–40 | 中等 | error-handling、formatting、utility | 0 | 把任意异常值格式化为可读字符串，覆盖 Error、DOMException 与结构化诊断载荷。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [resultOutput.mjs](../../lib/resultOutput.mjs.md) | workflows_builtin/literature-workbench-package/lib/resultOutput.mjs | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 240–347 | 解读结果回写：定位并读取笔记正文，创建会话笔记并写入条目，失败时附带回滚与诊断。 |
