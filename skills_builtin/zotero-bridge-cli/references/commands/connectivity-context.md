# Connectivity Context

Load this manual only after the task has been routed to this domain. Each card combines exact CLI/backend facts with task-selection and evidence guidance.

## `zotero-bridge bridge backend list`

List redacted backend profile diagnostics

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/diagnostics/backends`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use bridge backend list when the required operation is: List redacted backend profile diagnostics.
- The task needs current bridge, profile, manifest, or backend state.

Avoid when:
- Do not use bridge backend list when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use bridge diagnostics for Zotero library facts.

Distinguish from:
- bridge backend status: choose it only when its narrower result matches the task.
- bridge manifest: choose it only when its narrower result matches the task.
- bridge profile diagnose: choose it only when its narrower result matches the task.
- bridge profile inspect: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge bridge backend list`.
- Example: `zotero-bridge bridge backend list`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/diagnostics/backends.
- Completion evidence:
- The structured bridge backend list result and the exact invocation inputs used to obtain it.
- health, manifest, profile, or backend diagnostic result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge bridge backend status`

Read one redacted backend profile status

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/diagnostics/backends/{backendId}`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use bridge backend status when the required operation is: Read one redacted backend profile status.
- The task needs current bridge, profile, manifest, or backend state.

Avoid when:
- Do not use bridge backend status when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use bridge diagnostics for Zotero library facts.

Distinguish from:
- bridge backend list: choose it only when its narrower result matches the task.
- bridge manifest: choose it only when its narrower result matches the task.
- bridge profile diagnose: choose it only when its narrower result matches the task.
- bridge profile inspect: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge bridge backend status`.
- Example: `zotero-bridge bridge backend status 'backend-id'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `backend_id` → positional 1 as `BACKEND_ID` (required, takes a value).
- CLI invocation fields:
- `backend_id` (string): Backend id
- Decoded payload fields:
- `backend_id` (string): Backend id

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/diagnostics/backends/{backendId}.
- Completion evidence:
- The structured bridge backend status result and the exact invocation inputs used to obtain it.
- health, manifest, profile, or backend diagnostic result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge bridge manifest`

Read authenticated Host Bridge manifest

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/manifest`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use bridge manifest when the required operation is: Read authenticated Host Bridge manifest.
- The task needs current bridge, profile, manifest, or backend state.

Avoid when:
- Do not use bridge manifest when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use bridge diagnostics for Zotero library facts.

Distinguish from:
- bridge backend list: choose it only when its narrower result matches the task.
- bridge backend status: choose it only when its narrower result matches the task.
- bridge profile diagnose: choose it only when its narrower result matches the task.
- bridge profile inspect: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge bridge manifest`.
- Example: `zotero-bridge bridge manifest`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/manifest.
- Completion evidence:
- The structured bridge manifest result and the exact invocation inputs used to obtain it.
- health, manifest, profile, or backend diagnostic result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge bridge profile diagnose`

Diagnose Host Bridge profile readiness

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/diagnostics/profile/diagnose`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use bridge profile diagnose when the required operation is: Diagnose Host Bridge profile readiness.
- The task needs current bridge, profile, manifest, or backend state.

Avoid when:
- Do not use bridge profile diagnose when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use bridge diagnostics for Zotero library facts.

Distinguish from:
- bridge backend list: choose it only when its narrower result matches the task.
- bridge backend status: choose it only when its narrower result matches the task.
- bridge manifest: choose it only when its narrower result matches the task.
- bridge profile inspect: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge bridge profile diagnose`.
- Example: `zotero-bridge bridge profile diagnose`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/diagnostics/profile/diagnose.
- Completion evidence:
- The structured bridge profile diagnose result and the exact invocation inputs used to obtain it.
- health, manifest, profile, or backend diagnostic result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge bridge profile inspect`

Inspect the redacted Host Bridge profile

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/diagnostics/profile`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use bridge profile inspect when the required operation is: Inspect the redacted Host Bridge profile.
- The task needs current bridge, profile, manifest, or backend state.

Avoid when:
- Do not use bridge profile inspect when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use bridge diagnostics for Zotero library facts.

