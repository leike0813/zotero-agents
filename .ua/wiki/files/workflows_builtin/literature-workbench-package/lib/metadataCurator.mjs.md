
# workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/lib](../../../../modules/workflows_builtin/literature-workbench-package/lib.md)
<!-- node: file:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs -->

文献元数据策展核心：从 Extra 字段与 URL 中挑选 DOI/ISBN/arXiv/PMID 等标识符，规范化书目字段与作者，并在改写前保护原始文种元数据。
源码：[workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs](../../../../../../workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs)

## 符号（8）
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:candidateMatchesIdentifier -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:normalizeCreators -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:normalizeMetadataFields -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:protectOriginalScriptMetadata -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:resolveCanonicalResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:selectIdentifier -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:selectIdentifierFromExtra -->
<!-- node: function:workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs:selectIdentifierFromUrl -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| candidateMatchesIdentifier | 函数 | 355–390 | 中等 | matching、metadata | 0 | 判断候选条目是否与目标标识符匹配，是去重与合并的关键判据。 |
| normalizeCreators | 函数 | 318–353 | 中等 | normalization、metadata | 0 | 把作者列表规范化为规范的姓/名结构并清理空值与全角字符。 |
| normalizeMetadataFields | 函数 | 296–316 | 简单 | normalization、metadata | 0 | 对题名、期刊、年份等核心字段做统一裁剪与大小写归一。 |
| protectOriginalScriptMetadata | 函数 | 438–485 | 中等 | metadata、safety | 0 | 改写前保护原始文种下的题名与期刊名，避免被英文译名覆盖。 |
| resolveCanonicalResult | 函数 | 568–581 | 中等 | metadata、orchestration、entry-point | 0 | 元数据策展入口：按标识符匹配库内条目并产出 canonical 结果，必要时回退到上下文快照。 |
| selectIdentifier | 函数 | 262–294 | 中等 | identifier-resolution、metadata | 0 | 按优先级依次从 Extra、URL 与已存字段中挑选最可靠的一个标识符。 |
| selectIdentifierFromExtra | 函数 | 117–144 | 简单 | identifier-resolution、parser | 0 | 从 Zotero Extra 行的 Citation Key 风格文本中解析出候选标识符。 |
| selectIdentifierFromUrl | 函数 | 146–195 | 中等 | identifier-resolution、parser | 0 | 从 DOI/arXiv/PubMed 等常见 URL 形态中反解出标识符。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyResult.mjs](../literature-metadata-curator/hooks/applyResult.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs | 元数据策展工作流的结果回写 hook：把策展得到的题录字段写回条目，并清理策展过程产生的临时标记与产物。 |
| [buildRequest.mjs](../literature-analysis/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs | 文献分析工作流的请求构建 hook：检查所选文献的附件与题录就绪度，必要时经元数据策展补全，再组装 Agent 请求。 |
| [buildRequest.mjs](../literature-metadata-curator/hooks/buildRequest.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs | 元数据策展工作流的请求构建 hook：解析任务名与元数据请求参数，组装供 Agent 补全题录的请求。 |
| [preflight.mjs](../literature-metadata-curator/hooks/preflight.mjs.md) | workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs | 元数据策展工作流的 preflight hook：解析条目标识符、在受控数据源中查找权威题录，并给出可执行状态供 UI 展示。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| candidateMatchesIdentifier | 函数 | 355–390 | 判断候选条目是否与目标标识符匹配，是去重与合并的关键判据。 |
| normalizeCreators | 函数 | 318–353 | 把作者列表规范化为规范的姓/名结构并清理空值与全角字符。 |
| normalizeMetadataFields | 函数 | 296–316 | 对题名、期刊、年份等核心字段做统一裁剪与大小写归一。 |
| protectOriginalScriptMetadata | 函数 | 438–485 | 改写前保护原始文种下的题名与期刊名，避免被英文译名覆盖。 |
| resolveCanonicalResult | 函数 | 568–581 | 元数据策展入口：按标识符匹配库内条目并产出 canonical 结果，必要时回退到上下文快照。 |
| selectIdentifier | 函数 | 262–294 | 按优先级依次从 Extra、URL 与已存字段中挑选最可靠的一个标识符。 |
| selectIdentifierFromExtra | 函数 | 117–144 | 从 Zotero Extra 行的 Citation Key 风格文本中解析出候选标识符。 |
| selectIdentifierFromUrl | 函数 | 146–195 | 从 DOI/arXiv/PubMed 等常见 URL 形态中反解出标识符。 |
