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
| `literature-search-ingest` | Literature Search Ingest | skillrunner | workflow | query, searchMode, targetCollection | yes |
| `literature-translator` | Literature Translator | skillrunner | attachment per_parent | target_language, mode | yes |
| `manuscript-literature-framing` | Manuscript Literature Framing | skillrunner | workflow | paperTitle, language, targetVenue, articleType, stylePreference | yes |
| `mineru` | MinerU | generic-http | attachment | none | yes |
| `tag-auditor` | Tag Auditor | pass-through | workflow | none | yes |
| `tag-bootstrapper` | Tag Bootstrapper | skillrunner | workflow | tag_note_language | yes |
| `tag-regulator` | Tag Regulator | skillrunner | parent | infer_tag, tag_note_language | yes |
| `update-topic-synthesis` | Update Topic Synthesis | skillrunner | workflow | topicId | yes |

Use `workflow-show <workflow-id>` and live `workflow describe` executionModes before direct submission or handoff.
Register and monitor only Host-owned submitted workflow runs with `run-register` and `run-watch`.
<!-- zotero-librarian:workflow-catalog:end -->

After `workflow submit`, call:

```powershell
scripts/zotero_librarian_index_service.py run-register --run-id <run-id> --workflow-id <workflow-id>
scripts/zotero_librarian_index_service.py run-watch
```