Distinguish from:
- bridge backend list: choose it only when its narrower result matches the task.
- bridge backend status: choose it only when its narrower result matches the task.
- bridge manifest: choose it only when its narrower result matches the task.
- bridge profile diagnose: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge bridge profile inspect`.
- Example: `zotero-bridge bridge profile inspect`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/diagnostics/profile.
- Completion evidence:
- The structured bridge profile inspect result and the exact invocation inputs used to obtain it.
- health, manifest, profile, or backend diagnostic result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge bridge status`

Check Host Bridge health without authentication

### Backend and freshness

- Targets: `endpoint:GET /bridge/v1/health`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use bridge status when the required operation is: Check Host Bridge health without authentication.
- The task needs current bridge, profile, manifest, or backend state.

Avoid when:
- Do not use bridge status when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use bridge diagnostics for Zotero library facts.

Distinguish from:
- bridge backend list: choose it only when its narrower result matches the task.
- bridge backend status: choose it only when its narrower result matches the task.
- bridge manifest: choose it only when its narrower result matches the task.
- bridge profile diagnose: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge bridge status`.
- Example: `zotero-bridge bridge status`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from GET /bridge/v1/health.
- Completion evidence:
- The structured bridge status result and the exact invocation inputs used to obtain it.
- health, manifest, profile, or backend diagnostic result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge context collection open`

Open one Zotero collection

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/context/collections/open`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use context collection open when the required operation is: Open one Zotero collection.
- The request refers to this item, the current collection, selection, note, or pane.

Avoid when:
- Do not use context collection open when the task needs a different sibling result, control plane, or freshness guarantee.
- Navigation changes the visible Zotero context but is not a metadata mutation.

Distinguish from:
- context current: choose it only when its narrower result matches the task.
- context item open: choose it only when its narrower result matches the task.
- context note open: choose it only when its narrower result matches the task.
- context selection get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge context collection open`.
- Example: `zotero-bridge context collection open 'collection-key'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `collection_key` → positional 1 as `COLLECTION_KEY` (required, takes a value).
- `library-id` → option `--library-id` (optional, takes a value).
- CLI invocation fields:
- `collection_key` (string): Zotero collection key
- `library-id` (string): Zotero library id for key lookup
- Decoded payload fields:
- `collection_key` (string): Zotero collection key
- `library_id` (string): Zotero library id for key lookup

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/context/collections/open.
- Completion evidence:
- The structured context collection open result and the exact invocation inputs used to obtain it.
- current view, stable Zotero refs, or navigation result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `ui-navigation`: May change ui navigation state. stateChanged=true.
- consume `collectionKey` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge context current`

Read current Zotero UI context

### Backend and freshness

- Targets: `capability:context.get_current_view`, `endpoint:GET /bridge/v1/context/current`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use context current when the required operation is: Read current Zotero UI context.
- The request refers to this item, the current collection, selection, note, or pane.

Avoid when:
- Do not use context current when the task needs a different sibling result, control plane, or freshness guarantee.
- Navigation changes the visible Zotero context but is not a metadata mutation.

Distinguish from:
- context collection open: choose it only when its narrower result matches the task.
- context item open: choose it only when its narrower result matches the task.
- context note open: choose it only when its narrower result matches the task.
- context selection get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge context current`.
- Example: `zotero-bridge context current`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from context.get_current_view, GET /bridge/v1/context/current.
- Completion evidence:
- The structured context current result and the exact invocation inputs used to obtain it.
- current view, stable Zotero refs, or navigation result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge context item open`

Open one Zotero item

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/context/items/open`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use context item open when the required operation is: Open one Zotero item.
- The request refers to this item, the current collection, selection, note, or pane.

Avoid when:
- Do not use context item open when the task needs a different sibling result, control plane, or freshness guarantee.
- Navigation changes the visible Zotero context but is not a metadata mutation.

Distinguish from:
- context collection open: choose it only when its narrower result matches the task.
- context current: choose it only when its narrower result matches the task.
- context note open: choose it only when its narrower result matches the task.
- context selection get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge context item open`.
- Example: `zotero-bridge context item open 'object-ref'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `object_ref` → positional 1 as `OBJECT_REF` (required, takes a value).
- CLI invocation fields:
- `object_ref` (string): Zotero object ref: key, numeric id, libraryId:key, or JSON object
- Decoded payload fields:
- `object_ref` (string): Zotero object ref: key, numeric id, libraryId:key, or JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/context/items/open.
- Completion evidence:
- The structured context item open result and the exact invocation inputs used to obtain it.
- current view, stable Zotero refs, or navigation result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `ui-navigation`: May change ui navigation state. stateChanged=true.
- consume `itemRef` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge context note open`

