# Mutations Files Products

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge file download`

Download one registered file handle

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/files/{fileId}`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use file download when the required operation is: Download one registered file handle.
- A command returns or requires an explicit fileId or verified local file.

Avoid when:
- Do not use file download when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a local path as a Host file handle.

Distinguish from:
- file upload: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge file download`.
- Example: `zotero-bridge file download 'file-id' --output './output'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `file_id` → positional 1 as `FILE_ID` (required, takes a value).
- `output` → option `--output` (required, takes a value).
- `force` → option `--force` (optional, flag).
- CLI invocation fields:
- `file_id` (string): Broker-issued opaque file id
- `output` (string): Output file path
- `force` (boolean): Overwrite the output file if it already exists
- Decoded payload fields:
- `file_id` (string): Broker-issued opaque file id
- `output` (string): Output file path

### Result and evidence

- Delivery: `file`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/files/{fileId}.
- `file` (object)
- `delivery` (object): Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.
- Completion evidence:
- The structured file download result and the exact invocation inputs used to obtain it.
- fileId, checksum, byte count, and verified output path

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `fileId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge file upload`

Upload one local file to Host Bridge and return a short-lived file handle

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/files/upload`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use file upload when the required operation is: Upload one local file to Host Bridge and return a short-lived file handle.
- A command returns or requires an explicit fileId or verified local file.

Avoid when:
- Do not use file upload when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not treat a local path as a Host file handle.

Distinguish from:
- file download: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge file upload`.
- Example: `zotero-bridge file upload './output'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `path` → positional 1 as `PATH` (required, takes a value).
- `display-name` → option `--display-name` (optional, takes a value).
- `content-type` → option `--content-type` (optional, takes a value).
- CLI invocation fields:
- `path` (string): Local file path to upload
- `display-name` (string): Display name stored in the Host Bridge file descriptor
- `content-type` (string): Content type for the uploaded file
- Decoded payload fields:
- `path` (string): Local file path to upload
- `display_name` (string): Display name stored in the Host Bridge file descriptor
- `content_type` (string): Content type for the uploaded file

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/files/upload.
- `fileId` (string)
- Completion evidence:
- The structured file upload result and the exact invocation inputs used to obtain it.
- fileId, checksum, byte count, and verified output path

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `ephemeral-file`: May change ephemeral file state. stateChanged=true.
- produce `fileId` (short-lived): Returned when the corresponding operation succeeds.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation apply`

Apply a Host Bridge mutation

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation apply when the required operation is: Apply a Host Bridge mutation.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation apply when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.
- mutation item attach-file: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation apply`.
- Example: `zotero-bridge mutation apply`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation apply result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation collection add-items`

Add Zotero items to a collection

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation collection add-items when the required operation is: Add Zotero items to a collection.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation collection add-items when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.
- mutation item attach-file: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation collection add-items`.
- Example: `zotero-bridge mutation collection add-items --collection 'collection' --items 'items'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `collection` → option `--collection` (required, takes a value).
- `items` → option `--items` (required, takes a value).
- CLI invocation fields:
- `collection` (string): Zotero collection ref
- `items` (string): Target Zotero item refs
- Decoded payload fields:
- `collection` (string): Zotero collection ref
- `items` (string): Target Zotero item refs

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation collection add-items result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation collection create`

Create a Zotero collection

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation collection create when the required operation is: Create a Zotero collection.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation collection create when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.
- mutation item attach-file: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation collection create`.
- Example: `zotero-bridge mutation collection create --input '{}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (required, takes a value).
- CLI invocation fields:
- `input` (string): Collection creation payload
- Decoded payload fields:
- `input` (string): Collection creation payload

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation collection create result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation collection remove-items`

