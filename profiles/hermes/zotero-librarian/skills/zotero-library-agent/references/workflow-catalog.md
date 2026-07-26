# Built-in Workflow Catalog

## Scope and authority

Use this catalog to select a likely workflow that ships with the Zotero plugin. It records the manifest contract used to build this surface; it does not prove that the workflow is installed, enabled, compatible with the selected backend, or unchanged at runtime.

Before execution, use live commands in this order:

1. `zotero-bridge workflow list` to confirm current availability.
2. `zotero-bridge workflow describe --workflow <id>` to obtain the current selection, option, provider, execution-mode, and output contract.
3. `zotero-bridge workflow validate` with either the declared selection or no-selection form and the intended workflow options.
4. `zotero-bridge workflow profile describe` and `zotero-bridge workflow profile validate` for the separately selected backend profile.
5. `zotero-bridge workflow submit` only after the bounded request and Zotero-side authority are current.
6. Read the returned admission branch. For direct admission, preserve each returned `workflowRunId`; for host-queue admission, preserve `submissionId`, inspect `workflow submission get`, and correlate admitted tasks with `run list --submission`.
7. Use real run handles to inspect admitted execution, then verify every requested Product, artifact, or changed Zotero object independently. Use `workflow queue cancel` only for a still-pending `queueId`; it is not run cancellation.

Consult the bundled `zotero-bridge-cli` Skill's `workflow` and `run` command references for exact argv and structured recovery.

The native Zotero queue is the only owner of pending workflow units and bounded admission. Do not persist a second plan-entry queue, reserve units locally, replay uncertain entries, or infer that the initial absence of a run handle means submission failed. A queued submission is one accepted operation identified by `submissionId`; its units may be pending, admitted, terminal, failed, or canceled independently.

## Choosing among workflows

Start from the research outcome, not from a workflow name:

- Acquisition workflows own external provider interaction, ingest, or repeated candidate preparation.
- Analysis workflows own per-source digest, translation, extraction, deep reading, or structured analytical artifacts.
- Synthesis workflows own bounded cross-source topics, framing, graph-aware outputs, or research bundles.
- Curation workflows own reusable classification or metadata/tag proposal logic, while the final Zotero change still follows its declared authority path.
- Import/export workflows own declared package transformations, not arbitrary library mutation.

Then compare:

1. **Outcome:** Does the description promise the deliverable the user requested?
2. **Selection:** Do the live execution-input contract and candidate-production contract accept the resolved selection?
3. **Execution mode:** Is execution Zotero-managed or self-owned, and can the current agent satisfy that mode?
4. **Options:** Which options are required, which have defaults, and which materially change scope or output?
5. **Provider:** Is a backend profile required, compatible, configured, and separately validated?
6. **Evidence:** Does the result contract name the Product, artifact, live change, or request bundle needed for completion?
7. **Authority:** Does submission, mutation, maintenance, or apply-back introduce a current approval boundary?

If two workflows remain plausible, explain the difference in their declared outcomes or result evidence and ask only when that choice matters. Do not choose by label similarity, emoji, package position, or a cached success from another source.

Typical conversational cues:

- “find and import literature” suggests an acquisition/ingest candidate;
- “summarize this paper” suggests analysis;
- “deep read these PDFs” suggests an attachment-oriented analysis workflow;
- “translate this source” suggests translation with a declared output artifact;
- “what does this literature say together?” suggests synthesis;
- “create or update a topic” suggests distinct topic lifecycle workflows;
- “prepare a manuscript literature frame” suggests a framing workflow;
- “normalize tags or metadata” suggests curation, with writes independently reviewed;
- “export the research bundle” suggests an export workflow whose Product/asset must be verified.

A static match is only a candidate. If the live workflow description differs, use the live contract and report the changed assumption before execution.

## Catalog

### `collection-collector`

**Collection Collector**

