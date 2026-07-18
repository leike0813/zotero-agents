# Workflow Catalog Reference

Use the local workflow catalog to submit known workflows without re-querying their schemas. Refresh the catalog with:

```powershell
scripts/zotero_librarian_index_service.py workflow-refresh
```

<!-- zotero-librarian:workflow-catalog:start -->
## Built-In Workflow Catalog

Refresh the runtime catalog with `scripts/zotero_librarian_index_service.py workflow-refresh`.

| Workflow | Label | Provider | Inputs | Parameters | Agent-owned |
| --- | --- | --- | --- | --- | --- |
| `add-digest-representative-image` | Add Digest Representative Image | pass-through | workflow | markdown_src | yes |
| `collection-collector` | Collection Collector | skillrunner | workflow | collection, collectionScope | no |
| `create-topic-synthesis` | Create Topic Synthesis | skillrunner | workflow | topicSeed, language | yes |
| `export-literature-bundle` | Export Literature Bundle | pass-through | workflow | none | yes |
| `export-notes` | Export Notes | pass-through | workflow | none | yes |
| `export-research-bundle` | Export Research Bundle | skillrunner | workflow | paperTitle, articleType, researchContent, maxTopics, maxCorePapers, maxRelatedPapers | yes |
| `import-literature-bundle` | Import Literature Bundle | pass-through | workflow | none | yes |
| `import-notes` | Import Notes | pass-through | parent | none | yes |
| `literature-analysis` | Literature Analysis | skillrunner | attachment per_parent | language, auto_tag_regulator, auto_tag_infer_tag | yes |
| `literature-deep-reading` | Literature Deep Reading | skillrunner | attachment per_parent | target_language, mode | yes |
| `literature-explainer` | Literature Explainer | skillrunner | attachment per_parent | language | yes |
| `literature-metadata-curator` | Literature Metadata Curator | skillrunner | parent | skip_identifier_fast_path | yes |
| `literature-search-ingest` | Literature Search Ingest | skillrunner | workflow | query, searchMode, searchBreadth, languageHints, targetCollection | yes |
| `literature-translator` | Literature Translator | skillrunner | attachment per_parent | target_language, mode | yes |
| `manuscript-literature-framing` | Manuscript Literature Framing | skillrunner | workflow | paperTitle, language, targetVenue, articleType, stylePreference | yes |
| `mineru` | MinerU | generic-http | attachment | none | yes |
| `tag-auditor` | Tag Auditor | pass-through | workflow | none | yes |
| `tag-bootstrapper` | Tag Bootstrapper | skillrunner | workflow | tag_note_language | yes |
| `tag-regulator` | Tag Regulator | skillrunner | parent | infer_tag, tag_note_language | yes |
| `update-topic-synthesis` | Update Topic Synthesis | skillrunner | workflow | topicId | yes |

## `add-digest-representative-image` — Add Digest Representative Image

- Provider: `pass-through`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - `markdown_src`: string; required=false; default="" — Relative image path from the source Markdown file, for example figures/overview.jpg.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `collection-collector` — Collection Collector

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned not supported because required workflow options cannot be supplied by agent-run.
- Completion evidence: `result/result.json`.
- Parameters:
  - `collection`: string; required=true — Existing Zotero collection that will receive matching literature.
  - `collectionScope`: string; required=true — Meaning, research topic, or literature boundary represented by the collection.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `create-topic-synthesis` — Create Topic Synthesis

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/final-output.candidate.json`.
- Parameters:
  - `topicSeed`: string; required=false — Natural-language topic seed for a new synthesis topic.
  - `language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Output language, such as auto, zh-CN, or en-US.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `export-literature-bundle` — Export Literature Bundle

- Provider: `pass-through`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - None.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `export-notes` — Export Notes

- Provider: `pass-through`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - None.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `export-research-bundle` — Export Research Bundle

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`, `result/export-research-bundle-artifacts.json`.
- Parameters:
  - `paperTitle`: string; required=false — Working manuscript title used to find research materials.
  - `articleType`: string; required=false; default="original research" — Manuscript type. v1 is optimized for original research.
  - `researchContent`: string; required=false — Research problem, methods, scope, and intended contribution.
  - `maxTopics`: number; required=false; default=5 — Maximum Topics
  - `maxCorePapers`: number; required=false; default=20 — Maximum Core Papers
  - `maxRelatedPapers`: number; required=false; default=80 — Maximum Related Papers
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `import-literature-bundle` — Import Literature Bundle

- Provider: `pass-through`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - None.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `import-notes` — Import Notes

- Provider: `pass-through`; input mode: `parent`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - None.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `literature-analysis` — Literature Analysis

- Provider: `skillrunner`; input mode: `attachment per_parent`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`, `artifacts/digest.md,artifacts/references.json,artifacts/citation_analysis.json`.
- Parameters:
  - `language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Language
  - `auto_tag_regulator`: boolean; required=false; default=true — Auto Tag Regulator
  - `auto_tag_infer_tag`: boolean; required=false; default=true — Infer tags
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `literature-deep-reading` — Literature Deep Reading

- Provider: `skillrunner`; input mode: `attachment per_parent`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `literature-deep-reading.result.json`, `result/deep-reading.html,result/deep-reading-manifest.json`.
- Parameters:
  - `target_language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Target Language
  - `mode`: string; required=false; default="fast"; enum=fast, high_quality — Translation Mode
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `literature-explainer` — Literature Explainer

