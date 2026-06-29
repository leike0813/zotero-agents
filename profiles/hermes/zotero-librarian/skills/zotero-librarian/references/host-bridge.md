# Host Bridge Reference

This reference is generated from the Host Bridge capability registry and Rust CLI mappings.

<!-- zotero-librarian:host-bridge:start -->
## CLI Commands

| Command | Target | Kind |
| --- | --- | --- |
| `zotero-bridge library list` | library.list_items | capability |
| `zotero-bridge library snapshot` | library.sync_snapshot | capability |
| `zotero-bridge item attachments` | library.get_item_attachments | capability |
| `zotero-bridge item get` | library.get_item_detail | capability |
| `zotero-bridge item notes` | library.get_item_notes | capability |
| `zotero-bridge item search` | library.search_items | capability |
| `zotero-bridge note get` | library.get_note_detail | capability |
| `zotero-bridge note payload` | library.get_note_payload | capability |
| `zotero-bridge note payloads` | library.list_note_payloads | capability |
| `zotero-bridge insights attention-queue` | insights.get_attention_queue | capability |
| `zotero-bridge workflow agent-run` | POST /bridge/v1/workflows/agent-run | endpoint |
| `zotero-bridge workflow describe` | POST /bridge/v1/workflows/describe | endpoint |
| `zotero-bridge workflow list` | GET /bridge/v1/workflows | endpoint |
| `zotero-bridge workflow run` | GET /bridge/v1/workflows/runs/{runId} | endpoint |
| `zotero-bridge workflow submit` | POST /bridge/v1/workflows/submit | endpoint |
| `zotero-bridge task list` | GET /bridge/v1/tasks | endpoint |
| `zotero-bridge file download` | GET /bridge/v1/files/{fileId} | endpoint |

## Library Capabilities

| Capability | Summary | CLI | Approval |
| --- | --- | --- | --- |
| `library.get_item_attachments` | Return child attachment metadata with broker-issued download handles when available. | zotero-bridge item attachments | none |
| `library.get_item_detail` | Return detailed JSON-safe metadata for one Zotero item. | zotero-bridge item get | none |
| `library.get_item_notes` | Return bounded child note summaries for one Zotero item. | zotero-bridge item notes | none |
| `library.get_note_detail` | Read one Zotero note body in bounded chunks. | zotero-bridge note get | none |
| `library.get_note_payload` | Decode one workflow payload from one Zotero note. | zotero-bridge note payload | none |
| `library.list_items` | List compact parent Zotero library item summaries with bounded pagination and filters. | zotero-bridge library list | none |
| `library.list_note_payloads` | List workflow note payloads from embedded attachments and legacy payload blocks. | zotero-bridge note payloads | none |
| `library.search_items` | Search regular Zotero library items by bounded text query. | zotero-bridge item search | none |
| `library.sync_snapshot` | Return a paginated Zotero library metadata snapshot for local librarian indexes. | zotero-bridge library snapshot | none |

## Snapshot Payload

`zotero-bridge library snapshot --input <JSON_OR_FILE>` maps to `library.sync_snapshot`.

Input fields: `libraryId`, `cursor`, `limit`, `collectionId`, `collectionKey`, `tag`, `itemType`, and `query`.

Output fields: `schema`, `generatedAt`, `snapshotId`, `items`, `nextCursor`, `hasMore`, `returned`, and `totalScanned`.

Each item includes `libraryId`, `key`, `id`, `itemType`, `title`, `creators`, `year`, `date`, `publicationTitle`, `DOI`, `ISBN`, `ISSN`, `url`, `tags`, `collections`, `noteCount`, and `attachmentCount`.
<!-- zotero-librarian:host-bridge:end -->

Use `zotero-bridge call library.sync_snapshot --input <JSON_OR_FILE>` only for diagnostics. Prefer `zotero-bridge library snapshot`.
