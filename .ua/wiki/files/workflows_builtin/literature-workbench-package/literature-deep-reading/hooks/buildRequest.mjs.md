
# workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-deep-reading/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-deep-reading/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs -->

深度阅读工作流的请求构建 hook：定位源附件、复用既有翻译对齐结果以减少重复翻译，再构建源 bundle 与请求参数。
源码：[workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs)

## 符号（2）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs:buildRequestImpl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 159–161 | 简单 | workflow-hook、entry-point | 0 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| buildRequestImpl | 函数 | 24–157 | 复杂 | request-builder、orchestration、deep-reading | 0 | 构建深读请求：解析参数、查找已有对齐产物、生成源 bundle，并按需安排翻译与深读两个阶段。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureDeepReadingBundle.mjs](../../lib/literatureDeepReadingBundle.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs | 深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [translatorArtifacts.mjs](../../lib/translatorArtifacts.mjs.md) | workflows_builtin/literature-workbench-package/lib/translatorArtifacts.mjs | 翻译工作流产物模块：确定译文与对齐结果的落盘路径、校验对齐 JSON 合法性，并把译文物化为 Zotero 附件。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 159–161 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
