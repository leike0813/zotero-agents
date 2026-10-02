
# workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs -->

标签治理工作流的请求构建模块：从父条目抽取题录与标签、物化有效标签 YAML 与 digest Markdown 输入，产出可供 Agent 消费的请求参数。
源码：[workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs)

## 符号（11）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:buildTagRegulatorInputFromParent -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:buildTagRegulatorStandaloneRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:collectInputTagsFromParent -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:collectMetadataFromParent -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:joinPath -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:loadSynthesisVocabularyTagsOrThrow -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:materializeDigestMarkdown -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:materializeValidTagsYaml -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:normalizeVocabularyTags -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:parseBooleanLike -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/tagRegulatorRequest.mjs:resolveRequestParameters -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildTagRegulatorInputFromParent | 函数 | 280–318 | 中等 | request-builder、orchestration、tag-vocabulary | 0 | 以选中父条目为基准组装标签治理请求：题录、输入标签、词表与物化输入文件一次成型。 |
| buildTagRegulatorStandaloneRequest | 函数 | 320–363 | 中等 | request-builder、orchestration、standalone | 0 | 在无父条目场景下按显式参数组装独立标签治理请求，仍完成词表与输入物化。 |
| collectInputTagsFromParent | 函数 | 222–241 | 简单 | metadata、tag-vocabulary、extraction | 0 | 收集父条目及其关联文献的现有标签，转换为请求的输入标签集合。 |
| collectMetadataFromParent | 函数 | 186–220 | 中等 | metadata、extraction、normalization | 0 | 从父条目抽取标题、作者、年份、DOI 等题录字段并归一化为请求元数据。 |
| joinPath | 函数 | 27–53 | 中等 | path-handling、utility、cross-platform | 0 | 该模块内部的跨平台路径拼接实现，与 lib/path.mjs 同语义但覆盖物化场景的额外分支。 |
| loadSynthesisVocabularyTagsOrThrow | 函数 | 93–111 | 简单 | tag-vocabulary、host-api、error-handling | 0 | 经宿主读取 Synthesis 词表，失败时抛出明确错误而不是静默使用空词表。 |
| materializeDigestMarkdown | 函数 | 145–162 | 简单 | materialization、markdown、file-io | 0 | 生成并物化标签治理所需的 digest Markdown 输入文件，包含条目题录与现有标签。 |
| materializeValidTagsYaml | 函数 | 126–139 | 简单 | materialization、file-io、tag-vocabulary | 0 | 把有效标签写入暂存区的 YAML 文件并返回其引用，供请求上传路径使用。 |
| normalizeVocabularyTags | 函数 | 55–91 | 中等 | normalization、tag-vocabulary、validation | 0 | 归一化受控词表标签对象：规范名称、facet、缩写映射与父级绑定，并剔除非法项。 |
| parseBooleanLike | 函数 | 243–260 | 简单 | parsing、normalization、utility | 0 | 把工作流参数中的类布尔值（true/false/1/yes 等）解析为布尔，容错非法输入。 |
| resolveRequestParameters | 函数 | 262–278 | 简单 | request-builder、configuration、resolution | 0 | 合并工作流参数与宿主上下文，得到标签治理请求的最终参数集。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [digestPayload.mjs](digestPayload.mjs.md) | workflows_builtin/literature-workbench-package/lib/digestPayload.mjs | 从父条目的托管笔记中定位唯一的 digest 笔记并返回其 Markdown 载荷，检测到多份时按冲突失败。 |
| [runtime.mjs](runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [buildRequest.mjs](../literature-analysis/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs | 文献分析工作流的请求构建 hook：检查所选文献的附件与题录就绪度，必要时经元数据策展补全，再组装 Agent 请求。 |
| [buildRequest.mjs](../tag-regulator/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/tag-regulator/hooks/buildRequest.mjs | 标签治理工作流的请求构建 hook：委托 lib/tagRegulatorRequest 组装独立请求，本文件只负责 runtime scope 包装与错误归一化。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildTagRegulatorInputFromParent | 函数 | 280–318 | 以选中父条目为基准组装标签治理请求：题录、输入标签、词表与物化输入文件一次成型。 |
| buildTagRegulatorStandaloneRequest | 函数 | 320–363 | 在无父条目场景下按显式参数组装独立标签治理请求，仍完成词表与输入物化。 |
| collectInputTagsFromParent | 函数 | 222–241 | 收集父条目及其关联文献的现有标签，转换为请求的输入标签集合。 |
| collectMetadataFromParent | 函数 | 186–220 | 从父条目抽取标题、作者、年份、DOI 等题录字段并归一化为请求元数据。 |
| joinPath | 函数 | 27–53 | 该模块内部的跨平台路径拼接实现，与 lib/path.mjs 同语义但覆盖物化场景的额外分支。 |
| loadSynthesisVocabularyTagsOrThrow | 函数 | 93–111 | 经宿主读取 Synthesis 词表，失败时抛出明确错误而不是静默使用空词表。 |
| materializeDigestMarkdown | 函数 | 145–162 | 生成并物化标签治理所需的 digest Markdown 输入文件，包含条目题录与现有标签。 |
| materializeValidTagsYaml | 函数 | 126–139 | 把有效标签写入暂存区的 YAML 文件并返回其引用，供请求上传路径使用。 |
| normalizeVocabularyTags | 函数 | 55–91 | 归一化受控词表标签对象：规范名称、facet、缩写映射与父级绑定，并剔除非法项。 |
| resolveRequestParameters | 函数 | 262–278 | 合并工作流参数与宿主上下文，得到标签治理请求的最终参数集。 |
