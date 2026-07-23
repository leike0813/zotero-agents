# Zotero Bridge CLI Library Commands

Use this generated reference for `library` commands after selecting the exact canonical operation.

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

