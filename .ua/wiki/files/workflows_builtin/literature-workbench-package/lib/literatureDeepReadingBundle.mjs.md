
# workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs -->

深度阅读 source-only bundle 构建器：把宿主产出的 sidecar 工件与 Markdown 内嵌图片重写为可移植相对路径，产出可迁移的 source bundle。
源码：[workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs)

## 符号（4）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:buildLiteratureDeepReadingSourceBundle -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:collectSidecarArtifacts -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:extractMarkdownImageReferences -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/literatureDeepReadingBundle.mjs:rewriteMarkdownImages -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildLiteratureDeepReadingSourceBundle | 函数 | 687–887 | 复杂 | builder、bundle、orchestration | 0 | source bundle 构建主入口：收集 sidecar 工件、重写 Markdown 本地图片引用并写出清单。 |
| collectSidecarArtifacts | 函数 | 499–685 | 复杂 | artifact、enumeration、hashing | 0 | 遍历深度阅读 sidecar 产出的全部工件，逐个计算 sha256 并登记到 bundle 条目。 |
| extractMarkdownImageReferences | 函数 | 122–204 | 中等 | markdown、parser | 0 | 从 Markdown 文本中抽出全部图片引用及其相对路径与 alt 描述。 |
| rewriteMarkdownImages | 函数 | 216–343 | 复杂 | markdown、portable、rewriting | 0 | 重写 Markdown 中的图片引用为 bundle 内的相对路径，同时搬运对应附件字节。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [importSchemas.mjs](importSchemas.mjs.md) | workflows_builtin/literature-workbench-package/lib/importSchemas.mjs | 导入产物的 schema 门面：把生成的 ajv 校验器包装成返回 { valid, errors } 的形式，并提供 references/citation/score 工件的解析入口。 |
| [path.mjs](path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [buildRequest.mjs](../literature-deep-reading/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-deep-reading/hooks/buildRequest.mjs | 深度阅读工作流的请求构建 hook：定位源附件、复用既有翻译对齐结果以减少重复翻译，再构建源 bundle 与请求参数。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildLiteratureDeepReadingSourceBundle | 函数 | 687–887 | source bundle 构建主入口：收集 sidecar 工件、重写 Markdown 本地图片引用并写出清单。 |