Open one Zotero note

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/context/notes/open`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use context note open when the required operation is: Open one Zotero note.
- The request refers to this item, the current collection, selection, note, or pane.

Avoid when:
- Do not use context note open when the task needs a different sibling result, control plane, or freshness guarantee.
- Navigation changes the visible Zotero context but is not a metadata mutation.

Distinguish from:
- context collection open: choose it only when its narrower result matches the task.
- context current: choose it only when its narrower result matches the task.
- context item open: choose it only when its narrower result matches the task.
- context selection get: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge context note open`.
- Example: `zotero-bridge context note open 'object-ref'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `object_ref` → positional 1 as `OBJECT_REF` (required, takes a value).
- CLI invocation fields:
- `object_ref` (string): Zotero object ref: key, numeric id, libraryId:key, or JSON object
- Decoded payload fields:
- `object_ref` (string): Zotero object ref: key, numeric id, libraryId:key, or JSON object

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/context/notes/open.
- Completion evidence:
- The structured context note open result and the exact invocation inputs used to obtain it.
- current view, stable Zotero refs, or navigation result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `ui-navigation`: May change ui navigation state. stateChanged=true.
- consume `noteRef` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge context selection get`

Read selected Zotero item summaries

### Backend and freshness

- Targets: `capability:context.get_selected_items`, `endpoint:GET /bridge/v1/context/selection`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use context selection get when the required operation is: Read selected Zotero item summaries.
- The request refers to this item, the current collection, selection, note, or pane.

Avoid when:
- Do not use context selection get when the task needs a different sibling result, control plane, or freshness guarantee.
- Navigation changes the visible Zotero context but is not a metadata mutation.

Distinguish from:
- context collection open: choose it only when its narrower result matches the task.
- context current: choose it only when its narrower result matches the task.
- context item open: choose it only when its narrower result matches the task.
- context note open: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge context selection get`.
- Example: `zotero-bridge context selection get`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- No command arguments.
- CLI invocation fields:
- No structured fields.
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from context.get_selected_items, GET /bridge/v1/context/selection.
- `itemRef` (string)
- Completion evidence:
- The structured context selection get result and the exact invocation inputs used to obtain it.
- current view, stable Zotero refs, or navigation result
- ordered top-level item refs and selection summaries

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- produce `itemRef` (response): Returned when the corresponding operation succeeds.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge context selection open`

Open one or more Zotero items as the active selection

### Backend and freshness

- Targets: `endpoint:POST /bridge/v1/context/selection/open`.
- Freshness: live Host Bridge response for this invocation.

### Choose this command

Use when:
- Use context selection open when the required operation is: Open one or more Zotero items as the active selection.
- The request refers to this item, the current collection, selection, note, or pane.

Avoid when:
- Do not use context selection open when the task needs a different sibling result, control plane, or freshness guarantee.
- Navigation changes the visible Zotero context but is not a metadata mutation.

Distinguish from:
- context collection open: choose it only when its narrower result matches the task.
- context current: choose it only when its narrower result matches the task.
- context item open: choose it only when its narrower result matches the task.
- context note open: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge context selection open`.
- Example: `zotero-bridge context selection open 'item-refs'`.
- Preconditions:
- Verify the exact CLI identity and a reachable Host Bridge before relying on live results.
- Exact argv bindings:
- `item_refs` → positional 1 as `ITEM_REFS` (required, takes a value).
- CLI invocation fields:
- `item_refs` (string): Zotero item refs
- Decoded payload fields:
- `item_refs` (string): Zotero item refs

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from POST /bridge/v1/context/selection/open.
- Completion evidence:
- The structured context selection open result and the exact invocation inputs used to obtain it.
- current view, stable Zotero refs, or navigation result

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `ui-navigation`: May change ui navigation state. stateChanged=true.
- consume `itemRef` (caller-owned): Required by the command invocation.

### Failure and recovery

- The operation fails or completion is uncertain. Inspect stateChanged and handleConsumed before repeating the operation. Next: `surface describe`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge surface describe`

Describe one canonical command

### Backend and freshness

- Targets: `service:embedded host-bridge.agent-surface.v2`.
- Freshness: embedded offline contract; it does not prove Host Bridge reachability.

### Choose this command

Use when:
- Use surface describe when the required operation is: Describe one canonical command.
- The task needs offline identity or command metadata before connecting to Zotero.

