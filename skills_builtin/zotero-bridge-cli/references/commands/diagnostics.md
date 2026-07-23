# Zotero Bridge CLI Diagnostic Commands

Use this generated reference for `debug` and raw `call` diagnostics after selecting the exact canonical operation.

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

