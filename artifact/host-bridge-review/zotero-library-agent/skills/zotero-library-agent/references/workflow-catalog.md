# 内建 Workflow 目录

## 范围与权威性

使用本目录选择随 Zotero 插件发布的可能 workflow。它记录构建此发布面时采用的 manifest 合同；不证明该 workflow 在运行时已安装、已启用、与所选 backend 兼容或保持不变。

执行前，按以下顺序使用实时命令：

1. 运行 `zotero-bridge workflow list --json` 确认当前可用性。
2. 运行 `zotero-bridge workflow describe --workflow <id> --json` 获取当前 selection、option、provider、execution-mode 与 output 合同。
3. 使用已声明 selection 或 no-selection 形式以及预期 workflow option 运行 `zotero-bridge workflow validate`。
4. 对另行选择的 backend profile 运行 `zotero-bridge workflow profile describe` 与 `zotero-bridge workflow profile validate`。
5. 只有有边界请求与 Zotero 端权限均为当前有效时，才运行 `zotero-bridge workflow submit`。
6. 使用返回的 run handle 检查执行，并分别验证每个请求的 Product、artifact 或已变更 Zotero 对象。

精确 argv 与结构化恢复方式请查阅随附 `zotero-bridge-cli` Skill 的 `workflow` 和 `run` 命令参考。

## 在 workflow 之间进行选择

从研究成果开始，而不是从 workflow 名字开始：

- 获取 workflows 自己的外部 provider 交互、摄取或重复候选者准备。
- 分析 workflows 拥有每个来源的摘要、翻译、摘录、深度阅读或结构化分析 artifacts。
- Synthesis workflows 拥有有限的跨源主题、框架、图形感知输出或研究包。
- Curation workflows拥有可重用的分类或元数据/标签提议逻辑，而最终的 Zotero 更改仍然遵循其声明的权威路径。
- 导入/导出workflows自己声明的包转换，而不是任意库写入变更。

然后比较：

1. **结果：** 描述是否承诺用户请求的可交付成果？
2. **选择：**实时输入单元是否接受已解决的项目、父项、附件或空 selection表格？
3. **执行模式：**执行 Zotero 是托管还是自有，当前agent是否满足该模式？
4. **选项：**哪些选项是必需的，哪些有默认值，哪些会实质性地改变范围或输出？
5. **Provider：** backend profile 是否必需、兼容、配置并单独验证？
6. **证据：** 结果合约是否命名了完成所需的Product、artifact、实时变更或请求包？
7. **权威：** 提交、变更、维护或申请返回是否引入了当前的批准边界？

如果两个workflows仍然可信，请解释其声明的结果或结果证据的差异，并仅在该选择重要时询问。不要根据标签相似性、表情符号、包位置或来自其他来源的缓存成功进行选择。

典型的对话线索：

- “查找并导入文献”建议获取/摄取候选者；
- “总结本文”建议进行分析；
- “深入阅读这些 PDF”建议进行面向附件的分析 workflow；
- “翻译此源”建议使用声明的输出artifact进行翻译；
- “这些文献一起说了什么？”建议综合；
- “创建或更新主题”表明不同的主题生命周期workflows；
- “准备手稿文献框架”建议采用框架 workflow；
- “标准化标签或元数据”建议进行策划，并独立审查写入内容；
- “导出研究包”建议导出 workflow，其Product/资产必须经过验证。

静态匹配只是一个候选。如果实时 workflow 描述不同，请使用实时合约并在执行前报告更改的假设。

## 目录

### `collection-collector`

**Collection 收集器**

查找与某个 collection 含义匹配的文献库文献，并把经过审阅的匹配项加入该 Zotero collection。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/collection-collector/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`["collection","collectionScope"]`.
- Workflow option：
  - `collection`：`{"type":"string","required":true,"title":"Collection","description":"Existing Zotero collection that will receive matching literature.","allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":false,"valueFormat":"collectionRef","labelFormat":"path"}}`。
  - `collectionScope`：`{"type":"string","required":true,"title":"Collection Scope","description":"Meaning, research topic, or literature boundary represented by the collection."}`。
