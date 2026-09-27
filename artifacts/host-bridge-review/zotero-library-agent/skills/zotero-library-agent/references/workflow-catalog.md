# 内置 Workflow 目录

## 作用域与权限

使用本 catalog 选择随 Zotero 插件提供的可能 workflow。它记录了用于构建此 surface 的 manifest 契约；它不证明该 workflow 已安装、已启用、与所选 backend 兼容或在运行时未变更。

执行前，按此顺序使用实时命令：

1. `zotero-bridge workflow list` 确认当前可用性。
2. 运行 `zotero-bridge workflow describe --workflow <id>` 获取当前选择、选项、provider、执行模式与输出契约。
3. `zotero-bridge workflow validate` 使用声明的选择形式或无选择形式，并带预期的 workflow 选项。
4. 对单独选择的 backend profile 使用 `zotero-bridge workflow profile describe` 与 `zotero-bridge workflow profile validate`。
5. 仅在有界请求与 Zotero 侧权限均为当前状态后执行 `zotero-bridge workflow submit`。
6. 读取返回的 admission 分支。对于直接接纳，保留每个返回的 `workflowRunId`；对于 host-queue 接纳，保留 `submissionId`，检查 `workflow submission get`，并用 `run list --submission` 关联已接纳任务。
7. 用真实 run handle 检查已接纳的执行，然后独立验证每个请求的 Product、artifact 或已变更 Zotero 对象。`workflow queue cancel` 仅用于仍在待处理的 `queueId`；它不是 run 取消。

当实时描述声明外部资源时，在描述与校验之间加入一次资源准备趟。确认非交互调用支持以及每个槽位的方向、基数、必填性与接受限制；上传 agent 可访问的输入并保留其不透明的 `fileId` 值；只请求声明的 bridge-download 输出。把相同绑定传给校验与提交而不替换路径，然后在认定该交付物完成前下载并核实每个返回的资源输出。

查阅捆绑 `zotero-bridge-cli` Skill 的 `workflow` 与 `run` 命令参考以获取确切 argv 与结构化恢复。

原生 Zotero 队列是待处理 workflow 单元与有界准入的唯一所有者。不要持久化第二个计划条目队列、在本地预留单元、重放不确定的条目，或推断最初没有 run handle 就意味着提交失败。已排队的提交是一个由 `submissionId` 标识的被接受 operation；其单元可以各自独立处于待处理、已准入、终止、失败或已取消状态。

## 在 workflows 之间选择

从研究结果出发，而不是从 workflow 名称出发：

- 获取 workflows 拥有外部 provider 交互、摄取或重复候选准备。
- Analysis workflow 拥有逐源 digest、翻译、提取、深度阅读或结构化分析 artifact。
- Synthesis workflow 拥有有界的跨源 topic、framing、graph 感知输出或研究 bundle。
- 策展 workflow 拥有可复用的分类或元数据/tag 提议逻辑，而最终 Zotero 更改仍遵循其声明的权限路径。
- Import/export workflows 拥有声明的包转换，而非任意库 mutation。

然后比较：

- 1. **结果：**描述是否承诺用户请求的交付物？
2. **选择：**实时执行输入契约与候选生成契约是否接受所解析的选择？
3. **执行模式：**执行是 Zotero 管理还是自有模式，当前 agent 能否满足该模式？
4. **Options：** 哪些 options 必填、哪些有默认值、哪些实质改变范围或输出？
5. **Provider：**是否需要 backend profile，是否兼容、已配置并单独验证？
6. **证据：**结果契约是否指名完成所需的 Product、artifact、实时变更或请求 bundle？
7. **权限：**提交、mutation、维护或 apply-back 是否引入当前 approval 边界？
8. **外部资源：** workflow 是否支持非交互调用，每个必需输入/输出槽位是否都能用上传的不透明句柄或 bridge-download 交付满足？

若两个 workflow 仍都看似可行，解释其声明结果或结果证据的差异，且仅当该选择重要时才询问。不要按标签相似度、emoji、包位置或其他来源的缓存成功来选择。