Avoid when:
- Do not use surface describe when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use discovery commands as evidence that the Host Bridge is currently reachable.

Distinguish from:
- surface identity: choose it only when its narrower result matches the task.
- surface search: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge surface describe`.
- Example: `zotero-bridge surface describe 'surface identity'`.
- Preconditions:
- No Zotero connection is required.
- Exact argv bindings:
- `command` → positional 1 as `COMMAND` (required, takes a value).
- `json` → option `--json` (optional, flag).
- CLI invocation fields:
- `command` (string): Canonical command, for example workflow submit
- `json` (boolean): Emit JSON (the CLI output contract is always JSON)
- Decoded payload fields:
- `command` (string): Canonical command, for example workflow submit

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from embedded host-bridge.agent-surface.v2.
- Completion evidence:
- The structured surface describe result and the exact invocation inputs used to obtain it.
- surface identity or the described command entry

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface identity`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge surface identity`

Print exact CLI build and command-catalog identity

### Backend and freshness

- Targets: `service:embedded host-bridge.agent-surface.v2`.
- Freshness: embedded offline contract; it does not prove Host Bridge reachability.

### Choose this command

Use when:
- Use surface identity when the required operation is: Print exact CLI build and command-catalog identity.
- The task needs offline identity or command metadata before connecting to Zotero.

Avoid when:
- Do not use surface identity when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use discovery commands as evidence that the Host Bridge is currently reachable.

Distinguish from:
- surface describe: choose it only when its narrower result matches the task.
- surface search: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge surface identity`.
- Example: `zotero-bridge surface identity`.
- Preconditions:
- No Zotero connection is required.
- Exact argv bindings:
- `json` → option `--json` (optional, flag).
- CLI invocation fields:
- `json` (boolean): Emit JSON (the CLI output contract is always JSON)
- Decoded payload fields:
- No structured fields.

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from embedded host-bridge.agent-surface.v2.
- Completion evidence:
- The structured surface identity result and the exact invocation inputs used to obtain it.
- surface identity or the described command entry

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface identity`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.

## `zotero-bridge surface search`

Search canonical commands by task intent

### Backend and freshness

- Targets: `service:embedded host-bridge.agent-surface.v2`.
- Freshness: embedded offline contract; it does not prove Host Bridge reachability.

### Choose this command

Use when:
- Use surface search when the required operation is: Search canonical commands by task intent.
- The task needs offline identity or command metadata before connecting to Zotero.

Avoid when:
- Do not use surface search when the task needs a different sibling result, control plane, or freshness guarantee.
- Do not use discovery commands as evidence that the Host Bridge is currently reachable.

Distinguish from:
- surface describe: choose it only when its narrower result matches the task.
- surface identity: choose it only when its narrower result matches the task.

### Invocation and payload

- Canonical argv: `zotero-bridge surface search`.
- Example: `zotero-bridge surface search --intent 'inspect current selection'`.
- Preconditions:
- No Zotero connection is required.
- Exact argv bindings:
- `intent` → option `--intent` (required, takes a value).
- `limit` → option `--limit` (optional, takes a value).
- `include-debug` → option `--include-debug` (optional, flag).
- `json` → option `--json` (optional, flag).
- CLI invocation fields:
- `intent` (string): Natural-language task intent
- `limit` (string): Maximum number of ranked matches (1-100)
- `include-debug` (boolean): Include raw and debug commands in intent recommendations
- `json` (boolean): Emit JSON (the CLI output contract is always JSON)
- Decoded payload fields:
- `intent` (string): Natural-language task intent
- `limit` (string): Maximum number of ranked matches (1-100)

### Result and evidence

- Delivery: `none`.
- Stable result fields:
- `result` (object): Stable result from embedded host-bridge.agent-surface.v2.
- Completion evidence:
- The structured surface search result and the exact invocation inputs used to obtain it.
- surface identity or the described command entry

### Approval, effects, and handles

- Approval: `none` at `none`; No Host Bridge UI approval; provider runtimes may still request their own permission.
- Effect `none`: Reads state without changing Host-owned data. stateChanged=false.
- No typed handle transition.

### Failure and recovery

- The read fails or returns incomplete evidence. Inspect the error and retry only when retryable is true. Next: `surface identity`.
- Preserve the structured error envelope and inspect retryable, stateChanged, and handleConsumed before continuing.
