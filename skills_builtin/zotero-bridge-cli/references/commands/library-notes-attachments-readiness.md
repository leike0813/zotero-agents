# Library Notes Attachments Readiness

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge library annotation export`

Export reader annotations for one Zotero item

### Backend and freshness

- Targets: `capability:library.export_annotations`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library annotation export when the required operation is: Export reader annotations for one Zotero item.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library annotation export when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.
- library item notes: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library annotation export`.
- Example: `zotero-bridge library annotation export --item 'item'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `item` → option `--item` (required, takes a value).
- `format` → option `--format` (optional, takes a value).
- CLI invocation fields:
- `item` (string): Zotero item ref: key, numeric id, libraryId:key, or JSON object
- `format` (string): Export format
- Decoded payload fields:
- `item` (string): Zotero item ref: key, numeric id, libraryId:key, or JSON object
- `format` (string): Export format

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from library.export_annotations.
- Completion evidence:
- The structured library annotation export result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library annotation list`

List reader annotations for one Zotero item

### Backend and freshness

- Targets: `capability:library.list_annotations`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library annotation list when the required operation is: List reader annotations for one Zotero item.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library annotation list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.
- library item notes: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library annotation list`.
- Example: `zotero-bridge library annotation list --item 'item'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `item` → option `--item` (required, takes a value).
- CLI invocation fields:
- `item` (string): Zotero item ref: key, numeric id, libraryId:key, or JSON object
- Decoded payload fields:
- `item` (string): Zotero item ref: key, numeric id, libraryId:key, or JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from library.list_annotations.
- Completion evidence:
- The structured library annotation list result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library note get`

Read one Zotero note body chunk

### Backend and freshness

- Targets: `capability:library.get_note_detail`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library note get when the required operation is: Read one Zotero note body chunk.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library note get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library note get`.
- Example: `zotero-bridge library note get`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `key` → option `--key` (optional, takes a value).
- `id` → option `--id` (optional, takes a value).
- `library-id` → option `--library-id` (optional, takes a value).
- `format` → option `--format` (optional, takes a value).
- `offset` → option `--offset` (optional, takes a value).
- `max-chars` → option `--max-chars` (optional, takes a value).
- CLI invocation fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library-id` (string): Zotero library id for key lookup
- `format` (string): Payload format
- `offset` (string): Start offset
- `max-chars` (string): Maximum characters
- Decoded payload fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library_id` (string): Zotero library id for key lookup
- `format` (string): Payload format
- `offset` (string): Start offset
- `max_chars` (string): Maximum characters

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.get_note_detail.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library note get result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library note payload`

Read one embedded workflow payload from a Zotero note

### Backend and freshness

- Targets: `capability:library.get_note_payload`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library note payload when the required operation is: Read one embedded workflow payload from a Zotero note.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library note payload when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.
- Use note get for the note object and payloads to enumerate payload ids before selecting one.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library note payload`.
- Example: `zotero-bridge library note payload`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `key` → option `--key` (optional, takes a value).
- `id` → option `--id` (optional, takes a value).
- `library-id` → option `--library-id` (optional, takes a value).
- `payload-type` → option `--payload-type` (optional, takes a value).
- `offset` → option `--offset` (optional, takes a value).
- `max-chars` → option `--max-chars` (optional, takes a value).
- CLI invocation fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library-id` (string): Zotero library id for key lookup
- `payload-type` (string): Payload type to decode
- `offset` (string): Start offset
- `max-chars` (string): Maximum characters
- Decoded payload fields:
- `key` (string): Zotero item key
- `id` (string): Zotero item numeric id
- `library_id` (string): Zotero library id for key lookup
- `payload_type` (string): Payload type to decode
- `offset` (string): Start offset
- `max_chars` (string): Maximum characters

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.get_note_payload.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library note payload result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library note payloads`

List embedded workflow payloads in one Zotero note

### Backend and freshness

- Targets: `capability:library.list_note_payloads`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library note payloads when the required operation is: List embedded workflow payloads in one Zotero note.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library note payloads when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library note payloads`.
- Example: `zotero-bridge library note payloads`.
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
- `result` (object): Stable result from library.list_note_payloads.
- Completion evidence:
- The structured library note payloads result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library readiness audit`

Audit PDF, source Markdown, and literature-analysis artifact readiness

### Backend and freshness

- Targets: `capability:library.readiness_audit`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library readiness audit when the required operation is: Audit PDF, source Markdown, and literature-analysis artifact readiness.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library readiness audit when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library readiness audit`.
- Example: `zotero-bridge library readiness audit`.
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
- `checks` (object)
- `missingOnly` (boolean | string | number)
- `missing_only` (boolean | string | number)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.readiness_audit.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library readiness audit result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library readiness missing-analysis`

List Zotero items missing literature-analysis generated artifacts

### Backend and freshness

- Targets: `capability:library.readiness_audit`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library readiness missing-analysis when the required operation is: List Zotero items missing literature-analysis generated artifacts.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library readiness missing-analysis when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library readiness missing-analysis`.
- Example: `zotero-bridge library readiness missing-analysis`.
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
- `checks` (object)
- `missingOnly` (boolean | string | number)
- `missing_only` (boolean | string | number)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.readiness_audit.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library readiness missing-analysis result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library readiness missing-markdown`

List Zotero items missing same-stem source Markdown

### Backend and freshness

- Targets: `capability:library.readiness_audit`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library readiness missing-markdown when the required operation is: List Zotero items missing same-stem source Markdown.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library readiness missing-markdown when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library readiness missing-markdown`.
- Example: `zotero-bridge library readiness missing-markdown`.
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
- `checks` (object)
- `missingOnly` (boolean | string | number)
- `missing_only` (boolean | string | number)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.readiness_audit.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library readiness missing-markdown result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library readiness missing-pdf`

List Zotero items missing a PDF attachment

### Backend and freshness

- Targets: `capability:library.readiness_audit`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library readiness missing-pdf when the required operation is: List Zotero items missing a PDF attachment.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library readiness missing-pdf when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library readiness missing-pdf`.
- Example: `zotero-bridge library readiness missing-pdf`.
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
- `checks` (object)
- `missingOnly` (boolean | string | number)
- `missing_only` (boolean | string | number)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from library.readiness_audit.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library readiness missing-pdf result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge library snapshot`

Sync a Zotero library metadata snapshot page

### Backend and freshness

- Targets: `capability:library.sync_snapshot`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use library snapshot when the required operation is: Sync a Zotero library metadata snapshot page.
- The task needs authoritative bibliographic or item-owned data from Zotero.

Avoid when:
- Do not use library snapshot when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a snapshot page as a complete or permanently current library mirror.

Distinguish from:
- library annotation export: choose it only when its narrower result matches the task.
- library annotation list: choose it only when its narrower result matches the task.
- library item attachments: choose it only when its narrower result matches the task.
- library item get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge library snapshot`.
- Example: `zotero-bridge library snapshot`.
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
- `result` (object): Stable result from library.sync_snapshot.
- `items` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured library snapshot result and the exact invocation inputs used to obtain it.
- stable item or note refs, current metadata, and cursor metadata

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