Find library literature matching a collection meaning and add reviewed matches to that Zotero collection.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/collection-collector/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `["collection","collectionScope"]`.
- Workflow options:
  - `collection`: `{"type":"string","required":true,"title":"Collection","description":"Existing Zotero collection that will receive matching literature.","allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":false,"valueFormat":"collectionRef","labelFormat":"path"}}`.
  - `collectionScope`: `{"type":"string","required":true,"title":"Collection Scope","description":"Meaning, research topic, or literature boundary represented by the collection."}`.
- Result evidence: `{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `collection-collector`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `export-literature-bundle`

**Export Literature Bundle**

Export selected literature and its generated analysis artifacts into a portable bundle.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/export-literature-bundle/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"require":{"selection":{"allowMixed":false,"counts":{"parents":{"min":1},"attachments":{"exact":0},"notes":{"exact":0},"children":{"exact":0}}}},"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `sourceOnly`: `{"type":"boolean","title":"仅导出原文","description":"导出扁平结构的原文包，不包含笔记和分析工件，无法被「导入文献包」工作流导入。","default":false}`.
- Result evidence: `{"artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `export-literature-bundle`, validated `selection` members grouped by `all`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `export-research-bundle`

**Export Research Bundle**

Export manuscript-oriented research materials, analyzed literature artifacts, and synthesis evidence into a portable bundle.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/export-research-bundle/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `paperTitle`: `{"type":"string","title":"Paper Title","description":"Working manuscript title used to find research materials."}`.
  - `articleType`: `{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}`.
  - `researchContent`: `{"type":"string","title":"Research Content","description":"Research problem, methods, scope, and intended contribution."}`.
  - `maxTopics`: `{"type":"number","title":"Maximum Topics","default":5}`.
  - `maxCorePapers`: `{"type":"number","title":"Maximum Core Papers","default":20}`.
  - `maxRelatedPapers`: `{"type":"number","title":"Maximum Related Papers","default":80}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/export-research-bundle-artifacts.json"],"applyBack":true}`.
- Invocation inputs: use workflow id `export-research-bundle`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `export-notes`

**Export Notes**

Export supported generated Zotero notes as editable external files.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/export-notes/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"generated-note"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"generated-note-candidates"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options: none declared.
- Result evidence: `{"artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `export-notes`, validated `generated-note` members grouped by `all`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `import-literature-bundle`

**Import Literature Bundle**

Import a literature bundle and reconcile its supported Zotero literature artifacts.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/import-literature-bundle/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options: none declared.
- Result evidence: `{"artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `import-literature-bundle`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `import-notes`

**Import Notes**

Import supported external analysis files and upsert their generated Zotero notes.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/import-notes/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"parent"},"grouping":{"mode":"each"}},"validation":{"require":{"selection":{"allowMixed":false,"counts":{"parents":{"exact":1},"attachments":{"exact":0},"notes":{"exact":0},"children":{"exact":0}}}},"select":{"policy":"input-member","source":"selected"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options: none declared.
- Result evidence: `{"artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `import-notes`, validated `parent` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `literature-explainer`

**Literature Explainer**

Run a stateful question-answering and study-note session for one literature source.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/literature-explainer/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `language`: `{"type":"string","title":"Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `literature-explainer`, validated `attachment` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `literature-deep-reading`

**Literature Deep Reading**

Produce and apply a detailed, evidence-grounded deep-reading analysis for one literature source.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/literature-deep-reading/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[{"kind":"artifact-absent","phase":"availability","target":"deep-reading-html"}]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `target_language`: `{"type":"string","title":"Target Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
  - `mode`: `{"type":"string","title":"Translation Mode","enum":["fast","high_quality"],"default":"fast"}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"literature-deep-reading.result.json","artifacts":["result/deep-reading.html","result/deep-reading-manifest.json"],"applyBack":true}`.
- Invocation inputs: use workflow id `literature-deep-reading`, validated `attachment` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `literature-analysis`

**Literature Analysis**

Analyze one literature source and apply its digest, structured references, citation analysis, and optional normalized tags to Zotero.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/literature-analysis/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[{"kind":"generated-note-kinds-absent","phase":"availability","noteKinds":["digest","references","citation-analysis"]}]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `language`: `{"type":"string","title":"Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
  - `auto_tag_regulator`: `{"type":"boolean","title":"Auto Tag Regulator","default":true}`.
  - `auto_tag_infer_tag`: `{"type":"boolean","title":"Infer tags","default":true,"visible_if":{"parameter":"auto_tag_regulator","equals":true}}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["artifacts/digest.md","artifacts/references.json","artifacts/citation_analysis.json"],"applyBack":true}`.
- Invocation inputs: use workflow id `literature-analysis`, validated `attachment` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `literature-translator`

**Literature Translator**

Translate one literature source and apply the translated artifact while preserving academic structure.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/literature-translator/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["text/markdown","text/x-markdown","text/plain","application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"literature-source"},"filters":[{"kind":"artifact-absent","phase":"execute","target":"translator-markdown","parameter":"target_language"}]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `target_language`: `{"type":"string","title":"Target Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
  - `mode`: `{"type":"string","title":"Mode","enum":["fast","high_quality"],"default":"fast"}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `literature-translator`, validated `attachment` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `literature-metadata-curator`

**Literature Metadata Curator**

Audit and repair bibliographic metadata for selected literature using identifier and search evidence.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/literature-metadata-curator/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"parent"},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"input-member","source":"related"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `skip_identifier_fast_path`: `{"type":"boolean","title":"Skip identifier fast path","description":"Bypass Zotero identifier lookup and run literature-metadata-search directly.","default":false}`.
- Result evidence: `{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `literature-metadata-curator`, validated `parent` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `literature-search-ingest`

**Literature Search Ingest**

Search scholarly sources, review candidates, research approved papers in agent-chosen subagent groups, collect independent per-paper payloads as they complete, then serially ingest them into Zotero.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/literature-search-ingest/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `query`: `{"type":"string","title":"Search Query","description":"Optional search query or seed. Leave blank with auto mode to start a guided search-planning conversation.","default":""}`.
  - `searchMode`: `{"type":"string","title":"Search Mode","description":"Choose auto detection, guided search planning, topic expansion, paper seed expansion, or exact targeted ingest.","default":"auto","enum":["auto","guided","topic_expansion","paper_seed_expansion","targeted_ingest"]}`.
  - `searchBreadth`: `{"type":"string","title":"Search Breadth","description":"Choose broad multi-lane discovery, balanced coverage, or a quick first pass.","default":"broad","enum":["broad","balanced","quick"]}`.
  - `languageHints`: `{"type":"array","title":"Language Hints","description":"Optional BCP 47 language hints such as en, zh-CN, ja, or de. They expand queries and sources but never filter other languages.","items":{"type":"string"},"default":[]}`.
  - `targetCollection`: `{"type":"string","title":"Target Collection","description":"Optional Zotero collection for created or existing items.","default":"","allowCustom":false,"optionsSource":{"kind":"zotero.collections","library":"current","includeEmpty":true,"valueFormat":"collectionRef","labelFormat":"path"}}`.
- Result evidence: `{"fetchType":"result","resultJson":"result/result.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `literature-search-ingest`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `tag-bootstrapper`

**Tag Bootstrapper**

Bootstrap the controlled tag vocabulary from current library evidence and reviewable suggestions.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/tag-bootstrapper/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `tag_note_language`: `{"type":"string","title":"Tag Note Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
- Result evidence: `{"fetchType":"result","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `tag-bootstrapper`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `tag-auditor`

**Tag Auditor**

Audit selected literature tags against the controlled vocabulary without silently changing unrelated metadata.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/tag-auditor/workflow.json`; core: `false`.
- Provider requirements: `{"requestKind":"","acceptedProviderTypes":["pass-through"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options: none declared.
- Result evidence: `{"artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `tag-auditor`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `tag-regulator`

**Tag Regulator**

Normalize and infer selected literature tags against the controlled vocabulary.

- Package: `literature-workbench-package`; manifest: `workflows_builtin/literature-workbench-package/tag-regulator/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"parent"},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"input-member","source":"selected"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `infer_tag`: `{"type":"boolean","title":"Infer Tag","default":true}`.
  - `tag_note_language`: `{"type":"string","title":"Tag Note Language","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
- Result evidence: `{"fetchType":"result","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `tag-regulator`, validated `parent` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `mineru`

**MinerU**

Convert selected PDF attachments into structured Markdown and image artifacts and attach the result to Zotero.

- Package: `mineru`; manifest: `workflows_builtin/mineru/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"generic-http.steps.v1","acceptedProviderTypes":["generic-http"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":false,"inputs":{"member":{"kind":"attachment","accepts":{"mime":["application/pdf"]}},"grouping":{"mode":"each"}},"validation":{"select":{"policy":"input-member","source":"related"},"filters":[{"kind":"source-file-exists","phase":"availability"},{"kind":"artifact-absent","phase":"availability","target":"mineru-markdown"}]}}`.
- Required workflow options: `[]`.
- Workflow options: none declared.
- Result evidence: `{"artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `mineru`, validated `attachment` members grouped by `each`, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `create-topic-synthesis`

**Create Topic Synthesis**

Create a new topic synthesis from a natural-language seed using the current library, reference, and citation-graph evidence.

- Package: `synthesis-layer`; manifest: `workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `topicSeed`: `{"type":"string","title":"Topic Seed","description":"Natural-language topic seed for a new synthesis topic."}`.
  - `language`: `{"type":"string","title":"Language","description":"Output language, such as auto, zh-CN, or en-US.","enum":["zh-CN","en-US","ja-JP","ko-KR","de-DE","fr-FR","es-ES","ru-RU"],"allowCustom":true,"default":"zh-CN"}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/final-output.candidate.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `create-topic-synthesis`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `update-topic-synthesis`

**Update Topic Synthesis**

Update an existing topic synthesis from its current resolver scope, evidence, and change state.

- Package: `synthesis-layer`; manifest: `workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.sequence.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `topicId`: `{"type":"string","title":"Topic ID","description":"Existing synthesis topic id. The host derives update scope, mode, reason, and language from the selected topic.","allowCustom":false,"optionsSource":{"kind":"synthesis.topics","valueFormat":"topicId","labelFormat":"title","filter":"updatable"}}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/final-output.candidate.json","artifacts":[],"applyBack":true}`.
- Invocation inputs: use workflow id `update-topic-synthesis`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.

### `manuscript-literature-framing`

**Manuscript Literature Framing**

Generate manuscript introduction and related-work framing from selected synthesis topics and library evidence.

- Package: `synthesis-layer`; manifest: `workflows_builtin/synthesis-layer/manuscript-literature-framing/workflow.json`; core: `true`.
- Provider requirements: `{"requestKind":"skillrunner.job.v1","acceptedProviderTypes":["skillrunner","acp"]}`.
- Execution modes: `["auto"]`.
- Selection: `{"acceptsNoSelection":true,"inputs":{"member":{"kind":"selection"},"grouping":{"mode":"all"}},"validation":{"select":{"policy":"selection"},"filters":[]}}`.
- Required workflow options: `[]`.
- Workflow options:
  - `paperTitle`: `{"type":"string","title":"Paper Title","description":"Working manuscript title used to frame the Introduction and Related Work."}`.
  - `language`: `{"type":"string","title":"Language","description":"Output language, such as auto, zh-CN, or en-US.","default":"auto"}`.
  - `targetVenue`: `{"type":"string","title":"Target Venue","description":"Target journal, conference, or style family.","default":""}`.
  - `articleType`: `{"type":"string","title":"Article Type","description":"Manuscript type. v1 is optimized for original research.","default":"original research"}`.
  - `stylePreference`: `{"type":"string","title":"Style Preference","description":"Optional writing preference, such as concise, IEEE-like, Nature-like, or Chinese draft.","default":""}`.
- Result evidence: `{"fetchType":"bundle","resultJson":"result/result.json","artifacts":["result/manuscript-literature-framing-artifacts.json"],"applyBack":true}`.
- Invocation inputs: use workflow id `manuscript-literature-framing`, the declared no-selection form, declared workflow options, and a separately validated compatible provider profile when the provider requires one.
