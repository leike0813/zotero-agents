# Host Bridge Reference

This reference is generated from the Host Bridge capability registry and Rust CLI mappings.

<!-- zotero-librarian:host-bridge:start -->
## CLI Release

This profile surface is generated for `zotero-bridge` CLI version `0.2.1`.

Confirm with `zotero-bridge --version` when the loaded profile or skill path is uncertain, command help does not match this reference, or a CLI error points to command shape mismatch. If the observed version differs, prefer the profile copy and CLI shim from the active workspace, then inspect `zotero-bridge --help` or this generated reference beside that profile copy.

## CLI Commands

| Command | Target | Kind |
| --- | --- | --- |
| `zotero-bridge bridge backend list` | GET /bridge/v1/diagnostics/backends | endpoint |
| `zotero-bridge bridge backend status` | GET /bridge/v1/diagnostics/backends/{backendId} | endpoint |
| `zotero-bridge bridge manifest` | GET /bridge/v1/manifest | endpoint |
| `zotero-bridge bridge profile diagnose` | GET /bridge/v1/diagnostics/profile/diagnose | endpoint |
| `zotero-bridge bridge profile inspect` | GET /bridge/v1/diagnostics/profile | endpoint |
| `zotero-bridge bridge status` | GET /bridge/v1/health | endpoint |
| `zotero-bridge library annotation export` | library.export_annotations | capability |
| `zotero-bridge library annotation list` | library.list_annotations | capability |
| `zotero-bridge library item attachments` | library.get_item_attachments | capability |
| `zotero-bridge library item get` | library.get_item_detail | capability |
| `zotero-bridge library item notes` | library.get_item_notes | capability |
| `zotero-bridge library item search` | library.search_items | capability |
| `zotero-bridge library items list` | library.list_items | capability |
| `zotero-bridge library note get` | library.get_note_detail | capability |
| `zotero-bridge library note payload` | library.get_note_payload | capability |
| `zotero-bridge library note payloads` | library.list_note_payloads | capability |
| `zotero-bridge library readiness audit` | library.readiness_audit | capability |
| `zotero-bridge library readiness missing-analysis` | library.readiness_audit | capability |
| `zotero-bridge library readiness missing-markdown` | library.readiness_audit | capability |
| `zotero-bridge library readiness missing-pdf` | library.readiness_audit | capability |
| `zotero-bridge library snapshot` | library.sync_snapshot | capability |
| `zotero-bridge synthesis artifact export-filtered` | paper_artifacts.export_filtered | capability |
| `zotero-bridge synthesis artifact manifest` | paper_artifacts.get_manifest | capability |
| `zotero-bridge synthesis artifact read` | paper_artifacts.read | capability |
| `zotero-bridge synthesis artifact resolve-topic-digest` | paper_artifacts.resolve_topic_digest | capability |
| `zotero-bridge synthesis cache invalidate` | POST /bridge/v1/synthesis/cache/invalidate | endpoint |
| `zotero-bridge synthesis cache status` | GET /bridge/v1/synthesis/cache/status | endpoint |
| `zotero-bridge synthesis concept query` | concepts.query | capability |
| `zotero-bridge synthesis graph get-layout` | citation_graph.get_layout | capability |
| `zotero-bridge synthesis graph get-metrics` | citation_graph.get_metrics | capability |
| `zotero-bridge synthesis graph get-slice` | citation_graph.get_slice | capability |
| `zotero-bridge synthesis graph overview` | citation_graph.get_overview | capability |
| `zotero-bridge synthesis graph query-cluster` | citation_graph.query_cluster | capability |
| `zotero-bridge synthesis graph rank-external-references` | citation_graph.rank_external_references | capability |
| `zotero-bridge synthesis graph rank-library-papers` | citation_graph.rank_library_papers | capability |
| `zotero-bridge synthesis graph refresh-metrics` | citation_graph.refresh_metrics | capability; approval required |
| `zotero-bridge synthesis index library get` | library_index.get | capability |
| `zotero-bridge synthesis index reference get` | reference_index.get | capability |
| `zotero-bridge synthesis index status` | GET /bridge/v1/synthesis/index/status | endpoint |
| `zotero-bridge synthesis insight attention-queue` | insights.get_attention_queue | capability |
| `zotero-bridge synthesis resolver resolve` | resolvers.resolve | capability |
| `zotero-bridge synthesis schema get` | schemas.get | capability |
| `zotero-bridge synthesis topic find-by-paper-ref` | topics.find_by_paper_ref | capability |
| `zotero-bridge synthesis topic get-context` | topics.get_context | capability |
| `zotero-bridge synthesis topic get-report` | topics.get_report | capability |
| `zotero-bridge synthesis topic get-review-input` | topics.get_review_input | capability |
| `zotero-bridge synthesis topic list` | topics.list | capability |
| `zotero-bridge workflow agent-apply` | POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply | endpoint |
| `zotero-bridge workflow agent-run` | POST /bridge/v1/workflows/agent-run | endpoint |
| `zotero-bridge workflow describe` | POST /bridge/v1/workflows/describe | endpoint |
| `zotero-bridge workflow list` | GET /bridge/v1/workflows | endpoint |
| `zotero-bridge workflow requirements` | POST /bridge/v1/workflows/requirements | endpoint |
| `zotero-bridge workflow submit` | POST /bridge/v1/workflows/submit | endpoint |
| `zotero-bridge workflow validate` | POST /bridge/v1/workflows/validate | endpoint |
| `zotero-bridge run active` | GET /bridge/v1/tasks/active | endpoint |
| `zotero-bridge run cancel` | POST /bridge/v1/workflows/runs/{workflowRunId}/cancel | endpoint |
| `zotero-bridge run get` | GET /bridge/v1/workflows/runs/{workflowRunId} | endpoint |
| `zotero-bridge run list` | GET /bridge/v1/tasks | endpoint |
| `zotero-bridge run notification ack` | POST /bridge/v1/notifications/ack | endpoint |
| `zotero-bridge run notification list` | GET /bridge/v1/notifications | endpoint |
| `zotero-bridge run notification wait` | GET /bridge/v1/notifications | endpoint |
| `zotero-bridge run permission get` | GET /bridge/v1/permissions/{permissionRequestId} | endpoint |
| `zotero-bridge run permission pending` | GET /bridge/v1/permissions/pending | endpoint |
| `zotero-bridge run recent` | GET /bridge/v1/tasks/recent | endpoint |
| `zotero-bridge run skill connect` | POST /bridge/v1/skill-runs/{skillRunId}/connect | endpoint |
| `zotero-bridge run skill events` | GET /bridge/v1/skill-runs/{skillRunId}/events | endpoint |
| `zotero-bridge run skill get` | GET /bridge/v1/skill-runs/{skillRunId} | endpoint |
| `zotero-bridge run skill recent` | GET /bridge/v1/skill-runs/recent | endpoint |
| `zotero-bridge run skill reply` | POST /bridge/v1/skill-runs/{skillRunId}/reply | endpoint |
| `zotero-bridge run workflow recent` | GET /bridge/v1/workflows/runs | endpoint |
| `zotero-bridge mutation apply` | mutation.execute | capability |
| `zotero-bridge mutation collection add-items` | mutation.execute | capability |
| `zotero-bridge mutation collection create` | mutation.execute | capability |
| `zotero-bridge mutation collection remove-items` | mutation.execute | capability |
| `zotero-bridge mutation item attach-file` | mutation.execute | capability |
| `zotero-bridge mutation item update` | mutation.execute | capability |
| `zotero-bridge mutation literature-ingest` | mutation.execute | capability |
| `zotero-bridge mutation note create` | mutation.execute | capability |
| `zotero-bridge mutation note update` | mutation.execute | capability |
| `zotero-bridge mutation note upsert-payload` | mutation.execute | capability |
| `zotero-bridge mutation preview` | mutation.preview | capability |
| `zotero-bridge mutation tag add` | mutation.execute | capability |
| `zotero-bridge mutation tag remove` | mutation.execute | capability |
| `zotero-bridge file download` | GET /bridge/v1/files/{fileId} | endpoint |
| `zotero-bridge file upload` | POST /bridge/v1/files/upload | endpoint |

