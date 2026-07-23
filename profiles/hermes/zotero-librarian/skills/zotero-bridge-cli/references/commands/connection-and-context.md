# Zotero Bridge CLI Connection and Context Commands

Use this generated reference for `surface`, `bridge`, and `context` commands after selecting the exact canonical operation.

## `zotero-bridge bridge backend list`

List redacted backend profile diagnostics

- Argv: `["bridge","backend","list"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/backends"}]`.
- Aliases: `bridge backend list`, `bridge`, `backend`, `list`.
- Intent search: `visible`.

## `zotero-bridge bridge backend status`

Read one redacted backend profile status

- Argv: `["bridge","backend","status"]`.
- Argv bindings: `[{"property":"backend_id","kind":"positional","token":"BACKEND_ID","position":1,"takesValue":true,"required":true,"valueNames":["BACKEND_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"backend_id":{"type":"string","description":"Backend id","position":1}},"required":["backend_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"backend_id":{"type":"string","description":"Backend id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/backends/{backendId}"}]`.
- Aliases: `bridge backend status`, `bridge`, `backend`, `status`, `backend_id`, `BACKEND_ID`.
- Intent search: `visible`.

## `zotero-bridge bridge manifest`

Read the authenticated Zotero Bridge service manifest

- Argv: `["bridge","manifest"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/manifest"}]`.
- Aliases: `bridge manifest`, `bridge`, `manifest`.
- Intent search: `visible`.

## `zotero-bridge bridge profile diagnose`

Diagnose Zotero Bridge connection-profile readiness

- Argv: `["bridge","profile","diagnose"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/profile/diagnose"}]`.
- Aliases: `bridge profile diagnose`, `bridge`, `profile`, `diagnose`.
- Intent search: `visible`.

## `zotero-bridge bridge profile inspect`

Inspect the redacted Zotero Bridge connection profile

- Argv: `["bridge","profile","inspect"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/profile"}]`.
- Aliases: `bridge profile inspect`, `bridge`, `profile`, `inspect`.
- Intent search: `visible`.

## `zotero-bridge bridge status`

Check Zotero Bridge service health without authentication

- Argv: `["bridge","status"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/health"}]`.
- Aliases: `bridge status`, `bridge`, `status`.
- Intent search: `visible`.

## `zotero-bridge context collection open`

Open one Zotero collection

- Argv: `["context","collection","open"]`.
- Argv bindings: `[{"property":"collection_key","kind":"positional","token":"COLLECTION_KEY","position":1,"takesValue":true,"required":true,"valueNames":["COLLECTION_KEY"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"collection_key":{"type":"string","description":"Zotero collection key","position":1},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":["collection_key"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"collection_key":{"type":"string","description":"Zotero collection key"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `navigation`; danger: `review`.
- Effects: `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"collectionKey","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/context/collections/open"}]`.
- Aliases: `context collection open`, `context`, `collection`, `open`, `collection_key`, `COLLECTION_KEY`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent search: `visible`.

## `zotero-bridge context current`

Read current Zotero UI context

- Argv: `["context","current"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"context.get_current_view"},{"kind":"endpoint","target":"GET /bridge/v1/context/current"}]`.
- Aliases: `context current`, `context`, `current`.
- Intent search: `visible`.

## `zotero-bridge context item open`

Open one Zotero item

- Argv: `["context","item","open"]`.
- Argv bindings: `[{"property":"object_ref","kind":"positional","token":"OBJECT_REF","position":1,"takesValue":true,"required":true,"valueNames":["OBJECT_REF"]}]`.
- Invocation schema: `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object","position":1}},"required":["object_ref"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `navigation`; danger: `review`.
- Effects: `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/context/items/open"}]`.
- Aliases: `context item open`, `context`, `item`, `open`, `object_ref`, `OBJECT_REF`.
- Intent search: `visible`.

## `zotero-bridge context note open`

Open one Zotero note

