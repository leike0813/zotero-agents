
# workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-deep-reading/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-deep-reading/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs -->

深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。
源码：[workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs)

## 符号（5）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs:readBundleTextWithPathFallback -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs:readResultJson -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs:resolveBundleEntryPath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 252–254 | 简单 | workflow-hook、entry-point、diagnostics | 0 | applyResult 公开入口，在包级 runtime scope 内执行并统一附加诊断。 |
| applyResultImpl | 函数 | 122–250 | 复杂 | orchestration、note-writing、deep-reading | 0 | 深读结果回写主流程：解析产物、复用翻译对齐附件、写入目标笔记并追加状态迁移诊断。 |
| readBundleTextWithPathFallback | 函数 | 66–83 | 简单 | bundle、file-io、resilience | 0 | 读取深读 bundle 内文本，主路径失效时按文件名回退查找。 |
| readResultJson | 函数 | 85–106 | 简单 | result-contract、parsing、validation | 0 | 读取并解析工作流结果 JSON，结构非法时抛出带产物路径的错误。 |
| resolveBundleEntryPath | 函数 | 39–64 | 简单 | bundle、path-handling、resolution | 0 | 在深读 bundle 中定位目标产物条目的实际路径，兼容路径大小写与分隔符差异。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [deepReadingResultTarget.mjs](../../lib/deepReadingResultTarget.mjs.md) | workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs | 深度阅读结果目标路径推导：把宿主产出的源文件路径映射为 HTML 产物路径，统一处理 Windows/POSIX 路径分隔符与比较用的归一化形式。 |
| [path.mjs](../../lib/path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [resultOutput.mjs](../../lib/resultOutput.mjs.md) | workflows_builtin/literature-workbench-package/lib/resultOutput.mjs | Skill 输出诊断的统一采集与归一化模块：把 Agent 返回结果中的 warning/diagnostic 字段收敛成稳定的结构，供结果层与错误提示复用。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [statusTransition.mjs](../../lib/statusTransition.mjs.md) | workflows_builtin/literature-workbench-package/lib/statusTransition.mjs | 工作流状态迁移诊断模块：检查结果状态迁移是否合法，并把违规详情收集为可并入结果的诊断项。 |
| [translatorArtifacts.mjs](../../lib/translatorArtifacts.mjs.md) | workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 252–254 | applyResult 公开入口，在包级 runtime scope 内执行并统一附加诊断。 |
