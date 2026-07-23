# Zotero Bridge CLI Command Reference

This reference is generated from the current mechanism-only Agent Surface descriptor. It is the exhaustive command inventory for this Skill. Use `surface describe` to confirm the active executable when the embedded identity and loaded binary differ.

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

## `zotero-bridge call`

Advanced diagnostic raw capability call

- Argv: `["call"]`.
- Argv bindings: `[{"property":"capability","kind":"positional","token":"CAPABILITY","position":1,"takesValue":true,"required":true,"valueNames":["CAPABILITY"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"capability":{"type":"string","description":"Capability name, for example library.get_item_detail","position":1},"input":{"type":"string","description":"Capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":["capability"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"capability":{"type":"string","description":"Capability name, for example library.get_item_detail"},"input":{"type":"string","description":"Capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"service","target":"POST /bridge/v1/call"}]`.
- Aliases: `call`, `capability`, `CAPABILITY`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

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

## `zotero-bridge debug acp-skill-run reapply-result`

Re-run applyResult for one existing ACP skill run result

- Argv: `["debug","acp-skill-run","reapply-result"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `review`.
- Effects: `[{"kind":"debug-repair","stateChanged":true,"description":"May change debug repair state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.acpSkillRun.reapplyResult"}]`.
- Aliases: `debug acp-skill-run reapply-result`, `debug`, `acp-skill-run`, `reapply-result`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug persistence`

Read debug-only persistence diagnostics

- Argv: `["debug","persistence"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.persistence.snapshot"}]`.
- Aliases: `debug persistence`, `debug`, `persistence`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug status`

Read debug-only Zotero Bridge service runtime status

- Argv: `["debug","status"]`.
- Argv bindings: `[]`.
- Invocation schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.status"}]`.
- Aliases: `debug status`, `debug`, `status`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis cache`

List debug-only Synthesis sidecar cache basis rows

- Argv: `["debug","synthesis","cache"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.cache.list"}]`.
- Aliases: `debug synthesis cache`, `debug`, `synthesis`, `cache`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis clean-install-reset`

Dangerous debug operation: reset Synthesis install state

- Argv: `["debug","synthesis","clean-install-reset"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"debug-repair","stateChanged":true,"description":"May change debug repair state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.cleanInstallReset"}]`.
- Aliases: `debug synthesis clean-install-reset`, `debug`, `synthesis`, `clean-install-reset`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis diff`

Read debug-only Synthesis DB/cache differences

