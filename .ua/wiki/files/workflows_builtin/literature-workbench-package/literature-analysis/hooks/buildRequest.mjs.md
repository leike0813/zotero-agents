
# workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/literature-analysis/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/literature-analysis/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs -->

文献分析工作流的请求构建 hook：检查所选文献的附件与题录就绪度，必要时经元数据策展补全，再组装 Agent 请求。
源码：[workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs)

## 符号（5）
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs:buildRequestImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs:inspectReadiness -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs:readManagedNote -->
<!-- node: function:workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs:resolveSupportedIdentifier -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 354–356 | 简单 | workflow-hook、entry-point | 0 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| buildRequestImpl | 函数 | 248–352 | 复杂 | request-builder、orchestration、metadata | 0 | 组装文献分析请求：解析参数、触发元数据策展或标签治理补充，最终拼装提示词所需输入。 |
| inspectReadiness | 函数 | 147–246 | 复杂 | readiness-check、validation、orchestration | 0 | 分析就绪度主逻辑：核对附件、标识符与题录字段，产出阻塞项与可自动修复项清单。 |
| readManagedNote | 函数 | 77–145 | 中等 | note-reading、parsing、digest-note | 0 | 读取由插件托管的笔记产物，解析其结构化载荷并识别所属 note kind。 |
| resolveSupportedIdentifier | 函数 | 49–64 | 简单 | metadata、resolution、identifier | 0 | 从条目中挑选受支持的稳定标识符（DOI、ISBN、arXiv 等）并按优先级返回。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [importSchemas.mjs](../../lib/importSchemas.mjs.md) | workflows_builtin/literature-workbench-package/lib/importSchemas.mjs | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |
| [metadataCurator.mjs](../../lib/metadataCurator.mjs.md) | workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs | 文献元数据策展核心：从 Extra 字段与 URL 中挑选 DOI/ISBN/arXiv/PMID 等标识符，规范化书目字段与作者，并在改写前保护原始文种元数据。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |
| [tagRegulatorRequest.mjs](../../lib/tagRegulatorRequest.mjs.md) | workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs | 标签治理工作流的请求构建模块：从父条目抽取题录与标签、物化有效标签 YAML 与 digest Markdown 输入，产出可供 Agent 消费的请求参数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 354–356 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