Remove Zotero items from a collection

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation collection remove-items when the required operation is: Remove Zotero items from a collection.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation collection remove-items when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation item attach-file: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation collection remove-items`.
- Example: `zotero-bridge mutation collection remove-items --collection 'collection' --items 'items'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `collection` → option `--collection` (required, takes a value).
- `items` → option `--items` (required, takes a value).
- CLI invocation fields:
- `collection` (string): Zotero collection ref
- `items` (string): Target Zotero item refs
- Decoded payload fields:
- `collection` (string): Zotero collection ref
- `items` (string): Target Zotero item refs

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation collection remove-items result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation item attach-file`

Attach an uploaded Host Bridge file to a Zotero item

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation item attach-file when the required operation is: Attach an uploaded Host Bridge file to a Zotero item.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.
- file upload already returned a fileId and the target item ref is current.

Avoid when:
- Do not use mutation item attach-file when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation item attach-file`.
- Example: `zotero-bridge mutation item attach-file --item 'item' --file './output'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `item` → option `--item` (required, takes a value).
- `file` → option `--file` (required, takes a value).
- `display-name` → option `--display-name` (optional, takes a value).
- `content-type` → option `--content-type` (optional, takes a value).
- CLI invocation fields:
- `item` (string): Target Zotero item ref
- `file` (string): Host Bridge uploaded file id
- `display-name` (string): Attachment display name
- `content-type` (string): Attachment content type
- Decoded payload fields:
- `item` (string): Target Zotero item ref
- `file` (string): Host Bridge uploaded file id
- `display_name` (string): Attachment display name
- `content_type` (string): Attachment content type

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation item attach-file result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs
- upload checksum, fileId, target item ref, approval, and attachment result

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- consume `itemRef` (caller-owned): Required by the command invocation.
- consume `fileId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation item update`

Update Zotero item fields

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation item update when the required operation is: Update Zotero item fields.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation item update when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation item update`.
- Example: `zotero-bridge mutation item update --item 'item' --patch 'patch'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `item` → option `--item` (required, takes a value).
- `patch` → option `--patch` (required, takes a value).
- CLI invocation fields:
- `item` (string): Target Zotero item ref
- `patch` (string): Field patch JSON object
- Decoded payload fields:
- `item` (string): Target Zotero item ref
- `patch` (string): Field patch JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation item update result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation literature-ingest`

Ingest searched literature into Zotero

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation literature-ingest when the required operation is: Ingest searched literature into Zotero.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation literature-ingest when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation literature-ingest`.
- Example: `zotero-bridge mutation literature-ingest --input '{}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (required, takes a value).
- CLI invocation fields:
- `input` (string): Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation literature-ingest result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation note create`

Create a child note under one Zotero item

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation note create when the required operation is: Create a child note under one Zotero item.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation note create when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation note create`.
- Example: `zotero-bridge mutation note create --item 'item' --input '{}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `item` → option `--item` (required, takes a value).
- `input` → option `--input` (required, takes a value).
- CLI invocation fields:
- `item` (string): Parent Zotero item ref
- `input` (string): Note payload JSON object
- Decoded payload fields:
- `item` (string): Parent Zotero item ref
- `input` (string): Note payload JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation note create result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation note update`

Update one Zotero note

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation note update when the required operation is: Update one Zotero note.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation note update when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation note update`.
- Example: `zotero-bridge mutation note update --note 'note' --input '{}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `note` → option `--note` (required, takes a value).
- `input` → option `--input` (required, takes a value).
- CLI invocation fields:
- `note` (string): Target Zotero note ref
- `input` (string): Note payload JSON object
- Decoded payload fields:
- `note` (string): Target Zotero note ref
- `input` (string): Note payload JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation note update result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation note upsert-payload`

Upsert one embedded note payload

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation note upsert-payload when the required operation is: Upsert one embedded note payload.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation note upsert-payload when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation note upsert-payload`.
- Example: `zotero-bridge mutation note upsert-payload --note 'note' --input '{}'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `note` → option `--note` (required, takes a value).
- `input` → option `--input` (required, takes a value).
- CLI invocation fields:
- `note` (string): Target Zotero note ref
- `input` (string): Payload JSON object
- Decoded payload fields:
- `note` (string): Target Zotero note ref
- `input` (string): Payload JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation note upsert-payload result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation preview`

