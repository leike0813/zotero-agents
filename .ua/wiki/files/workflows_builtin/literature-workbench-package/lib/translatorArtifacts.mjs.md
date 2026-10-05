
# workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs -->

翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。
源码：[workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs)

## 符号（6）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs:findExistingTranslatorAlignment -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs:findOutputAttachmentForPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs:isValidTranslatorAlignment -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs:materializeTranslatorArtifacts -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs:materializeTranslatorArtifactTexts -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs:resolveTranslatorArtifactTargetPaths -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findExistingTranslatorAlignment | 函数 | 86–127 | 中等 | artifact、search、incremental | 1 | 在父条目附件中查找可复用的既有对齐结果，支持跨运行增量对齐。 |
| findOutputAttachmentForPath | 函数 | 129–156 | 中等 | attachment-lifecycle、search、idempotency | 0 | 按规范化路径在已有附件中定位目标输出附件，为重复运行提供幂等更新目标。 |
| isValidTranslatorAlignment | 函数 | 72–84 | 简单 | validation、artifact、translation | 0 | 校验翻译对齐 JSON 的结构与条目完整性，缺失必要字段时判定无效。 |
| materializeTranslatorArtifacts | 函数 | 158–190 | 中等 | artifact、file-io、materialization | 0 | 把译文与对齐结果写入工作区输出目录并返回文件清单，供后续附件导入使用。 |
| materializeTranslatorArtifactTexts | 函数 | 192–254 | 中等 | artifact、validation、materialization | 0 | 从 Agent 输出中取出译文与对齐文本，校验后物化为文件并返回路径映射。 |
| resolveTranslatorArtifactTargetPaths | 函数 | 46–62 | 简单 | path-handling、artifact、utility | 0 | 由源附件路径推导译文与对齐产物的目标路径，保持 stem 一致并替换扩展名。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [deepReadingResultTarget.mjs](deepReadingResultTarget.mjs.md) | workflows_builtin/literature-workbench-package/lib/deepReadingResultTarget.mjs | 深度阅读结果目标路径推导：把宿主产出的源文件路径映射为 HTML 产物路径，统一处理 Windows/POSIX 路径分隔符与比较用的归一化形式。 |
| [path.mjs](path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../literature-deep-reading/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/applyResult.mjs | 深度阅读工作流的结果回写 hook：读取深读产物并写入目标笔记或附件，按既有翻译对齐结果决定更新路径。 |
| [applyResult.mjs](../literature-translator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-translator/hooks/applyResult.mjs | 翻译工作流的结果回写 hook：读取译文与对齐产物文本，物化为文件并更新或创建 Zotero 附件。 |
| [buildRequest.mjs](../literature-deep-reading/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs | 深度阅读工作流的请求构建 hook：定位源附件、复用既有翻译对齐结果以减少重复翻译，再构建源 bundle 与请求参数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| findExistingTranslatorAlignment | 函数 | 86–127 | 在父条目附件中查找可复用的既有对齐结果，支持跨运行增量对齐。 |
| findOutputAttachmentForPath | 函数 | 129–156 | 按规范化路径在已有附件中定位目标输出附件，为重复运行提供幂等更新目标。 |
| isValidTranslatorAlignment | 函数 | 72–84 | 校验翻译对齐 JSON 的结构与条目完整性，缺失必要字段时判定无效。 |
| materializeTranslatorArtifacts | 函数 | 158–190 | 把译文与对齐结果写入工作区输出目录并返回文件清单，供后续附件导入使用。 |
| materializeTranslatorArtifactTexts | 函数 | 192–254 | 从 Agent 输出中取出译文与对齐文本，校验后物化为文件并返回路径映射。 |
| resolveTranslatorArtifactTargetPaths | 函数 | 46–62 | 由源附件路径推导译文与对齐产物的目标路径，保持 stem 一致并替换扩展名。 |