- Provider: `skillrunner`; input mode: `attachment per_parent`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`.
- Parameters:
  - `language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Language
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `literature-metadata-curator` — Literature Metadata Curator

- Provider: `skillrunner`; input mode: `parent`; selection required: true.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`.
- Parameters:
  - `skip_identifier_fast_path`: boolean; required=false; default=false — Bypass Zotero identifier lookup and run literature-metadata-search directly.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `literature-search-ingest` — Literature Search Ingest

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`.
- Parameters:
  - `query`: string; required=false; default="" — Optional search query or seed. Leave blank with auto mode to start a guided search-planning conversation.
  - `searchMode`: string; required=false; default="auto"; enum=auto, guided, topic_expansion, paper_seed_expansion, targeted_ingest — Choose auto detection, guided search planning, topic expansion, paper seed expansion, or exact targeted ingest.
  - `searchBreadth`: string; required=false; default="broad"; enum=broad, balanced, quick — Choose broad multi-lane discovery, balanced coverage, or a quick first pass.
  - `languageHints`: array; required=false; default=[] — Optional BCP 47 language hints such as en, zh-CN, ja, or de. They expand queries and sources but never filter other languages.
  - `targetCollection`: string; required=false; default="" — Optional Zotero collection for created or existing items.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `literature-translator` — Literature Translator

- Provider: `skillrunner`; input mode: `attachment per_parent`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`.
- Parameters:
  - `target_language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Target Language
  - `mode`: string; required=false; default="fast"; enum=fast, high_quality — Mode
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `manuscript-literature-framing` — Manuscript Literature Framing

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/result.json`, `result/manuscript-literature-framing-artifacts.json`.
- Parameters:
  - `paperTitle`: string; required=false — Working manuscript title used to frame the Introduction and Related Work.
  - `language`: string; required=false; default="auto" — Output language, such as auto, zh-CN, or en-US.
  - `targetVenue`: string; required=false; default="" — Target journal, conference, or style family.
  - `articleType`: string; required=false; default="original research" — Manuscript type. v1 is optimized for original research.
  - `stylePreference`: string; required=false; default="" — Optional writing preference, such as concise, IEEE-like, Nature-like, or Chinese draft.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `mineru` — MinerU

- Provider: `generic-http`; input mode: `attachment`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - None.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `tag-auditor` — Tag Auditor

- Provider: `pass-through`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - None.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `tag-bootstrapper` — Tag Bootstrapper

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - `tag_note_language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Tag Note Language
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `tag-regulator` — Tag Regulator

- Provider: `skillrunner`; input mode: `parent`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: terminal run result and any declared Product/output contract.
- Parameters:
  - `infer_tag`: boolean; required=false; default=true — Infer Tag
  - `tag_note_language`: string; required=false; default="zh-CN"; enum=zh-CN, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, ru-RU — Tag Note Language
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

## `update-topic-synthesis` — Update Topic Synthesis

- Provider: `skillrunner`; input mode: `workflow`; selection required: false.
- Execution: Host-owned supported; agent-owned supported.
- Completion evidence: `result/final-output.candidate.json`.
- Parameters:
  - `topicId`: string; required=false — Existing synthesis topic id. The host derives update scope, mode, reason, and language from the selected topic.
- Selection rule: choose this workflow only when its label, declared inputs, parameters, and result evidence match the requested outcome; confirm live `workflow describe` before execution.

Use `workflow-show <workflow-id>` and live `workflow describe` executionModes before direct submission or handoff.
Register and monitor only Host-owned submitted workflow runs with `run-register` and `run-watch`.
<!-- zotero-librarian:workflow-catalog:end -->

After `workflow submit`, call:

```powershell
scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id <workflow-id>
scripts/zotero_librarian_index_service.py run-watch
```