Preview a Host Bridge mutation

### Backend and freshness

- Targets: `capability:mutation.preview`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation preview when the required operation is: Preview a Host Bridge mutation.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation preview when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation preview`.
- Example: `zotero-bridge mutation preview`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `input` → option `--input` (optional, takes a value).
- CLI invocation fields:
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin
- Decoded payload fields:
- `input` (string): Host Bridge capability input as inline JSON, a file path, @file, or '-' for stdin

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.preview.
- Completion evidence:
- The structured mutation preview result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs
- read-only preview with affected refs and proposed effects

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation tag add`

Add tags to Zotero items

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation tag add when the required operation is: Add tags to Zotero items.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation tag add when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation tag add`.
- Example: `zotero-bridge mutation tag add --items 'items' --tags 'tags'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `items` → option `--items` (required, takes a value).
- `tags` → option `--tags` (required, takes a value).
- CLI invocation fields:
- `items` (string): Target Zotero item refs
- `tags` (string): Tags to add or remove
- Decoded payload fields:
- `items` (string): Target Zotero item refs
- `tags` (string): Tags to add or remove

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation tag add result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge mutation tag remove`

Remove tags from Zotero items

### Backend and freshness

- Targets: `capability:mutation.execute`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use mutation tag remove when the required operation is: Remove tags from Zotero items.
- The requested tag, collection, item, note, payload, or attachment change is already concrete.

Avoid when:
- Do not use mutation tag remove when the task needs a different sibling result, control plane, or freshness guarantee.
- Use a workflow when semantic inference or multi-step business logic is still required.

Distinguish from:
- mutation apply: choose it only when its narrower result matches the task.
- mutation collection add-items: choose it only when its narrower result matches the task.
- mutation collection create: choose it only when its narrower result matches the task.
- mutation collection remove-items: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge mutation tag remove`.
- Example: `zotero-bridge mutation tag remove --items 'items' --tags 'tags'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `items` → option `--items` (required, takes a value).
- `tags` → option `--tags` (required, takes a value).
- CLI invocation fields:
- `items` (string): Target Zotero item refs
- `tags` (string): Tags to add or remove
- Decoded payload fields:
- `items` (string): Target Zotero item refs
- `tags` (string): Tags to add or remove

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from mutation.execute.
- Completion evidence:
- The structured mutation tag remove result and the exact invocation inputs used to obtain it.
- preview, approval outcome, applied result, and affected Zotero refs

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `zotero-library`: May change zotero library state. stateChanged=true.
- No typed handle transition.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge product download`

Download one or all Dashboard Product assets

### Backend and freshness

- Targets: `capability:workflow_products.export`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use product download when the required operation is: Download one or all Dashboard Product assets.
- The task concerns a completed workflow Product rather than a workflow run or raw file handle.

Avoid when:
- Do not use product download when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not infer Product completion from workflow terminal state without reading the Product record.

Distinguish from:
- product get: choose it only when its narrower result matches the task.
- product list: choose it only when its narrower result matches the task.
- product remove: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge product download`.
- Example: `zotero-bridge product download 'product-id' --output-dir './output'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `product_id` → positional 1 as `PRODUCT_ID` (required, takes a value).
- `asset` → option `--asset` (optional, takes a value).
- `output-dir` → option `--output-dir` (required, takes a value).
- `force` → option `--force` (optional, flag).
- CLI invocation fields:
- `product_id` (string): Dashboard Product id
- `asset` (string): Optional asset id; omit to download all assets
- `output-dir` (string): Destination directory
- `force` (boolean): Allow existing output files to be replaced
- Decoded payload fields:
- `productId` (string)
- `assetId` (string)
- `outputDir` (string)
- `overwrite` (boolean)

### Result and evidence