- Argv: `["debug","synthesis","diff"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.diff"}]`.
- Aliases: `debug synthesis diff`, `debug`, `synthesis`, `diff`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis inspect-paper`

Inspect one debug Synthesis paper

- Argv: `["debug","synthesis","inspect-paper"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.paper.inspect"}]`.
- Aliases: `debug synthesis inspect-paper`, `debug`, `synthesis`, `inspect-paper`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis inspect-topic`

Inspect one debug Synthesis topic

- Argv: `["debug","synthesis","inspect-topic"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.topic.inspect"}]`.
- Aliases: `debug synthesis inspect-topic`, `debug`, `synthesis`, `inspect-topic`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis operations`

List debug-only Synthesis explicit operations

- Argv: `["debug","synthesis","operations"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.operations.list"}]`.
- Aliases: `debug synthesis operations`, `debug`, `synthesis`, `operations`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis profiler`

List debug-only Synthesis profiler timings

- Argv: `["debug","synthesis","profiler"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.profiler.list"}]`.
- Aliases: `debug synthesis profiler`, `debug`, `synthesis`, `profiler`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug synthesis snapshot`

Read a debug-only Synthesis snapshot

- Argv: `["debug","synthesis","snapshot"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.synthesis.snapshot"}]`.
- Aliases: `debug synthesis snapshot`, `debug`, `synthesis`, `snapshot`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge debug tasks`

Read debug-only workflow task diagnostics

- Argv: `["debug","tasks"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"debug.tasks.snapshot"}]`.
- Aliases: `debug tasks`, `debug`, `tasks`, `input`, `JSON_OR_FILE`.
- Intent search: `hidden`.

## `zotero-bridge file download`

Download one registered file handle

- Argv: `["file","download"]`.
- Argv bindings: `[{"property":"file_id","kind":"positional","token":"FILE_ID","position":1,"takesValue":true,"required":true,"valueNames":["FILE_ID"]},{"property":"output","kind":"option","token":"--output","takesValue":true,"required":true,"valueNames":["PATH"]},{"property":"force","kind":"option","token":"--force","takesValue":false,"required":false,"valueNames":["FORCE"]}]`.
- Invocation schema: `{"type":"object","properties":{"file_id":{"type":"string","description":"Broker-issued opaque file id","position":1},"output":{"type":"string","description":"Output file path"},"force":{"type":"boolean","description":"Overwrite the output file if it already exists"}},"required":["file_id","output"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"file_id":{"type":"string","description":"Broker-issued opaque file id"},"output":{"type":"string","description":"Output file path"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":true}`.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"fileId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/files/{fileId}"}]`.
- Aliases: `file download`, `file`, `download`, `file_id`, `FILE_ID`, `output`, `PATH`, `force`, `FORCE`.
- Intent search: `visible`.

## `zotero-bridge file upload`

Upload one local file through Zotero Bridge and return a short-lived file handle

- Argv: `["file","upload"]`.
- Argv bindings: `[{"property":"path","kind":"positional","token":"PATH","position":1,"takesValue":true,"required":true,"valueNames":["PATH"]},{"property":"display-name","kind":"option","token":"--display-name","takesValue":true,"required":false,"valueNames":["DISPLAY_NAME"]},{"property":"content-type","kind":"option","token":"--content-type","takesValue":true,"required":false,"valueNames":["CONTENT_TYPE"]}]`.
- Invocation schema: `{"type":"object","properties":{"path":{"type":"string","description":"Local file path to upload","position":1},"display-name":{"type":"string","description":"Display name stored in the Zotero-side file descriptor"},"content-type":{"type":"string","description":"Content type for the uploaded file"}},"required":["path"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"path":{"type":"string","description":"Local file path to upload"},"display_name":{"type":"string","description":"Display name stored in the Zotero-side file descriptor"},"content_type":{"type":"string","description":"Content type for the uploaded file"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"fileId":{"type":"string"}},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"ephemeral-file","stateChanged":true,"description":"May change ephemeral file state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/files/upload"}]`.
- Aliases: `file upload`, `file`, `upload`, `path`, `PATH`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.
- Intent search: `visible`.

## `zotero-bridge library annotation export`

Export reader annotations for one Zotero item

- Argv: `["library","annotation","export"]`.
- Argv bindings: `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"format","kind":"option","token":"--format","takesValue":true,"required":false,"valueNames":["FORMAT"]}]`.
- Invocation schema: `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"},"format":{"type":"string","description":"Export format"}},"required":["item"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"},"format":{"type":"string","description":"Export format"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.export_annotations"}]`.
- Aliases: `library annotation export`, `library`, `annotation`, `export`, `item`, `ITEM`, `format`, `FORMAT`.
- Intent search: `visible`.

## `zotero-bridge library annotation list`

List reader annotations for one Zotero item

- Argv: `["library","annotation","list"]`.
- Argv bindings: `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]}]`.
- Invocation schema: `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"}},"required":["item"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.list_annotations"}]`.
- Aliases: `library annotation list`, `library`, `annotation`, `list`, `item`, `ITEM`.
- Intent search: `visible`.

## `zotero-bridge library item attachments`

List child attachments for one Zotero item

- Argv: `["library","item","attachments"]`.
- Argv bindings: `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.get_item_attachments"}]`.
- Aliases: `library item attachments`, `library`, `item`, `attachments`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent search: `visible`.

## `zotero-bridge library item get`

Get detailed metadata for one Zotero item

- Argv: `["library","item","get"]`.
- Argv bindings: `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.get_item_detail"}]`.
- Aliases: `library item get`, `library`, `item`, `get`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent search: `visible`.

## `zotero-bridge library item notes`

List child notes for one Zotero item

- Argv: `["library","item","notes"]`.
- Argv bindings: `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"cursor","kind":"option","token":"--cursor","takesValue":true,"required":false,"valueNames":["CURSOR"]},{"property":"max-excerpt-chars","kind":"option","token":"--max-excerpt-chars","takesValue":true,"required":false,"valueNames":["MAX_EXCERPT_CHARS"]}]`.
- Invocation schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"},"limit":{"type":"string","description":"Maximum note summary count"},"cursor":{"type":"string","description":"Pagination cursor"},"max-excerpt-chars":{"type":"string","description":"Maximum excerpt characters per note"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"},"limit":{"type":"string","description":"Maximum note summary count"},"cursor":{"type":"string","description":"Pagination cursor"},"max_excerpt_chars":{"type":"string","description":"Maximum excerpt characters per note"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.get_item_notes"}]`.
- Aliases: `library item notes`, `library`, `item`, `notes`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `limit`, `LIMIT`, `cursor`, `CURSOR`, `max_excerpt_chars`, `max-excerpt-chars`, `MAX_EXCERPT_CHARS`.
- Intent search: `visible`.

## `zotero-bridge library item search`

Search Zotero library items

- Argv: `["library","item","search"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Bounded search query JSON object with text, limit, and libraryId"}},"required":["query"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","minLength":1,"maxLength":500},"limit":{"type":["number","string"],"minimum":1},"libraryId":{"type":["number","string"]}},"required":["query"],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.search_items"}]`.
- Aliases: `library item search`, `library`, `item`, `search`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge library items list`

List compact Zotero library item summaries

- Argv: `["library","items","list"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.list_items"}]`.
- Aliases: `library items list`, `library`, `items`, `list`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge library note get`

Read one Zotero note body chunk

- Argv: `["library","note","get"]`.
- Argv bindings: `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]},{"property":"format","kind":"option","token":"--format","takesValue":true,"required":false,"valueNames":["FORMAT"]},{"property":"offset","kind":"option","token":"--offset","takesValue":true,"required":false,"valueNames":["OFFSET"]},{"property":"max-chars","kind":"option","token":"--max-chars","takesValue":true,"required":false,"valueNames":["MAX_CHARS"]}]`.
- Invocation schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"},"format":{"type":"string","description":"Payload format"},"offset":{"type":"string","description":"Start offset"},"max-chars":{"type":"string","description":"Maximum characters"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"},"format":{"type":"string","description":"Payload format"},"offset":{"type":"string","description":"Start offset"},"max_chars":{"type":"string","description":"Maximum characters"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.get_note_detail"}]`.
- Aliases: `library note get`, `library`, `note`, `get`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `format`, `FORMAT`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.
- Intent search: `visible`.

## `zotero-bridge library note payload`

Read one embedded workflow payload from a Zotero note

- Argv: `["library","note","payload"]`.
- Argv bindings: `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]},{"property":"payload-type","kind":"option","token":"--payload-type","takesValue":true,"required":false,"valueNames":["PAYLOAD_TYPE"]},{"property":"offset","kind":"option","token":"--offset","takesValue":true,"required":false,"valueNames":["OFFSET"]},{"property":"max-chars","kind":"option","token":"--max-chars","takesValue":true,"required":false,"valueNames":["MAX_CHARS"]}]`.
- Invocation schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"},"payload-type":{"type":"string","description":"Payload type to decode"},"offset":{"type":"string","description":"Start offset"},"max-chars":{"type":"string","description":"Maximum characters"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"},"payload_type":{"type":"string","description":"Payload type to decode"},"offset":{"type":"string","description":"Start offset"},"max_chars":{"type":"string","description":"Maximum characters"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.get_note_payload"}]`.
- Aliases: `library note payload`, `library`, `note`, `payload`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `payload_type`, `payload-type`, `PAYLOAD_TYPE`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.
- Intent search: `visible`.

## `zotero-bridge library note payloads`

List embedded workflow payloads in one Zotero note

- Argv: `["library","note","payloads"]`.
- Argv bindings: `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.list_note_payloads"}]`.
- Aliases: `library note payloads`, `library`, `note`, `payloads`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent search: `visible`.

## `zotero-bridge library readiness audit`

Audit PDF, source Markdown, and literature-analysis artifact readiness

- Argv: `["library","readiness","audit"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.readiness_audit"}]`.
- Aliases: `library readiness audit`, `library`, `readiness`, `audit`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge library readiness missing-analysis`

List Zotero items missing literature-analysis generated artifacts

- Argv: `["library","readiness","missing-analysis"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.readiness_audit"}]`.
- Aliases: `library readiness missing-analysis`, `library`, `readiness`, `missing-analysis`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge library readiness missing-markdown`

List Zotero items missing same-stem source Markdown

- Argv: `["library","readiness","missing-markdown"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.readiness_audit"}]`.
- Aliases: `library readiness missing-markdown`, `library`, `readiness`, `missing-markdown`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge library readiness missing-pdf`

List Zotero items missing a PDF attachment

- Argv: `["library","readiness","missing-pdf"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.readiness_audit"}]`.
- Aliases: `library readiness missing-pdf`, `library`, `readiness`, `missing-pdf`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge library snapshot`

Sync a Zotero library metadata snapshot page

- Argv: `["library","snapshot"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library.sync_snapshot"}]`.
- Aliases: `library snapshot`, `library`, `snapshot`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation apply`

Apply a Zotero mutation

- Argv: `["mutation","apply"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation apply`, `mutation`, `apply`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation collection add-items`

Add Zotero items to a collection

- Argv: `["mutation","collection","add-items"]`.
- Argv bindings: `[{"property":"collection","kind":"option","token":"--collection","takesValue":true,"required":true,"valueNames":["COLLECTION"]},{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]}]`.
- Invocation schema: `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"}},"required":["collection","items"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"string","description":"Target Zotero item refs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation collection add-items`, `mutation`, `collection`, `add-items`, `COLLECTION`, `items`, `ITEMS`.
- Intent search: `visible`.

## `zotero-bridge mutation collection create`

Create a Zotero collection

- Argv: `["mutation","collection","create"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Collection creation payload"}},"required":["input"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Collection creation payload"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation collection create`, `mutation`, `collection`, `create`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation collection remove-items`

Remove Zotero items from a collection

- Argv: `["mutation","collection","remove-items"]`.
- Argv bindings: `[{"property":"collection","kind":"option","token":"--collection","takesValue":true,"required":true,"valueNames":["COLLECTION"]},{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]}]`.
- Invocation schema: `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"}},"required":["collection","items"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"string","description":"Target Zotero item refs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation collection remove-items`, `mutation`, `collection`, `remove-items`, `COLLECTION`, `items`, `ITEMS`.
- Intent search: `visible`.

## `zotero-bridge mutation item attach-file`

Attach a file uploaded through Zotero Bridge to a Zotero item

- Argv: `["mutation","item","attach-file"]`.
- Argv bindings: `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"file-id","kind":"option","token":"--file-id","takesValue":true,"required":true,"valueNames":["FILE_ID"]},{"property":"display-name","kind":"option","token":"--display-name","takesValue":true,"required":false,"valueNames":["DISPLAY_NAME"]},{"property":"content-type","kind":"option","token":"--content-type","takesValue":true,"required":false,"valueNames":["CONTENT_TYPE"]}]`.
- Invocation schema: `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"file-id":{"type":"string","description":"Bridge-issued uploaded file id"},"display-name":{"type":"string","description":"Attachment display name"},"content-type":{"type":"string","description":"Attachment content type"}},"required":["item","file-id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"file_id":{"type":"string","description":"Bridge-issued uploaded file id"},"display_name":{"type":"string","description":"Attachment display name"},"content_type":{"type":"string","description":"Attachment content type"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"fileId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation item attach-file`, `mutation`, `item`, `attach-file`, `ITEM`, `file_id`, `file-id`, `FILE_ID`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.
- Intent search: `visible`.

## `zotero-bridge mutation item update`

Update Zotero item fields

- Argv: `["mutation","item","update"]`.
- Argv bindings: `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"patch","kind":"option","token":"--patch","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"patch":{"type":"string","description":"Field patch JSON object"}},"required":["item","patch"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"patch":{"type":"string","description":"Field patch JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation item update`, `mutation`, `item`, `update`, `ITEM`, `patch`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation literature-ingest`

Ingest searched literature into Zotero

- Argv: `["mutation","literature-ingest"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin"}},"required":["input"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation literature-ingest`, `mutation`, `literature-ingest`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation note create`

Create a child note under one Zotero item

- Argv: `["mutation","note","create"]`.
- Argv bindings: `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"item":{"type":"string","description":"Parent Zotero item ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":["item","input"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"item":{"type":"string","description":"Parent Zotero item ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation note create`, `mutation`, `note`, `create`, `item`, `ITEM`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation note update`

Update one Zotero note

- Argv: `["mutation","note","update"]`.
- Argv bindings: `[{"property":"note","kind":"option","token":"--note","takesValue":true,"required":true,"valueNames":["NOTE"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":["note","input"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation note update`, `mutation`, `note`, `update`, `NOTE`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation note upsert-payload`

Upsert one embedded note payload

- Argv: `["mutation","note","upsert-payload"]`.
- Argv bindings: `[{"property":"note","kind":"option","token":"--note","takesValue":true,"required":true,"valueNames":["NOTE"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Payload JSON object"}},"required":["note","input"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Payload JSON object"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation note upsert-payload`, `mutation`, `note`, `upsert-payload`, `NOTE`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation preview`

Preview a Zotero mutation

- Argv: `["mutation","preview"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.preview"}]`.
- Aliases: `mutation preview`, `mutation`, `preview`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge mutation tag add`

Add tags to Zotero items

- Argv: `["mutation","tag","add"]`.
- Argv bindings: `[{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]},{"property":"tags","kind":"option","token":"--tags","takesValue":true,"required":true,"valueNames":["TAGS"]}]`.
- Invocation schema: `{"type":"object","properties":{"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"},"tags":{"type":"array","items":{"type":"string"},"description":"Tags to add or remove"}},"required":["items","tags"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"items":{"type":"string","description":"Target Zotero item refs"},"tags":{"type":"string","description":"Tags to add or remove"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation tag add`, `mutation`, `tag`, `add`, `items`, `ITEMS`, `tags`, `TAGS`.
- Intent search: `visible`.

## `zotero-bridge mutation tag remove`

Remove tags from Zotero items

- Argv: `["mutation","tag","remove"]`.
- Argv bindings: `[{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]},{"property":"tags","kind":"option","token":"--tags","takesValue":true,"required":true,"valueNames":["TAGS"]}]`.
- Invocation schema: `{"type":"object","properties":{"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"},"tags":{"type":"array","items":{"type":"string"},"description":"Tags to add or remove"}},"required":["items","tags"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"items":{"type":"string","description":"Target Zotero item refs"},"tags":{"type":"string","description":"Tags to add or remove"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"mutation.execute"}]`.
- Aliases: `mutation tag remove`, `mutation`, `tag`, `remove`, `items`, `ITEMS`, `tags`, `TAGS`.
- Intent search: `visible`.

## `zotero-bridge operation get`

Read one durable Zotero operation receipt

- Argv: `["operation","get"]`.
- Argv bindings: `[{"property":"operation_id","kind":"positional","token":"OPERATION_ID","position":1,"takesValue":true,"required":true,"valueNames":["OPERATION_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"operation_id":{"type":"string","description":"Operation id returned by or supplied to a state-changing command","position":1}},"required":["operation_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"operation_id":{"type":"string","description":"Operation id returned by or supplied to a state-changing command"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"schema":{"const":"host-bridge.operation-receipt.v1"},"operationId":{"type":"string"},"requestDigest":{"type":"string"},"attemptId":{"type":"string"},"method":{"type":"string"},"path":{"type":"string"},"state":{"enum":["in_progress","completed","outcome_unknown"]},"createdAt":{"type":"string"},"updatedAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"stateChange":{"enum":["unchanged","changed","unknown"]},"handleConsumption":{"enum":["unconsumed","consumed","unknown"]},"response":{"type":"object"}},"required":["schema","operationId","requestDigest","attemptId","method","path","state","createdAt","updatedAt","retentionExpiresAt","stateChange","handleConsumption"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"operationId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/operations/{operationId}"}]`.
- Aliases: `operation get`, `operation`, `get`, `operation_id`, `OPERATION_ID`.
- Intent search: `visible`.

## `zotero-bridge product download`

Download one or all Dashboard Product assets

- Argv: `["product","download"]`.
- Argv bindings: `[{"property":"product_id","kind":"positional","token":"PRODUCT_ID","position":1,"takesValue":true,"required":true,"valueNames":["PRODUCT_ID"]},{"property":"asset","kind":"option","token":"--asset","takesValue":true,"required":false,"valueNames":["ASSET"]},{"property":"output-dir","kind":"option","token":"--output-dir","takesValue":true,"required":true,"valueNames":["DIR"]},{"property":"force","kind":"option","token":"--force","takesValue":false,"required":false,"valueNames":["FORCE"]}]`.
- Invocation schema: `{"type":"object","properties":{"product_id":{"type":"string","description":"Dashboard Product id","position":1},"asset":{"type":"string","description":"Optional asset id; omit to download all assets"},"output-dir":{"type":"string","description":"Destination directory"},"force":{"type":"boolean","description":"Allow existing output files to be replaced"}},"required":["product_id","output-dir"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"productId":{"type":"string"},"assetId":{"type":"string"},"outputDir":{"type":"string"},"overwrite":{"type":"boolean"}},"required":["productId"],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"fileId":{"type":"string"},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"productId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"workflow_products.export"}]`.
- Aliases: `product download`, `product`, `download`, `product_id`, `PRODUCT_ID`, `asset`, `ASSET`, `output_dir`, `output-dir`, `DIR`, `force`, `FORCE`.
- Intent search: `visible`.

## `zotero-bridge product get`

Read one normal Dashboard Product

- Argv: `["product","get"]`.
- Argv bindings: `[{"property":"product_id","kind":"positional","token":"PRODUCT_ID","position":1,"takesValue":true,"required":true,"valueNames":["PRODUCT_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"product_id":{"type":"string","description":"Dashboard Product id","position":1}},"required":["product_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"productId":{"type":"string"}},"required":["productId"],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"productId":{"type":"string"}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"productId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"productId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"workflow_products.get"}]`.
- Aliases: `product get`, `product`, `get`, `product_id`, `PRODUCT_ID`.
- Intent search: `visible`.

## `zotero-bridge product list`

List normal Dashboard Products

- Argv: `["product","list"]`.
- Argv bindings: `[{"property":"workflow-id","kind":"option","token":"--workflow-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_ID"]},{"property":"backend-id","kind":"option","token":"--backend-id","takesValue":true,"required":false,"valueNames":["BACKEND_ID"]},{"property":"request-id","kind":"option","token":"--request-id","takesValue":true,"required":false,"valueNames":["REQUEST_ID"]},{"property":"cursor","kind":"option","token":"--cursor","takesValue":true,"required":false,"valueNames":["CURSOR"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow-id":{"type":"string"},"backend-id":{"type":"string"},"request-id":{"type":"string"},"cursor":{"type":"string"},"limit":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflowId":{"type":"string"},"backendId":{"type":"string"},"requestId":{"type":"string"},"cursor":{"type":["number","string"],"minimum":0},"limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"products":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"workflow_products.list"}]`.
- Aliases: `product list`, `product`, `list`, `workflow_id`, `workflow-id`, `WORKFLOW_ID`, `backend_id`, `backend-id`, `BACKEND_ID`, `request_id`, `request-id`, `REQUEST_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge product remove`

Remove one Dashboard Product record through Zotero approval

- Argv: `["product","remove"]`.
- Argv bindings: `[{"property":"product_id","kind":"positional","token":"PRODUCT_ID","position":1,"takesValue":true,"required":true,"valueNames":["PRODUCT_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"product_id":{"type":"string","description":"Dashboard Product id","position":1}},"required":["product_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"productId":{"type":"string"}},"required":["productId"],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"product-store","stateChanged":true,"description":"May change product store state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[{"handle":"productId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"workflow_products.remove"}]`.
- Aliases: `product remove`, `product`, `remove`, `product_id`, `PRODUCT_ID`.
- Intent search: `visible`.

## `zotero-bridge run active`

List lightweight active workflow runtime tasks

- Argv: `["run","active"]`.
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
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/active"}]`.
- Aliases: `run active`, `run`, `active`.
- Intent search: `visible`.

## `zotero-bridge run cancel`

Request cancellation of a workflow run

- Argv: `["run","cancel"]`.
- Argv bindings: `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]},{"property":"reason","kind":"option","token":"--reason","takesValue":true,"required":false,"valueNames":["REASON"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":false,"valueNames":["MESSAGE"]}]`.
- Invocation schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/runs/{workflowRunId}/cancel"}]`.
- Aliases: `run cancel`, `run`, `cancel`, `run_id`, `RUN_ID`, `reason`, `REASON`, `message`, `MESSAGE`.
- Intent search: `visible`.

## `zotero-bridge run get`

Read one workflow run status

- Argv: `["run","get"]`.
- Argv bindings: `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"skillRunId":{"type":"string"}},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"skillRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs/{workflowRunId}"}]`.
- Aliases: `run get`, `run`, `get`, `run_id`, `RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge run list`

List active and recent workflow runtime tasks

- Argv: `["run","list"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"backend-type","kind":"option","token":"--backend-type","takesValue":true,"required":false,"valueNames":["BACKEND_TYPE"]},{"property":"request","kind":"option","token":"--request","takesValue":true,"required":false,"valueNames":["REQUEST"]},{"property":"run","kind":"option","token":"--run","takesValue":true,"required":false,"valueNames":["RUN"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"active-only","kind":"option","token":"--active-only","takesValue":false,"required":false,"valueNames":["ACTIVE_ONLY"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend-type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"},"active-only":{"type":"boolean","description":"Only return active task runtime rows"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend_type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/tasks"}]`.
- Aliases: `run list`, `run`, `list`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `request`, `REQUEST`, `RUN`, `state`, `STATE`, `active_only`, `active-only`, `ACTIVE_ONLY`.
- Intent search: `visible`.

## `zotero-bridge run notification ack`

Acknowledge workflow notification inbox events

- Argv: `["run","notification","ack"]`.
- Argv bindings: `[{"property":"event","kind":"option","token":"--event","takesValue":true,"required":true,"valueNames":["EVENTS"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"event":{"type":"array","items":{"type":"string"},"description":"Notification event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":["event"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"event":{"type":"string","description":"Notification event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"eventId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/notifications/ack"}]`.
- Aliases: `run notification ack`, `run`, `notification`, `ack`, `events`, `event`, `EVENTS`, `client_id`, `client-id`, `CLIENT_ID`.
- Intent search: `visible`.

## `zotero-bridge run notification list`

List workflow notification inbox events

- Argv: `["run","notification","list"]`.
- Argv bindings: `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- Aliases: `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run notification wait`

Poll until a workflow notification is available

- Argv: `["run","notification","wait"]`.
- Argv bindings: `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"timeout-ms","kind":"option","token":"--timeout-ms","takesValue":true,"required":false,"valueNames":["TIMEOUT_MS"]},{"property":"interval-ms","kind":"option","token":"--interval-ms","takesValue":true,"required":false,"valueNames":["INTERVAL_MS"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout-ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval-ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout_ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval_ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- Aliases: `run notification wait`, `run`, `notification`, `wait`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`, `timeout_ms`, `timeout-ms`, `TIMEOUT_MS`, `interval_ms`, `interval-ms`, `INTERVAL_MS`.
- Intent search: `visible`.

## `zotero-bridge run permission get`

Read one Zotero-side permission request

- Argv: `["run","permission","get"]`.
- Argv bindings: `[{"property":"permission_request_id","kind":"positional","token":"PERMISSION_REQUEST_ID","position":1,"takesValue":true,"required":true,"valueNames":["PERMISSION_REQUEST_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id","position":1}},"required":["permission_request_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"permissionRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/{permissionRequestId}"}]`.
- Aliases: `run permission get`, `run`, `permission`, `get`, `permission_request_id`, `PERMISSION_REQUEST_ID`.
- Intent search: `visible`.

## `zotero-bridge run permission pending`

List pending Zotero-side permission requests

- Argv: `["run","permission","pending"]`.
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
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/pending"}]`.
- Aliases: `run permission pending`, `run`, `permission`, `pending`.
- Intent search: `visible`.

## `zotero-bridge run recent`

List lightweight recent workflow runtime tasks

- Argv: `["run","recent"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/recent"}]`.
- Aliases: `run recent`, `run`, `recent`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run skill connect`

Connect a recoverable ACP skill run

- Argv: `["run","skill","connect"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/connect"}]`.
- Aliases: `run skill connect`, `run`, `skill`, `connect`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge run skill events`

List lightweight lifecycle events for one skill run

- Argv: `["run","skill","events"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"since-updated-at","kind":"option","token":"--since-updated-at","takesValue":true,"required":false,"valueNames":["SINCE_UPDATED_AT"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"since-updated-at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"since_updated_at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"events":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}/events"}]`.
- Aliases: `run skill events`, `run`, `skill`, `events`, `skill_run_id`, `SKILL_RUN_ID`, `since_updated_at`, `since-updated-at`, `SINCE_UPDATED_AT`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run skill get`

Read one concrete skill run

- Argv: `["run","skill","get"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}"}]`.
- Aliases: `run skill get`, `run`, `skill`, `get`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge run skill recent`

List recent concrete skill runs

- Argv: `["run","skill","recent"]`.
- Argv bindings: `[{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"skillRuns":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/recent"}]`.
- Aliases: `run skill recent`, `run`, `skill`, `recent`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent search: `visible`.

## `zotero-bridge run skill reply`

Reply to a waiting ACP skill run

- Argv: `["run","skill","reply"]`.
- Argv bindings: `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":true,"valueNames":["MESSAGE"]}]`.
- Invocation schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"message":{"type":"string","description":"Reply message"}},"required":["skill_run_id","message"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"message":{"type":"string","description":"Reply message"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/reply"}]`.
- Aliases: `run skill reply`, `run`, `skill`, `reply`, `skill_run_id`, `SKILL_RUN_ID`, `message`, `MESSAGE`.
- Intent search: `visible`.

## `zotero-bridge run workflow recent`

List recent workflow runs

- Argv: `["run","workflow","recent"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"runs":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs"}]`.
- Aliases: `run workflow recent`, `run`, `workflow`, `recent`, `WORKFLOW`, `limit`, `LIMIT`.
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

## `zotero-bridge synthesis artifact export-filtered`

Export bounded paper artifacts into the run workspace

- Argv: `["synthesis","artifact","export-filtered"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.export_filtered"}]`.
- Aliases: `synthesis artifact export-filtered`, `synthesis`, `artifact`, `export-filtered`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis artifact manifest`

Read paper artifact manifest metadata

- Argv: `["synthesis","artifact","manifest"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.get_manifest"}]`.
- Aliases: `synthesis artifact manifest`, `synthesis`, `artifact`, `manifest`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis artifact read`

Read selected paper artifacts

- Argv: `["synthesis","artifact","read"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.read"}]`.
- Aliases: `synthesis artifact read`, `synthesis`, `artifact`, `read`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis artifact resolve-topic-digest`

Resolve a topic paper digest

- Argv: `["synthesis","artifact","resolve-topic-digest"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"paper_artifacts.resolve_topic_digest"}]`.
- Aliases: `synthesis artifact resolve-topic-digest`, `synthesis`, `artifact`, `resolve-topic-digest`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis cache invalidate`

Invalidate a constrained Synthesis cache scope

- Argv: `["synthesis","cache","invalidate"]`.
- Argv bindings: `[{"property":"scope","kind":"option","token":"--scope","takesValue":true,"required":true,"valueNames":["SCOPE"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":["scope"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `review`.
- Effects: `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/synthesis/cache/invalidate"}]`.
- Aliases: `synthesis cache invalidate`, `synthesis`, `cache`, `invalidate`, `scope`, `SCOPE`, `id`, `ID`.
- Intent search: `visible`.

## `zotero-bridge synthesis cache refresh-reference-sidecar`

Start a reference-sidecar refresh

- Argv: `["synthesis","cache","refresh-reference-sidecar"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"reference_sidecar.refresh"}]`.
- Aliases: `synthesis cache refresh-reference-sidecar`, `synthesis`, `cache`, `refresh-reference-sidecar`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis cache status`

Read Synthesis cache maintenance status

- Argv: `["synthesis","cache","status"]`.
- Argv bindings: `[{"property":"operation-id","kind":"option","token":"--operation-id","takesValue":true,"required":false,"valueNames":["OPERATION_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"operation-id":{"type":"string","description":"Persistent maintenance operation id to read; omit for general cache status"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"operation_id":{"type":"string"},"operationId":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"synthesis.operation.get"},{"kind":"endpoint","target":"GET /bridge/v1/synthesis/cache/status"}]`.
- Aliases: `synthesis cache status`, `synthesis`, `cache`, `status`, `operation_id`, `operation-id`, `OPERATION_ID`.
- Intent search: `visible`.

## `zotero-bridge synthesis concept query`

Query Synthesis Concept KB candidates

- Argv: `["synthesis","concept","query"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"concepts.query"}]`.
- Aliases: `synthesis concept query`, `synthesis`, `concept`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph get-layout`

Read persisted citation graph layout coordinates

- Argv: `["synthesis","graph","get-layout"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_layout"}]`.
- Aliases: `synthesis graph get-layout`, `synthesis`, `graph`, `get-layout`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph get-metrics`

Read citation graph metrics for selected papers

- Argv: `["synthesis","graph","get-metrics"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_metrics"}]`.
- Aliases: `synthesis graph get-metrics`, `synthesis`, `graph`, `get-metrics`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph get-slice`

Read a Synthesis citation graph slice

- Argv: `["synthesis","graph","get-slice"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_slice"}]`.
- Aliases: `synthesis graph get-slice`, `synthesis`, `graph`, `get-slice`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph overview`

Read a paged Synthesis citation graph overview

- Argv: `["synthesis","graph","overview"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"nodeCursor":{"type":["number","string"]},"node_cursor":{"type":["number","string"]},"nodeLimit":{"type":["number","string"],"minimum":1},"node_limit":{"type":["number","string"],"minimum":1},"edgeCursor":{"type":["number","string"]},"edge_cursor":{"type":["number","string"]},"edgeLimit":{"type":["number","string"],"minimum":1},"edge_limit":{"type":["number","string"],"minimum":1},"hoverNodeCursor":{"type":["number","string"]},"hover_node_cursor":{"type":["number","string"]},"hoverNodeLimit":{"type":["number","string"],"minimum":1},"hover_node_limit":{"type":["number","string"],"minimum":1},"hoverEdgeCursor":{"type":["number","string"]},"hover_edge_cursor":{"type":["number","string"]},"hoverEdgeLimit":{"type":["number","string"],"minimum":1},"hover_edge_limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.get_overview"}]`.
- Aliases: `synthesis graph overview`, `synthesis`, `graph`, `overview`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph query-cluster`

Query a topic-scoped citation graph cluster

- Argv: `["synthesis","graph","query-cluster"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"source_paper_refs":{"type":"array"},"sourcePaperRefs":{"type":"array"},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"paper_ref":{"type":"string"},"paperRef":{"type":"string"},"max_external_nodes":{"type":["number","string"],"minimum":0},"maxExternalNodes":{"type":["number","string"],"minimum":0},"max_nodes":{"type":["number","string"],"minimum":1},"maxNodes":{"type":["number","string"],"minimum":1},"max_edges":{"type":["number","string"],"minimum":0},"maxEdges":{"type":["number","string"],"minimum":0},"cluster_policy":{"type":"string"},"clusterPolicy":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.query_cluster"}]`.
- Aliases: `synthesis graph query-cluster`, `synthesis`, `graph`, `query-cluster`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph rank-external-references`

Rank external references from the citation graph

- Argv: `["synthesis","graph","rank-external-references"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.rank_external_references"}]`.
- Aliases: `synthesis graph rank-external-references`, `synthesis`, `graph`, `rank-external-references`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph rank-library-papers`

Rank library papers from citation graph metrics

- Argv: `["synthesis","graph","rank-library-papers"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.rank_library_papers"}]`.
- Aliases: `synthesis graph rank-library-papers`, `synthesis`, `graph`, `rank-library-papers`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph refresh-metrics`

Refresh persisted citation graph complex metrics

- Argv: `["synthesis","graph","refresh-metrics"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"graph-metrics-maintenance","stateChanged":true,"description":"May change graph metrics maintenance state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.refresh_metrics"}]`.
- Aliases: `synthesis graph refresh-metrics`, `synthesis`, `graph`, `refresh-metrics`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis graph update`

Start a citation graph update

- Argv: `["synthesis","graph","update"]`.
- Argv bindings: `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"expected_reference_basis_hash":{"type":"string"},"expectedReferenceBasisHash":{"type":"string"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `maintenance`; danger: `high`.
- Effects: `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"citation_graph.update"}]`.
- Aliases: `synthesis graph update`, `synthesis`, `graph`, `update`, `input`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis index library get`

Read an index page

- Argv: `["synthesis","index","library","get"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"includeTags":{"type":"boolean"},"includeCollections":{"type":"boolean"},"includeItems":{"type":"boolean"},"tagCursor":{"type":["number","string"]},"tagLimit":{"type":["number","string"],"minimum":1},"collectionCursor":{"type":["number","string"]},"collectionLimit":{"type":["number","string"],"minimum":1},"topicCursor":{"type":["number","string"]},"topicLimit":{"type":["number","string"],"minimum":1},"registryCursor":{"type":["number","string"]},"registryLimit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"library_index.get"}]`.
- Aliases: `synthesis index library get`, `synthesis`, `index`, `library`, `get`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis index reference get`

Read an index page

- Argv: `["synthesis","index","reference","get"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"reference_index.get"}]`.
- Aliases: `synthesis index reference get`, `synthesis`, `index`, `reference`, `get`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis index status`

Read Synthesis index maintenance status

- Argv: `["synthesis","index","status"]`.
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
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/synthesis/index/status"}]`.
- Aliases: `synthesis index status`, `synthesis`, `index`, `status`.
- Intent search: `visible`.

## `zotero-bridge synthesis insight attention-queue`

Read aggregate graph/artifact/reference attention items

- Argv: `["synthesis","insight","attention-queue"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"insights.get_attention_queue"}]`.
- Aliases: `synthesis insight attention-queue`, `synthesis`, `insight`, `attention-queue`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis resolver resolve`

Resolve a topic resolver into a paper set

- Argv: `["synthesis","resolver","resolve"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"tag":{"type":["string","array","object"]},"collection_key":{"type":["string","array"]},"paper_refs":{"type":"array","items":{"type":"string"}},"combine":{"enum":["union","intersection"],"default":"union"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"resolvers.resolve"}]`.
- Aliases: `synthesis resolver resolve`, `synthesis`, `resolver`, `resolve`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis schema get`

Read Synthesis Layer schema metadata

- Argv: `["synthesis","schema","get"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"schemas.get"}]`.
- Aliases: `synthesis schema get`, `synthesis`, `schema`, `get`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic find-by-paper-ref`

Find active topic synthesis topics by paper_ref

- Argv: `["synthesis","topic","find-by-paper-ref"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.find_by_paper_ref"}]`.
- Aliases: `synthesis topic find-by-paper-ref`, `synthesis`, `topic`, `find-by-paper-ref`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic get-context`

Read one topic synthesis context

- Argv: `["synthesis","topic","get-context"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"topicId":{"type":"string"},"topic_id":{"type":"string"},"view":{"type":"string","enum":["digest","semantic","audit","full"]},"mode":{"type":"string","enum":["create","update"]},"language":{"type":"string"},"updateScope":{"type":"string"},"update_scope":{"type":"string"},"updateMode":{"type":"string"},"update_mode":{"type":"string"},"updateReason":{"type":"string"},"update_reason":{"type":"string"},"includeFull":{"type":"boolean"},"include_full":{"type":"boolean"},"includeMarkdown":{"type":"boolean"},"include_markdown":{"type":"boolean"},"includeArtifact":{"type":"boolean"},"include_artifact":{"type":"boolean"},"includeManifest":{"type":"boolean"},"include_manifest":{"type":"boolean"},"outputPath":{"type":"string"},"output_path":{"type":"string"},"overwrite":{"type":"boolean"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.get_context"}]`.
- Aliases: `synthesis topic get-context`, `synthesis`, `topic`, `get-context`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic get-report`

Read one topic synthesis report markdown body

- Argv: `["synthesis","topic","get-report"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.get_report"}]`.
- Aliases: `synthesis topic get-report`, `synthesis`, `topic`, `get-report`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic get-review-input`

Read review workflow input from Synthesis

- Argv: `["synthesis","topic","get-review-input"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.get_review_input"}]`.
- Aliases: `synthesis topic get-review-input`, `synthesis`, `topic`, `get-review-input`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge synthesis topic list`

List existing topic synthesis topics

- Argv: `["synthesis","topic","list"]`.
- Argv bindings: `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"topics":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"capability","target":"topics.list"}]`.
- Aliases: `synthesis topic list`, `synthesis`, `topic`, `list`, `query`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-abandon`

Abandon an unconsumed agent run

- Argv: `["workflow","agent-abandon"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"state":{"type":"string"},"leaseExpiresAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"renewable":{"type":"boolean"},"abandonable":{"type":"boolean"},"renewedAt":{"type":"string"},"abandonedAt":{"type":"string"}},"required":["agentRunId","workflowId","state","leaseExpiresAt","retentionExpiresAt","renewable","abandonable"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"one-shot"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/abandon"}]`.
- Aliases: `workflow agent-abandon`, `workflow`, `agent-abandon`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-apply`

Apply finalized self-owned agent workflow result bundles

- Argv: `["workflow","agent-apply"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]},{"property":"result","kind":"option","token":"--result","takesValue":true,"required":true,"valueNames":["AGENT_REQUEST_ID=BUNDLE_PATH"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1},"result":{"type":"array","items":{"type":"string"},"description":"Apply-back result mapping. Repeat for multiple request bundles."}},"required":["agent_run_id","result"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"},"result":{"type":"string","description":"Apply-back result mapping. Repeat for multiple request bundles."}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"applyReceipt":{"type":"string"}},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."},{"kind":"zotero-library","stateChanged":true,"description":"May apply finalized Agent results to the Zotero library."}]`.
- Approval: `{"kind":"conditional","timing":"apply-back","scope":"Each result request is preflighted before any approval or handle consumption."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"one-shot"},{"handle":"agentRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"applyReceipt","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"Apply-back fails after preflight or may have partially written results.","stateCheck":"caller-held-handle","requiresHandles":["agentRunId"],"action":"Read the persisted per-request apply receipt before retrying any result.","nextCommand":"workflow agent-apply-status"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"}]`.
- Aliases: `workflow agent-apply`, `workflow`, `agent-apply`, `agent_run_id`, `AGENT_RUN_ID`, `results`, `result`, `AGENT_REQUEST_ID=BUNDLE_PATH`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-apply-status`

Read the auditable apply-back receipt for an agent run

- Argv: `["workflow","agent-apply-status"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"schema":{"const":"host-bridge.agent-apply-receipt.v2"},"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"status":{"type":"string"},"updatedAt":{"type":"string"},"stateChange":{"enum":["unchanged","changed","unknown"]},"handleConsumption":{"enum":["unconsumed","consumed","unknown"]},"recoverable":{"type":"boolean"},"results":{"type":"array","items":{"type":"object"}}},"required":["schema","agentRunId","status","results"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required to read persisted apply status; the read does not consume it.","lifetime":"caller-owned"},{"handle":"applyReceipt","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply"}]`.
- Aliases: `workflow agent-apply-status`, `workflow`, `agent-apply-status`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-bundle inspect`

Inspect a local agent handoff directory

- Argv: `["workflow","agent-bundle","inspect"]`.
- Argv bindings: `[{"property":"bundle","kind":"option","token":"--bundle","takesValue":true,"required":true,"valueNames":["DIR_OR_ZIP"]}]`.
- Invocation schema: `{"type":"object","properties":{"bundle":{"type":"string","description":"Agent handoff directory or ZIP"}},"required":["bundle"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"bundle":{"type":"string","description":"Agent handoff directory or ZIP"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `workflow agent-bundle inspect`, `workflow`, `agent-bundle`, `inspect`, `bundle`, `DIR_OR_ZIP`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-renew`

Renew an unconsumed agent-run lease

- Argv: `["workflow","agent-renew"]`.
- Argv bindings: `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- Invocation schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"state":{"type":"string"},"leaseExpiresAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"renewable":{"type":"boolean"},"abandonable":{"type":"boolean"},"renewedAt":{"type":"string"},"abandonedAt":{"type":"string"}},"required":["agentRunId","workflowId","state","leaseExpiresAt","retentionExpiresAt","renewable","abandonable"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/renew"}]`.
- Aliases: `workflow agent-renew`, `workflow`, `agent-renew`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-result validate`

Validate a local agent result directory against an output contract

- Argv: `["workflow","agent-result","validate"]`.
- Argv bindings: `[{"property":"contract","kind":"option","token":"--contract","takesValue":true,"required":true,"valueNames":["FILE"]},{"property":"result","kind":"option","token":"--result","takesValue":true,"required":true,"valueNames":["DIR_OR_ZIP"]}]`.
- Invocation schema: `{"type":"object","properties":{"contract":{"type":"string","description":"Authoritative output-contract JSON file"},"result":{"type":"string","description":"Agent result directory or ZIP"}},"required":["contract","result"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"contract":{"type":"string","description":"Authoritative output-contract JSON file"},"result":{"type":"string","description":"Agent result directory or ZIP"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- Aliases: `workflow agent-result validate`, `workflow`, `agent-result`, `validate`, `contract`, `FILE`, `result`, `DIR_OR_ZIP`.
- Intent search: `visible`.

## `zotero-bridge workflow agent-run`

Prepare a self-owned agent workflow handoff bundle

- Argv: `["workflow","agent-run"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"output-dir","kind":"option","token":"--output-dir","takesValue":true,"required":false,"valueNames":["DIR"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to prepare for self-owned agent execution"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Prepare a no-selection workflow"},"output-dir":{"type":"string","description":"Download the handoff zip into this directory"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to prepare for self-owned agent execution"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"output_dir":{"type":"string","description":"Download the handoff zip into this directory"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"workflowLabel":{"type":"string"},"generatedAt":{"type":"string"},"expiresAt":{"type":"string"},"requests":{"type":"array","items":{"type":"object"}},"instruction":{"type":"string"},"applyStatus":{"type":"object"},"bundle":{"type":"object"},"contents":{"type":"object"},"notes":{"type":"array","items":{"type":"string"}}},"required":["agentRunId","workflowId","expiresAt","requests","bundle"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":false,"condition":"Required only for an explicit --selection input; --none carries no itemRef.","lifetime":"caller-owned"},{"handle":"agentRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"one-shot"},{"handle":"agentRequestId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"},{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- Recovery: `[{"when":"Handoff preparation fails or its response is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the structured error; do not enter the Zotero-managed run plane.","nextCommand":"workflow describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-run"}]`.
- Aliases: `workflow agent-run`, `workflow`, `agent-run`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `output_dir`, `output-dir`, `DIR`.
- Intent search: `visible`.

## `zotero-bridge workflow describe`

Describe workflow selection and workflow options

- Argv: `["workflow","describe"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to describe"},"workflow-options":{"type":"string","description":"Draft workflow options JSON object, file path, @file, or '-' for stdin"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to describe"},"workflow_options":{"type":"string","description":"Draft workflow options JSON object, file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/describe"}]`.
- Aliases: `workflow describe`, `workflow`, `describe`, `WORKFLOW`, `workflow_options`, `workflow-options`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge workflow list`

List loaded workflows

- Argv: `["workflow","list"]`.
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
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows"}]`.
- Aliases: `workflow list`, `workflow`, `list`.
- Intent search: `visible`.

## `zotero-bridge workflow profile describe`

Describe the provider profile contract for one backend

- Argv: `["workflow","profile","describe"]`.
- Argv bindings: `[{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":true,"valueNames":["BACKEND"]}]`.
- Invocation schema: `{"type":"object","properties":{"backend":{"type":"string","description":"Configured backend id whose provider profile is described"}},"required":["backend"],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"backend":{"type":"string","description":"Configured backend id whose provider profile is described"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/provider-profiles/describe"}]`.
- Aliases: `workflow profile describe`, `workflow`, `profile`, `describe`, `backend`, `BACKEND`.
- Intent search: `visible`.

## `zotero-bridge workflow profile list`

List configured backend provider profiles

- Argv: `["workflow","profile","list"]`.
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
- Targets: `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/provider-profiles"}]`.
- Aliases: `workflow profile list`, `workflow`, `profile`, `list`.
- Intent search: `visible`.

## `zotero-bridge workflow profile validate`

Validate and normalize one backend provider profile

- Argv: `["workflow","profile","validate"]`.
- Argv bindings: `[{"property":"provider-profile","kind":"option","token":"--provider-profile","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"provider-profile":{"type":"string","description":"Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"}},"required":[],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"provider_profile":{"type":"string","description":"Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/provider-profiles/validate"}]`.
- Aliases: `workflow profile validate`, `workflow`, `profile`, `validate`, `provider_profile`, `provider-profile`, `JSON_OR_FILE`.
- Intent search: `visible`.

## `zotero-bridge workflow requirements`

Read workflow requirements

- Argv: `["workflow","requirements"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"legacy_workflow","kind":"positional","token":"LEGACY_WORKFLOW","position":1,"takesValue":true,"required":false,"valueNames":["LEGACY_WORKFLOW"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"legacy_workflow":{"type":"string","position":1}},"required":[],"allOf":[{"not":{"required":["workflow","legacy_workflow"]}},{"oneOf":[{"required":["workflow"]},{"required":["legacy_workflow"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"legacy_workflow":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/requirements"}]`.
- Aliases: `workflow requirements`, `workflow`, `requirements`, `WORKFLOW`, `legacy_workflow`, `LEGACY_WORKFLOW`.
- Intent search: `visible`.

## `zotero-bridge workflow submit`

Submit a workflow with explicit JSON input

- Argv: `["workflow","submit"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"provider-profile","kind":"option","token":"--provider-profile","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to submit"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Submit a no-selection workflow"},"workflow-options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"},"provider-profile":{"type":"string","description":"Provider profile JSON object with backendId and providerOptions"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to submit"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"workflow_options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"},"provider_profile":{"type":"string","description":"Provider profile JSON object with backendId and providerOptions"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{"workflowId":{"type":"string"},"workflowLabel":{"type":"string"},"workflowRunId":{"type":"string"},"jobIds":{"type":"array","items":{"type":"string"}},"totalJobs":{"type":"integer"},"tasks":{"type":"array","items":{"type":"object"}},"permission":{"type":"object"}},"required":["workflowId","workflowRunId","jobIds","totalJobs","tasks"],"additionalProperties":false}`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Effects: `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval: `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle transitions: `[{"handle":"itemRef","direction":"consume","required":false,"condition":"Required only for an explicit --selection input; --none carries no itemRef.","lifetime":"caller-owned"},{"handle":"workflowRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- Recovery: `[{"when":"The operation fails or completion is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/submit"}]`.
- Aliases: `workflow submit`, `workflow`, `submit`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `provider_profile`, `provider-profile`.
- Intent search: `visible`.

## `zotero-bridge workflow validate`

Validate workflow input without starting execution

- Argv: `["workflow","validate"]`.
- Argv bindings: `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- Invocation schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to validate"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Validate a no-selection workflow"},"workflow-options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema: `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to validate"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"workflow_options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Result schema: `{"type":"object","properties":{},"additionalProperties":true}`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Effects: `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval: `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle transitions: `[]`.
- Recovery: `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- Targets: `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/validate"}]`.
- Aliases: `workflow validate`, `workflow`, `validate`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`.
- Intent search: `visible`.