- Argv: `["context","note","open"]`.
- Argv bindings: `[{"property":"object_ref","kind":"positional","token":"OBJECT_REF","position":1,"takesValue":true,"required":true,"valueNames":["OBJECT_REF"]}]`.
- Invocation schema: `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object","position":1}},"required":["object_ref"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `navigation`; danger: `review`.
- Effects: `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"noteRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/context/notes/open"}]`.
- Aliases: `context note open`, `context`, `note`, `open`, `object_ref`, `OBJECT_REF`.
- Intent search: `visible`.

## `zotero-bridge context selection get`

Read selected Zotero item summaries

- Argv: `["context","selection","get"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"itemRef":{"type":"string"}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"context.get_selected_items"},{"kind":"endpoint","target":"GET /bridge/v1/context/selection"}]`.
- Aliases: `context selection get`, `context`, `selection`, `get`.
- Intent search: `visible`.

## `zotero-bridge context selection open`

Open one or more Zotero items as the active selection

- Argv: `["context","selection","open"]`.
- Argv bindings: `[{"property":"item_refs","kind":"positional","token":"ITEM_REFS","position":1,"takesValue":true,"required":true,"valueNames":["ITEM_REFS"]}]`.
- Invocation schema: `{"type":"object","properties":{"item_refs":{"type":"array","items":{"type":"string"},"description":"Zotero item refs","position":1}},"required":["item_refs"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"item_refs":{"type":"string","description":"Zotero item refs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `navigation`; danger: `review`.
- Effects: `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/context/selection/open"}]`.
- Aliases: `context selection open`, `context`, `selection`, `open`, `item_refs`, `ITEM_REFS`.
- Intent search: `visible`.

## `zotero-bridge surface describe`

Describe one canonical command

- Argv: `["surface","describe"]`.
- Argv bindings: `[{"property":"command","kind":"positional","token":"COMMAND","position":1,"takesValue":true,"required":true,"valueNames":["COMMAND"]},{"property":"json","kind":"option","token":"--json","takesValue":false,"required":false,"valueNames":["JSON"]}]`.
- Invocation schema: `{"type":"object","properties":{"command":{"type":"array","items":{"type":"string"},"description":"Canonical command, for example workflow submit","position":1},"json":{"type":"boolean","description":"Emit JSON (the CLI output contract is always JSON)"}},"required":["command"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"command":{"type":"string","description":"Canonical command, for example workflow submit"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true."}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `surface describe`, `surface`, `describe`, `command`, `COMMAND`, `json`, `JSON`.
- Intent search: `visible`.

## `zotero-bridge surface identity`

Print exact CLI build and command-catalog identity

- Argv: `["surface","identity"]`.
- Argv bindings: `[{"property":"json","kind":"option","token":"--json","takesValue":false,"required":false,"valueNames":["JSON"]}]`.
- Invocation schema: `{"type":"object","properties":{"json":{"type":"boolean","description":"Emit JSON (the CLI output contract is always JSON)"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true."}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `surface identity`, `surface`, `identity`, `json`, `JSON`.
- Intent search: `visible`.

## `zotero-bridge surface search`

Search canonical commands by task intent

- Argv: `["surface","search"]`.
- Argv bindings: `[{"property":"intent","kind":"option","token":"--intent","takesValue":true,"required":true,"valueNames":["INTENT"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"include-debug","kind":"option","token":"--include-debug","takesValue":false,"required":false,"valueNames":["INCLUDE_DEBUG"]},{"property":"json","kind":"option","token":"--json","takesValue":false,"required":false,"valueNames":["JSON"]}]`.
- Invocation schema: `{"type":"object","properties":{"intent":{"type":"string","description":"Natural-language task intent"},"limit":{"type":"string","description":"Maximum number of ranked matches (1-100)"},"include-debug":{"type":"boolean","description":"Include raw and debug commands in intent recommendations"},"json":{"type":"boolean","description":"Emit JSON (the CLI output contract is always JSON)"}},"required":["intent"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"intent":{"type":"string","description":"Natural-language task intent"},"limit":{"type":"string","description":"Maximum number of ranked matches (1-100)"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true."}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `surface search`, `surface`, `search`, `intent`, `INTENT`, `limit`, `LIMIT`, `include_debug`, `include-debug`, `INCLUDE_DEBUG`, `json`, `JSON`.
- Intent search: `visible`.