- Delivery: `file`.
- Stable result fields:
- `result` (object): Stable result from workflow_products.export.
- `fileId` (string)
- `file` (object)
- `delivery` (object): Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.
- Completion evidence:
- The structured product download result and the exact invocation inputs used to obtain it.
- productId, product metadata, downloaded asset, or removal result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `productId` (caller-owned): Required by the command invocation.
- produce `fileId` (short-lived): Returned when the corresponding operation succeeds.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge product get`

Read one normal Dashboard Product

### Backend and freshness

- Targets: `capability:workflow_products.get`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use product get when the required operation is: Read one normal Dashboard Product.
- The task concerns a completed workflow Product rather than a workflow run or raw file handle.

Avoid when:
- Do not use product get when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not infer Product completion from workflow terminal state without reading the Product record.

Distinguish from:
- product download: choose it only when its narrower result matches the task.
- product list: choose it only when its narrower result matches the task.
- product remove: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge product get`.
- Example: `zotero-bridge product get 'product-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `product_id` → positional 1 as `PRODUCT_ID` (required, takes a value).
- CLI invocation fields:
- `product_id` (string): Dashboard Product id
- Decoded payload fields:
- `productId` (string)

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from workflow_products.get.
- `productId` (string)
- Completion evidence:
- The structured product get result and the exact invocation inputs used to obtain it.
- productId, product metadata, downloaded asset, or removal result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- consume `productId` (caller-owned): Required by the command invocation.
- produce `productId` (response): Returned when the corresponding operation succeeds.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge product list`

List normal Dashboard Products

### Backend and freshness

- Targets: `capability:workflow_products.list`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use product list when the required operation is: List normal Dashboard Products.
- The task concerns a completed workflow Product rather than a workflow run or raw file handle.

Avoid when:
- Do not use product list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not infer Product completion from workflow terminal state without reading the Product record.

Distinguish from:
- product download: choose it only when its narrower result matches the task.
- product get: choose it only when its narrower result matches the task.
- product remove: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge product list`.
- Example: `zotero-bridge product list`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `workflow-id` → option `--workflow-id` (optional, takes a value).
- `backend-id` → option `--backend-id` (optional, takes a value).
- `request-id` → option `--request-id` (optional, takes a value).
- `cursor` → option `--cursor` (optional, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- CLI invocation fields:
- `workflow-id` (string)
- `backend-id` (string)
- `request-id` (string)
- `cursor` (string)
- `limit` (string)
- Decoded payload fields:
- `workflowId` (string)
- `backendId` (string)
- `requestId` (string)
- `cursor` (number | string)
- `limit` (number | string)

### Result and evidence

- Delivery: `cursor`.
- Stable result fields:
- `result` (object): Stable result from workflow_products.list.
- `products` (array)
- `nextCursor` (string | number | null)
- `hasMore` (boolean)
- Completion evidence:
- The structured product list result and the exact invocation inputs used to obtain it.
- productId, product metadata, downloaded asset, or removal result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge product remove`

Remove one Dashboard Product record through Zotero approval

### Backend and freshness

- Targets: `capability:workflow_products.remove`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use product remove when the required operation is: Remove one Dashboard Product record through Zotero approval.
- The task concerns a completed workflow Product rather than a workflow run or raw file handle.

Avoid when:
- Do not use product remove when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not infer Product completion from workflow terminal state without reading the Product record.

Distinguish from:
- product download: choose it only when its narrower result matches the task.
- product get: choose it only when its narrower result matches the task.
- product list: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge product remove`.
- Example: `zotero-bridge product remove 'product-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `product_id` → positional 1 as `PRODUCT_ID` (required, takes a value).
- CLI invocation fields:
- `product_id` (string): Dashboard Product id
- Decoded payload fields:
- `productId` (string)

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from workflow_products.remove.
- Completion evidence:
- The structured product remove result and the exact invocation inputs used to obtain it.
- productId, product metadata, downloaded asset, or removal result

### Approval, effects, and handles

- Approval: `zotero-ui-required` at `before-command`; Zotero UI approval for the described Host-owned effect.
- Effect `product-store`: May change product store state. stateChanged=true.
- consume `productId` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