典型对话提示：

- "查找并导入文献"暗示获取/摄取候选；
- “总结这篇论文”暗示分析；
- “深度阅读这些 PDF”暗示面向附件的分析 workflow；
- “translate this source”提示翻译并带声明的输出 artifact；
- “这些文献合起来说了什么？”提示 synthesis；
- “create or update a topic”提示不同的 topic 生命周期 workflows；
- "prepare a manuscript literature frame"（准备手稿文献框架）暗示 framing workflow；
- "normalize tags or metadata"（规范化 tags 或元数据）暗示 curation，写入需独立审阅；
- "export the research bundle"（导出研究 bundle）暗示一个 export workflow，其 Product/asset 必须验证。

静态匹配只是候选。若实时 workflow 描述不同，使用实时契约并在执行前报告已变化的假设。

## 目录

### `collection-collector`

**Collection Collector**

查找符合 collection 含义的 library 文献，并把已审阅匹配加入该 Zotero collection。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/collection-collector/workflow.json`；core：`false`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`["collection","collectionScope"]`。
- Workflow 选项：
  - `collection`：`{"type":"string","required":true,"title":"Collection","description":"Existing Zotero collection that will receive matching literature.","allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":false,"valueFormat":"collectionRef","labelFormat":"path"}}`。
  - `collectionScope`: `{"type":"string","required":true,"title":"Collection Scope","description":"Meaning, research topic, or literature boundary represented by the collection."}`.
- 结果证据：`{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`。
- invocation 输入：使用 workflow id `collection-collector`、声明的无选择形式、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `export-literature-bundle`

**Export Literature Bundle**

将文献从当前选择、一个 Zotero collection 或当前库导出为可移植的 Research Product。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/export-literature-bundle/workflow.json`；核心：`false`。
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[{"id":"bundle","direction":"output","kind":"archive","cardinality":"one","required":true,"suggestedName":"literature-bundle.zip","accept":{"contentTypes":["application/zip"]}}]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"require":{"selection":{"allowMixed":false,"counts":{"attachments":{"exact":0},"notes":{"exact":0},"children":{"exact":0}}}},"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `mode`: `{"type":"string","title":"Export mode","description":"Choose the current selection, a collection, or the current library.","enum":["selection","collection","library"],"default":"selection"}`.
  - `targetCollection`：`{"type":"string","title":"Target collection","description":"Required in collection mode; use libraryId:collectionKey.","required":false,"allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":true,"valueFormat":"collectionRef","labelFormat":"path"}}`。
  - `sourceOnly`: `{"type":"boolean","title":"仅导出原文","description":"导出扁平结构的原文包，不包含笔记和分析工件，无法被「导入文献包」工作流导入。","default":false}`.
- 结果证据：`{"artifacts":[],"applyBack":true}`。
- 调用输入：当 provider 需要时，使用 workflow id `export-literature-bundle`、声明的无选择形式、声明的 workflow 选项及单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `export-research-bundle`

**导出 Research Bundle**

将面向手稿的研究材料、已分析的文献 artifacts 与 synthesis 证据导出到可移植捆绑包中。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/export-research-bundle/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源需求：`[{"id":"research-materialized-files","direction":"input","kind":"file","cardinality":"many","required":false,"accept":{"maxCount":1000,"maxBytes":17179869184}}]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
- `paperTitle`：{"type":"string","title":"Paper Title","description":"Working manuscript title used to find research materials."}。`{"type":"string","title":"Paper Title","description":"Working manuscript title used to find research materials."}`
- `articleType`：{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}。`{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}`
  - `researchContent`：`{"type":"string","title":"Research Content","description":"Research problem, methods, scope, and intended contribution."}`。
  - `maxTopics`：`{"type":"number","title":"Maximum Topics","default":5,"min":0,"max":10,"integer":true}`。
  - `maxCorePapers`: `{"type":"number","title":"Maximum Core Papers","default":20,"min":1,"max":50,"integer":true}`。
  - `maxRelatedPapers`：`{"type":"number","title":"Maximum Related Papers","default":80,"min":1,"max":200,"integer":true}`。
- 结果证据：{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/export-research-bundle-artifacts.json"],"applyBack":true}。`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/export-research-bundle-artifacts.json"],"applyBack":true}`
- 调用输入：当 provider 需要时，使用 workflow id `export-research-bundle`、声明的无选择形式、声明的 workflow 选项及单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `export-notes`

**导出 Notes**

把受支持的生成 Zotero notes 导出为可编辑的外部文件。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/export-notes/workflow.json`；core：`false`。
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：[{"id":"notes","direction":"output","kind":"archive","cardinality":"one","required":true,"suggestedName":"notes-export.zip","accept":{"contentTypes":["application/zip"]}}]。`[{"id":"notes","direction":"output","kind":"archive","cardinality":"one","required":true,"suggestedName":"notes-export.zip","accept":{"contentTypes":["application/zip"]}}]`
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"generated-note"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"generated-note-candidates"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：未声明任何选项。
- 结果证据：`{"artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `export-notes`、按 `generated-note` 分组的已验证 `all` 成员、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `import-literature-bundle`

**Import Literature Bundle**

导入文献 bundle，并对账其受支持的 Zotero 文献 artifacts。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/import-literature-bundle/workflow.json`；core：`false`。
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[{"id":"bundle","direction":"input","kind":"archive","cardinality":"one","required":true,"accept":{"extensions":[".zip"]}},{"id":"research-import-files","direction":"input","kind":"file","cardinality":"many","required":false,"accept":{"maxCount":1000,"maxBytes":17179869184}}]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：未声明任何选项。
- 结果证据：`{"artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `import-literature-bundle`、声明的无选择形式、声明的 workflow options，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `import-notes`

**Import Notes**

导入受支持的外部分析文件并 upsert 其生成的 Zotero notes。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/import-notes/workflow.json`；core：`false`。
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[{"id":"digest","direction":"input","kind":"file","cardinality":"one","required":false,"accept":{"extensions":[".md"]}},{"id":"references","direction":"input","kind":"file","cardinality":"one","required":false,"accept":{"extensions":[".json"]}},{"id":"citation-analysis","direction":"input","kind":"file","cardinality":"one","required":false,"accept":{"extensions":[".json"]}},{"id":"literature-score","direction":"input","kind":"file","cardinality":"one","required":false,"accept":{"extensions":[".json"]}},{"id":"custom-notes","direction":"input","kind":"file","cardinality":"many","required":false,"accept":{"extensions":[".md"]}}]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"parent"},"grouping":{"mode":"each"}},"validation":{"require":{"selection":{"allowMixed":false,"counts":{"parents":{"exact":1},"attachments":{"exact":0},"notes":{"exact":0},"children":{"exact":0}}}},"select":{"policy":"input-member","source":"selected"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `conflictPolicy`: `{"type":"string","enum":["error","overwrite","skip"],"default":"error"}`。
- 结果证据：`{"artifacts":[],"applyBack":true}`。
- invocation 输入：使用 workflow id `import-notes`、按 `parent` 分组的已验证 `each` 成员、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `literature-explainer`

**文献解释器**

为单一文献来源运行有状态的问题解答与研究笔记会话。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-explainer/workflow.json`；核心：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `language`: `{"type":"string","title":"Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":[],"applyBack":true}`。
- 调用输入：当 provider 需要时，使用 workflow id `literature-explainer`、按 `attachment` 分组的已验证 `each` 成员、声明的 workflow 选项及单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `literature-deep-reading`

**Literature Deep Reading**

为一个文献来源产生并应用详细的、有证据依据的深度阅读分析。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-deep-reading/workflow.json`；核心：`true`。
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[{"kind":"artifact-absent","phase":"availability","target":"deep-reading-html"}]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `target_language`: `{"type":"string","title":"Target Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- `mode`：{"type":"string","title":"Translation Mode","enum":["fast","high_quality"],"default":"fast"}。`{"type":"string","title":"Translation Mode","enum":["fast","high_quality"],"default":"fast"}`
- 结果证据：`{"fetchType":"bundle","resultJson":"literature-deep-reading.result.json","artifacts":["result/deep-reading.html","result/deep-reading-manifest.json"],"applyBack":true}`。
- 调用输入：使用 workflow id `literature-deep-reading`、按 `attachment` 分组的已验证 `each` 成员、声明的 workflow options，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `literature-analysis`

**Literature Analysis**

分析一篇文献来源，并将其 digest、结构化引用、citation analysis、literature score 与可选规范化 tags 应用到 Zotero。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-analysis/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[{"kind":"generated-note-readiness","phase":"availability","artifacts":[{"id":"digest","noteKinds":["digest"]},{"id":"references","noteKinds":["references"]},{"id":"citation-analysis","noteKinds":["citation-analysis"]},{"id":"score","noteKinds":["literature-score"],"payload":{"type":"literature-score-json","requirements":[{"pointer":"/schema","const":"literature_score.v1"},{"pointer":"/overall_score","type":"number","minimum":0,"maximum":100},{"pointer":"/confidence","type":"number","minimum":0,"maximum":1},{"pointer":"/confidence_adjusted_score","type":"number","minimum":0,"maximum":100},{"pointer":"/dimensions","type":"array","length":6}]}}],"modes":[{"id":"unavailable","allAvailable":["digest","references","citation-analysis","score"]},{"id":"score-only","allAvailable":["digest","references","citation-analysis"],"allUnavailable":["score"]},{"id":"full","default":true}],"acceptModes":["full","score-only"]}]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `language`: `{"type":"string","title":"Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
  - `auto_tag_regulator`: `{"type":"boolean","title":"Auto Tag Regulator","default":true}`。
  - `auto_tag_infer_tag`: `{"type":"boolean","title":"Infer tags","default":true,"visible_if":{"parameter":"auto_tag_regulator","equals":true}}`.
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["artifacts/digest.md","artifacts/references.json","artifacts/citation_analysis.json","artifacts/literature_score.json"],"applyBack":true}`。
- 调用输入：使用 workflow id `literature-analysis`、按 `attachment` 分组的已验证 `each` 成员、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `literature-translator`

**Literature Translator**

翻译一篇文献来源并应用翻译后的 artifact，同时保留学术结构。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-translator/workflow.json`；核心：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[{"kind":"artifact-absent","phase":"execute","target":"translator-markdown","parameter":"target_language"}]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `target_language`: `{"type":"string","title":"Target Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- `mode`：{"type":"string","title":"Mode","enum":["fast","high_quality"],"default":"fast"}。`{"type":"string","title":"Mode","enum":["fast","high_quality"],"default":"fast"}`
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `literature-translator`、按 `attachment` 分组的已验证 `each` 成员、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `literature-metadata-curator`

**Literature Metadata Curator**

使用标识符与搜索证据审计并修复所选文献的书目元数据。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-metadata-curator/workflow.json`；核心：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"parent"},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"input-member","source":"related"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `skip_identifier_fast_path`：`{"type":"boolean","title":"Skip identifier fast path","description":"Bypass Zotero identifier lookup and run literature-metadata-search directly.","default":false}`。
- 结果证据：`{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `literature-metadata-curator`、按 `parent` 分组的已验证 `each` 成员、声明的 workflow 选项，以及 provider 需要时单独校验的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `literature-search-ingest`

**文献搜索 Ingest**

搜索学术来源、审阅候选、以 agent 选择的子 agent 组研究已批准论文、在完成时收集独立的逐论文 payload，然后串行摄取进 Zotero。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-search-ingest/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
- `query`：{"type":"string","title":"Search Query","description":"Optional search query or seed. Leave blank with auto mode to start a guided search-planning conversation.","default":""}。`{"type":"string","title":"Search Query","description":"Optional search query or seed. Leave blank with auto mode to start a guided search-planning conversation.","default":""}`
  - `searchMode`: `{"type":"string","title":"Search Mode","description":"Choose auto detection, guided search planning, topic expansion, paper seed expansion, or exact targeted ingest.","default":"auto","enum":["auto","guided","topic_expansion","paper_seed_expansion","targeted_ingest"]}`.
  - `searchBreadth`: `{"type":"string","title":"Search Breadth","description":"Choose broad multi-lane discovery, balanced coverage, or a quick first pass.","default":"broad","enum":["broad","balanced","quick"]}`.
  - `languageHints`：`{"type":"array","title":"Language Hints","description":"Optional BCP 47 language hints such as en, zh-CN, ja, or de. They expand queries and sources but never filter other languages.","items":{"type":"string"},"default":[]}`。
  - `targetCollection`: `{"type":"string","title":"Target Collection","description":"Optional Zotero collection for created or existing items.","default":"","allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":true,"valueFormat":"collectionRef","labelFormat":"path"}}`。
- 结果证据：`{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `literature-search-ingest`、声明的无选择形式、声明的 workflow 选项，以及 provider 需要时单独校验的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `tag-bootstrapper`

**Tag Bootstrapper**

从当前 library 证据与可审阅建议引导受控 tag 词汇表。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/tag-bootstrapper/workflow.json`；核心：`false`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `tag_note_language`：`{"type":"string","title":"Tag Note Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- 结果证据：`{"fetchType":"result","artifacts":[],"applyBack":true}`。
- invocation 输入：使用 workflow id `tag-bootstrapper`、声明的无选择形式、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `tag-auditor`

**Tag 审计器**

对照受控词汇审计所选文献 tags，而不静默更改无关元数据。

- 包：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/tag-auditor/workflow.json`；核心：`false`。
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：未声明任何选项。
- 结果证据：`{"artifacts":[],"applyBack":true}`。
- 调用输入：当 provider 需要时，使用 workflow id `tag-auditor`、声明的无选择形式、声明的 workflow 选项及单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `tag-regulator`

**Tag Regulator**

对照受控词表规范化并推断所选文献的 tags。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/tag-regulator/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"parent"},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"input-member","source":"selected"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `infer_tag`：`{"type":"boolean","title":"Infer Tag","default":true}`。
  - `tag_note_language`：`{"type":"string","title":"Tag Note Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- 结果证据：`{"fetchType":"result","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `tag-regulator`、按 `parent` 分组的已验证 `each` 成员、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `mineru`

**MinerU**

将选定的 PDF attachment 转换为结构化 Markdown 与图像 artifact，并把结果附加到 Zotero。

- Package：`mineru`；manifest：`workflows_builtin/mineru/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"generic-http.steps.v1","acceptedProviderTypes":["generic-http"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"input-member","source":"related"},"filters":[{"kind":"source-file-exists","phase":"availability"},{"kind":"artifact-absent","phase":"availability","target":"mineru-markdown"}]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：未声明任何选项。
- 结果证据：`{"artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `mineru`、按 `attachment` 分组的已验证 `each` 成员、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `topic-planner`

**Topic Planner**

合成前，增量地将当前文献库组织为 Planned Topics 与 Topic Graph 关系。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/topic-planner/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
- `language`：{"type":"string","title":"Language","description":"Language for Planned Topic titles, definitions, and planning explanations.","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}。`{"type":"string","title":"Language","description":"Language for Planned Topic titles, definitions, and planning explanations.","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`
- 结果证据：`{"fetchType":"result","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `topic-planner`、声明的无选择形式、声明的 workflow options，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `create-topic-synthesis`

**Create Topic Synthesis**

在创建新 synthesis topic 之前，物化活动的 Planned Topic，或将自然语言 seed 解析到现有 Planned Topic。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow options：`["usePlannedTopic","plannedTopicId","topicSeed"]`。
- Workflow 选项：
- `usePlannedTopic`：{"type":"boolean","title":"Use Planned Topic","description":"Materialize an active Planned Topic instead of starting from an ad-hoc seed.","required":true,"default":false}。`{"type":"boolean","title":"Use Planned Topic","description":"Materialize an active Planned Topic instead of starting from an ad-hoc seed.","required":true,"default":false}`
  - `plannedTopicId`: `{"type":"string","title":"Planned Topic","description":"Active Planned Topic whose stored definition and resolver will be materialized.","required":true,"visible_if":{"parameter":"usePlannedTopic","equals":true},"allowCustom":false,"optionsSource":{"kind":"synthesis.topics","valueFormat":"topicId","labelFormat":"title","filter":"planned"}}`。
  - `topicSeed`: `{"type":"string","title":"Topic Seed","description":"Natural-language topic seed; a same-identity active Planned Topic is reused before a new topic is created.","required":true,"visible_if":{"parameter":"usePlannedTopic","equals":false}}`.
  - `language`: `{"type":"string","title":"Language","description":"Output language, such as auto, zh-CN, or en-US.","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
- 结果证据：`{"fetchType":"bundle","resultJson":"result/final-output.candidate.json","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `create-topic-synthesis`、声明的无选择形式、声明的 workflow 选项，以及 provider 需要时单独校验的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `update-topic-synthesis`

**Update Topic Synthesis**

从其当前 resolver 范围、证据与变更状态更新现有 topic synthesis。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
- `topicId`：{"type":"string","title":"Topic ID","description":"Existing synthesis topic id. The host derives update scope, mode, reason, and language from the selected topic.","allowCustom":false,"optionsSource":{"kind":"synthesis.topics","valueFormat":"topicId","labelFormat":"title","filter":"updatable"}}。`{"type":"string","title":"Topic ID","description":"Existing synthesis topic id. The host derives update scope, mode, reason, and language from the selected topic.","allowCustom":false,"optionsSource":{"kind":"synthesis.topics","valueFormat":"topicId","labelFormat":"title","filter":"updatable"}}`
- 结果证据：`{"fetchType":"bundle","resultJson":"result/final-output.candidate.json","artifacts":[],"applyBack":true}`。
- 调用输入：使用 workflow id `update-topic-synthesis`、声明的无选择形式、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。

### `manuscript-literature-framing`

**Manuscript Literature Framing**

从所选 synthesis topics 与 library 证据生成手稿引言与相关工作框架。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/manuscript-literature-framing/workflow.json`；core：`true`。
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`。
- 执行模式：`["auto"]`。
- 支持的调用模式：`["interactive","non-interactive"]`。
- 外部资源要求：`[]`。
- 选择：`{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`。
- 必需 workflow 选项：`[]`。
- Workflow 选项：
  - `paperTitle`: `{"type":"string","title":"Paper Title","description":"Working manuscript title used to frame the Introduction and Related Work."}`。
  - `language`：`{"type":"string","title":"Language","description":"Output language, such as auto, zh-CN, or en-US.","default":"auto"}`。
  - `targetVenue`: `{"type":"string","title":"Target Venue","description":"Target journal, conference, or style family.","default":""}`。
- `articleType`：{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}。`{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}`
- `stylePreference`：{"type":"string","title":"Style Preference","description":"Optional writing preference, such as concise, IEEE-like, Nature-like, or Chinese draft.","default":""}。`{"type":"string","title":"Style Preference","description":"Optional writing preference, such as concise, IEEE-like, Nature-like, or Chinese draft.","default":""}`
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/manuscript-literature-framing-artifacts.json"],"applyBack":true}`。
- invocation 输入：使用 workflow id `manuscript-literature-framing`、声明的无选择形式、声明的 workflow 选项，以及当 provider 需要时单独验证的兼容 provider profile。
- 外部调用输入：当声明了资源需求时，按照实时的槽位契约使用已上传的不透明输入句柄与 bridge-download 输出交付；绝不传递客户端或 Host 路径。
