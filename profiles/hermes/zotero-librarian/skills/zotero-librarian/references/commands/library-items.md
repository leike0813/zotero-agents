# Library Items

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge library item attachments`

List child attachments for one Zotero item

### Backend and freshness

- Targets: `capability:library.get_item_attachments`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library item attachments when the required operation is: List child attachments for one Zotero item.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library item attachments when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.
- library item notes: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library item attachments`.
- Example: `zotero-bridge library item attachments`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `key` → option `--key` (optional, takes a value).
- `id` → option `--id` (optional, takes a value).
- `library-id` → option `--library-id` (optional, takes a value).
- CLI invocation fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library-id` (string): Zotero library id for key lookup
- Decoded payload fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library_id` (string): Zotero library id for key lookup

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from library.get_item_attachments.
- Completion evidence:
- The structured library item attachments result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library item get`

Get detailed metadata for one Zotero item

### Backend and freshness

- Targets: `capability:library.get_item_detail`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library item get when the required operation is: Get detailed metadata for one Zotero item.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library item get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item notes: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library item get`.
- Example: `zotero-bridge library item get`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `key` → option `--key` (optional, takes a value).
- `id` → option `--id` (optional, takes a value).
- `library-id` → option `--library-id` (optional, takes a value).
- CLI invocation fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library-id` (string): Zotero library id for key lookup
- Decoded payload fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library_id` (string): Zotero library id for key lookup

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from library.get_item_detail.
- Completion evidence:
- The structured library item get result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library item notes`

List child notes for one Zotero item

### Backend and freshness

- Targets: `capability:library.get_item_notes`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library item notes when the required operation is: List child notes for one Zotero item.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library item notes when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library item notes`.
- Example: `zotero-bridge library item notes`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `key` → option `--key` (optional, takes a value).
- `id` → option `--id` (optional, takes a value).
- `library-id` → option `--library-id` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- `cursor` → option `--cursor` (optional, takes a value).
- `max-excerpt-chars` → option `--max-excerpt-chars` (optional, takes a value).
- CLI invocation fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library-id` (string): Zotero library id for key lookup
- `limit` (string): Maximum note summary count
- `cursor` (string): Pagination cursor
- `max-excerpt-chars` (string): Maximum excerpt characters per note
- Decoded payload fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library_id` (string): Zotero library id for key lookup
- `limit` (string): Maximum note summary count
- `cursor` (string): Pagination cursor
- `max_excerpt_chars` (string): Maximum excerpt characters per note

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.get_item_notes.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library item notes result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library item search`

Search Zotero library items

### Backend and freshness

- Targets: `capability:library.search_items`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library item search when the required operation is: Search Zotero library items.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library item search when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.
- Use items list for deterministic collection or tag paging rather than relevance search.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library item search`.
- Example: `zotero-bridge library item search --query '{"text":"graph retrieval","limit":10}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- The CLI `--query` JSON uses `text`; the CLI validates it and maps that value to backend payload field `query`.
- Exact argv bindings:
- `query` → option `--query` (required, takes a value).
- CLI invocation fields:
- `query` (string): Bounded search query JSON object with text, limit, and libraryId
- Decoded payload fields:
- `query` (string)
- `limit` (number | string)
- `libraryId` (number | string)

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from library.search_items.
- Completion evidence:
- The structured library item search result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library items list`

List compact Zotero library item summaries

### Backend and freshness

- Targets: `capability:library.list_items`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library items list when the required operation is: List compact Zotero library item summaries.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library items list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library items list`.
- Example: `zotero-bridge library items list --query '{"collectionKey":"COLL_A","limit":50,"cursor":null}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `query` → option `--query` (optional, takes a value).
- CLI invocation fields:
- `query` (string): Read query as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `libraryId` (number | string)
- `collection` (object)
- `collectionId` (number | string)
- `collectionKey` (string)
- `collectionLibraryId` (number | string)
- `tag` (string)
- `itemType` (string)
- `query` (string)
- `limit` (number | string)
- `cursor` (string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.list_items.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library items list result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
