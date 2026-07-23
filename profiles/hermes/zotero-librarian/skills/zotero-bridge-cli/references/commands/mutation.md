# Zotero Bridge CLI Mutation Commands

Use this generated reference for `mutation` commands after selecting the exact canonical operation.

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