- 结果证据：`{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `collection-collector`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `export-literature-bundle`

**导出文献 bundle**

把选定文献及其生成的分析 artifact 导出为可移植 bundle。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/export-literature-bundle/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow","validation":{"excludes":[],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：未声明。
- 结果证据：`{"artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `export-literature-bundle`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `export-research-bundle`

**导出研究 bundle**

把面向稿件的研究材料、已分析文献 artifact 与综合证据导出为可移植 bundle。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/export-research-bundle/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `paperTitle`：`{"type":"string","title":"Paper Title","description":"Working manuscript title used to find research materials."}`。
  - `articleType`：`{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}`。
  - `researchContent`：`{"type":"string","title":"Research Content","description":"Research problem, methods, scope, and intended contribution."}`。
  - `maxTopics`：`{"type":"number","title":"Maximum Topics","default":5}`。
  - `maxCorePapers`：`{"type":"number","title":"Maximum Core Papers","default":20}`。
  - `maxRelatedPapers`：`{"type":"number","title":"Maximum Related Papers","default":80}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/export-research-bundle-artifacts.json"],"applyBack":true}`.
- 调用输入：使用 workflow id `export-research-bundle`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `export-notes`

**导出笔记**

把受支持的已生成 Zotero note 导出为可编辑外部文件。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/export-notes/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow","validation":{"policy":"generated-note-candidates","excludes":[],"derives":["exportCandidates"]}}`.
- 必需 workflow option：`[]`.
- Workflow option：未声明。
- 结果证据：`{"artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `export-notes`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `import-literature-bundle`

**导入文献 bundle**

导入文献 bundle，并协调其中受支持的 Zotero 文献 artifact。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/import-literature-bundle/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：未声明。
- 结果证据：`{"artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `import-literature-bundle`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `import-notes`

**导入笔记**

导入受支持的外部分析文件，并 upsert 对应的已生成 Zotero note。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/import-notes/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"parent","validation":{"policy":"selected-parent","excludes":[],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：未声明。
- 结果证据：`{"artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `import-notes`、经过校验的 `parent` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `literature-explainer`

**文献讲解器**

针对一个文献来源运行有状态问答与学习笔记 session。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-explainer/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]},"perParent":{"min":1,"max":1},"validation":{"policy":"literature-source","excludes":[],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `language`：`{"type":"string","title":"Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `literature-explainer`、经过校验的 `attachment` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `literature-deep-reading`

**文献深度阅读**

针对一个文献来源生成并应用详细且以证据为基础的深度阅读分析。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-deep-reading/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]},"perParent":{"min":1,"max":1},"validation":{"policy":"literature-source","excludes":["artifact-exists"],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `target_language`：`{"type":"string","title":"Target Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
  - `mode`：`{"type":"string","title":"Translation Mode","enum":["fast","high_quality"],"default":"fast"}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"literature-deep-reading.result.json","artifacts":["result/deep-reading.html","result/deep-reading-manifest.json"],"applyBack":true}`.
- 调用输入：使用 workflow id `literature-deep-reading`、经过校验的 `attachment` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `literature-analysis`

**文献分析**

分析一个文献来源，并把摘要、结构化参考文献、引文分析与可选规范化 tag 应用到 Zotero。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-analysis/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]},"perParent":{"min":1,"max":1},"validation":{"policy":"literature-source","excludes":["generated-notes-all"],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `language`：`{"type":"string","title":"Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
  - `auto_tag_regulator`：`{"type":"boolean","title":"Auto Tag Regulator","default":true}`。
  - `auto_tag_infer_tag`：`{"type":"boolean","title":"Infer tags","default":true,"visible_if":{"parameter":"auto_tag_regulator","equals":true}}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["artifacts/digest.md","artifacts/references.json","artifacts/citation_analysis.json"],"applyBack":true}`.
- 调用输入：使用 workflow id `literature-analysis`、经过校验的 `attachment` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `literature-translator`

**文献翻译**

翻译一个文献来源，在保留学术结构的同时应用翻译 artifact。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-translator/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]},"perParent":{"min":1,"max":1},"validation":{"policy":"literature-source","excludes":["artifact-exists"],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `target_language`：`{"type":"string","title":"Target Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
  - `mode`：`{"type":"string","title":"Mode","enum":["fast","high_quality"],"default":"fast"}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `literature-translator`、经过校验的 `attachment` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `literature-metadata-curator`

**文献元数据整理器**

依据 identifier 与搜索证据，审计并修复所选文献的书目元数据。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-metadata-curator/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"parent","validation":{"policy":"literature-parent","excludes":[],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `skip_identifier_fast_path`：`{"type":"boolean","title":"Skip identifier fast path","description":"Bypass Zotero identifier lookup and run literature-metadata-search directly.","default":false}`。
- 结果证据：`{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `literature-metadata-curator`、经过校验的 `parent` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `literature-search-ingest`

**文献搜索与摄取**

搜索学术来源、审阅候选项，并把带 provenance 的去重文献摄取到 Zotero 文献库。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/literature-search-ingest/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `query`：`{"type":"string","title":"Search Query","description":"Optional search query or seed. Leave blank with auto mode to start a guided search-planning conversation.","default":""}`。
  - `searchMode`：`{"type":"string","title":"Search Mode","description":"Choose auto detection, guided search planning, topic expansion, paper seed expansion, or exact targeted ingest.","default":"auto","enum":["auto","guided","topic_expansion","paper_seed_expansion","targeted_ingest"]}`。
  - `searchBreadth`：`{"type":"string","title":"Search Breadth","description":"Choose broad multi-lane discovery, balanced coverage, or a quick first pass.","default":"broad","enum":["broad","balanced","quick"]}`。
  - `languageHints`：`{"type":"array","title":"Language Hints","description":"Optional BCP 47 language hints such as en, zh-CN, ja, or de. They expand queries and sources but never filter other languages.","items":{"type":"string"},"default":[]}`。
  - `targetCollection`：`{"type":"string","title":"Target Collection","description":"Optional Zotero collection for created or existing items.","default":"","allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":true,"valueFormat":"collectionRef","labelFormat":"path"}}`。
- 结果证据：`{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `literature-search-ingest`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `tag-bootstrapper`

**Tag 词表引导器**

依据当前文献库证据与可审阅建议，初始化受控 tag 词表。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/tag-bootstrapper/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `tag_note_language`：`{"type":"string","title":"Tag Note Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- 结果证据：`{"fetchType":"result","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `tag-bootstrapper`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `tag-auditor`

**Tag 审计器**

依据受控词表审计所选文献 tag，不悄然更改无关元数据。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/tag-auditor/workflow.json`；core：`false`.
- Provider 要求：`{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：未声明。
- 结果证据：`{"artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `tag-auditor`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `tag-regulator`

**Tag 规范器**

依据受控词表规范化并推断所选文献 tag。

- Package：`literature-workbench-package`；manifest：`workflows_builtin/literature-workbench-package/tag-regulator/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"parent"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `infer_tag`：`{"type":"boolean","title":"Infer Tag","default":true}`。
  - `tag_note_language`：`{"type":"string","title":"Tag Note Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- 结果证据：`{"fetchType":"result","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `tag-regulator`、经过校验的 `parent` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `mineru`

**MinerU**

把所选 PDF attachment 转换为结构化 Markdown 与图片 artifact，并把结果附加到 Zotero。

- Package：`mineru`；manifest：`workflows_builtin/mineru/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"generic-http.steps.v1","acceptedProviderTypes":["generic-http"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":false,"inputUnit":"attachment","accepts":{"mime":["application/pdf"]},"validation":{"policy":"pdf-attachment","excludes":["artifact-exists"],"derives":[]}}`.
- 必需 workflow option：`[]`.
- Workflow option：未声明。
- 结果证据：`{"artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `mineru`、经过校验的 `attachment` selection、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `create-topic-synthesis`

**创建主题综合**

使用当前文献库、参考文献与 citation-graph 证据，从自然语言 seed 创建新的 topic synthesis。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `topicSeed`：`{"type":"string","title":"Topic Seed","description":"Natural-language topic seed for a new synthesis topic."}`。
  - `language`：`{"type":"string","title":"Language","description":"Output language, such as auto, zh-CN, or en-US.","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/final-output.candidate.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `create-topic-synthesis`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `update-topic-synthesis`

**更新主题综合**

依据现有 topic synthesis 的当前 resolver scope、证据与变更状态进行更新。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `topicId`：`{"type":"string","title":"Topic ID","description":"Existing synthesis topic id. The host derives update scope, mode, reason, and language from the selected topic.","allowCustom":false,"optionsSource":{"kind":"synthesis.topics","valueFormat":"topicId","labelFormat":"title","filter":"updatable"}}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/final-output.candidate.json","artifacts":[],"applyBack":true}`.
- 调用输入：使用 workflow id `update-topic-synthesis`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。

### `manuscript-literature-framing`

**稿件文献框架**

依据所选 synthesis topic 与文献库证据，生成稿件引言和相关工作框架。

- Package：`synthesis-layer`；manifest：`workflows_builtin/synthesis-layer/manuscript-literature-framing/workflow.json`；core：`true`.
- Provider 要求：`{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- 执行模式：`["auto"]`.
- Selection：`{"acceptsNoSelection":true,"inputUnit":"workflow"}`.
- 必需 workflow option：`[]`.
- Workflow option：
  - `paperTitle`：`{"type":"string","title":"Paper Title","description":"Working manuscript title used to frame the Introduction and Related Work."}`。
  - `language`：`{"type":"string","title":"Language","description":"Output language, such as auto, zh-CN, or en-US.","default":"auto"}`。
  - `targetVenue`：`{"type":"string","title":"Target Venue","description":"Target journal, conference, or style family.","default":""}`。
  - `articleType`：`{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}`。
  - `stylePreference`：`{"type":"string","title":"Style Preference","description":"Optional writing preference, such as concise, IEEE-like, Nature-like, or Chinese draft.","default":""}`。
- 结果证据：`{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/manuscript-literature-framing-artifacts.json"],"applyBack":true}`.
- 调用输入：使用 workflow id `manuscript-literature-framing`、已声明的 no-selection 形式、已声明 workflow option；provider 要求 profile 时，另行使用经过校验的兼容 provider profile。
