
# workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs -->

元数据策展工作流的请求构建 hook：解析任务名与元数据请求参数，组装供 Agent 补全题录的请求。
源码：[workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs:buildRequestImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs:resolveTaskName -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 62–66 | 简单 | workflow-hook、entry-point | 0 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| buildRequestImpl | 函数 | 20–60 | 简单 | request-builder、metadata、prompt-assembly | 0 | 组装元数据策展请求：解析参数、判定缺失字段并生成针对性的补全提示。 |
| resolveTaskName | 函数 | 14–18 | 简单 | configuration、resolution、utility | 0 | 从参数中解析策展任务名，缺省时回落到默认的题录补全任务。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [metadataCurator.mjs](../../lib/metadataCurator.mjs.md) | workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs | 文献元数据策展核心：从 Extra 字段与 URL 中挑选 DOI/ISBN/arXiv/PMID 等标识符，规范化书目字段与作者，并在改写前保护原始文种元数据。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 62–66 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
