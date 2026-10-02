
# workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-translator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-translator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs -->

翻译工作流的请求构建 hook：定位源附件、解析翻译参数并组装分段翻译请求。
源码：[workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs:buildRequestImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-translator/hooks/buildRequest.mjs:resolveSourceAttachment -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 68–70 | 简单 | workflow-hook、entry-point | 0 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| buildRequestImpl | 函数 | 33–66 | 简单 | request-builder、prompt-assembly、translation | 0 | 组装翻译请求：解析参数、确定目标语言与分段策略，拼装提示词输入。 |
| resolveSourceAttachment | 函数 | 13–23 | 简单 | attachment-lifecycle、selection、resolution | 0 | 定位待翻译的源附件，支持直接指定附件或从选中条目自动解析。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 68–70 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