## Library Capabilities

| Capability | Summary | CLI | Approval |
| --- | --- | --- | --- |
| `library.export_annotations` | Export reader annotations for one Zotero item as markdown or JSON. | zotero-bridge library annotation export | none |
| `library.get_item_attachments` | Return child attachment metadata with broker-issued download handles when available. | zotero-bridge library item attachments | none |
| `library.get_item_detail` | Return detailed JSON-safe metadata for one Zotero item. | zotero-bridge library item get | none |
| `library.get_item_notes` | Return bounded child note summaries for one Zotero item. | zotero-bridge library item notes | none |
| `library.get_note_detail` | Read one Zotero note body in bounded chunks. | zotero-bridge library note get | none |
| `library.get_note_payload` | Decode one workflow payload from one Zotero note. | zotero-bridge library note payload | none |
| `library.list_annotations` | List reader annotations for one Zotero item when the Zotero runtime exposes them. | zotero-bridge library annotation list | none |
| `library.list_items` | List compact parent Zotero library item summaries with bounded pagination and filters. | zotero-bridge library items list | none |
| `library.list_note_payloads` | List workflow note payloads from embedded attachments and note payload blocks. | zotero-bridge library note payloads | none |
| `library.readiness_audit` | Return paginated read-only library readiness for missing PDF, source Markdown, and literature-analysis artifacts. | zotero-bridge library readiness audit, zotero-bridge library readiness missing-analysis, zotero-bridge library readiness missing-markdown, zotero-bridge library readiness missing-pdf | none |
| `library.search_items` | Search regular Zotero library items by bounded text query. | zotero-bridge library item search | none |
| `library.sync_snapshot` | Return a paginated Zotero library metadata snapshot for local librarian indexes. | zotero-bridge library snapshot | none |

## Snapshot Payload

`zotero-bridge library snapshot --input <JSON_OR_FILE>` maps to `library.sync_snapshot`.

`zotero-bridge library items list --input <JSON_OR_FILE>` maps to `library.list_items`.

`zotero-bridge library readiness audit|missing-pdf|missing-markdown|missing-analysis --input <JSON_OR_FILE>` maps to `library.readiness_audit`.

Input fields: `libraryId`, `cursor`, `limit`, `collectionId`, `collectionKey`, `tag`, `itemType`, and `query`.

Readiness commands use the same filters plus `checks` and `missingOnly`; use them before planning PDF retrieval, Markdown conversion, or literature-analysis remediation.

Output fields: `schema`, `generatedAt`, `snapshotId`, `items`, `nextCursor`, `hasMore`, `returned`, and `totalScanned`.

Each item includes `libraryId`, `key`, `id`, `itemType`, `title`, `creators`, `year`, `date`, `publicationTitle`, `DOI`, `ISBN`, `ISSN`, `url`, `tags`, `collections`, `noteCount`, and `attachmentCount`.
<!-- zotero-librarian:host-bridge:end -->

Use `zotero-bridge call library.sync_snapshot --input <JSON_OR_FILE>` only for diagnostics. Prefer `zotero-bridge library snapshot`.
