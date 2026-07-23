# Zotero Bridge CLI 文献库命令

选择准确的规范操作后，使用此生成参考查阅 `library` 命令。

## `zotero-bridge library annotation export`

导出一个 Zotero item 的 reader annotations

- Argv： `["library","annotation","export"]`.
- Argv 绑定： `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"format","kind":"option","token":"--format","takesValue":true,"required":false,"valueNames":["FORMAT"]}]`.
- 调用 schema： `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"},"format":{"type":"string","description":"Export format"}},"required":["item"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"},"format":{"type":"string","description":"Export format"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.export_annotations"}]`.
- 别名： `library annotation export`, `library`, `annotation`, `export`, `item`, `ITEM`, `format`, `FORMAT`.
- Intent 搜索： `visible`.

## `zotero-bridge library annotation list`

列出一个 Zotero item 的 reader annotations

- Argv： `["library","annotation","list"]`.
- Argv 绑定： `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]}]`.
- 调用 schema： `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"}},"required":["item"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"item":{"type":"string","description":"Zotero item ref: key, numeric id, libraryId:key, or JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.list_annotations"}]`.
- 别名： `library annotation list`, `library`, `annotation`, `list`, `item`, `ITEM`.
- Intent 搜索： `visible`.

## `zotero-bridge library item attachments`

列出一个 Zotero item 的子附件

- Argv： `["library","item","attachments"]`.
- Argv 绑定： `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.get_item_attachments"}]`.
- 别名： `library item attachments`, `library`, `item`, `attachments`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge library item get`

获取一个 Zotero item 的详细元数据

- Argv： `["library","item","get"]`.
- Argv 绑定： `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.get_item_detail"}]`.
- 别名： `library item get`, `library`, `item`, `get`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge library item notes`

列出一个 Zotero item 的子 note

- Argv： `["library","item","notes"]`.
- Argv 绑定： `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"cursor","kind":"option","token":"--cursor","takesValue":true,"required":false,"valueNames":["CURSOR"]},{"property":"max-excerpt-chars","kind":"option","token":"--max-excerpt-chars","takesValue":true,"required":false,"valueNames":["MAX_EXCERPT_CHARS"]}]`.
- 调用 schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"},"limit":{"type":"string","description":"Maximum note summary count"},"cursor":{"type":"string","description":"Pagination cursor"},"max-excerpt-chars":{"type":"string","description":"Maximum excerpt characters per note"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"},"limit":{"type":"string","description":"Maximum note summary count"},"cursor":{"type":"string","description":"Pagination cursor"},"max_excerpt_chars":{"type":"string","description":"Maximum excerpt characters per note"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.get_item_notes"}]`.
- 别名： `library item notes`, `library`, `item`, `notes`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `limit`, `LIMIT`, `cursor`, `CURSOR`, `max_excerpt_chars`, `max-excerpt-chars`, `MAX_EXCERPT_CHARS`.
- Intent 搜索： `visible`.

## `zotero-bridge library item search`

搜索 Zotero 文献库 item

- Argv： `["library","item","search"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Bounded search query JSON object with text, limit, and libraryId"}},"required":["query"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","minLength":1,"maxLength":500},"limit":{"type":["number","string"],"minimum":1},"libraryId":{"type":["number","string"]}},"required":["query"],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.search_items"}]`.
- 别名： `library item search`, `library`, `item`, `search`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge library items list`

列出精简的 Zotero 文献库 item 摘要

- Argv： `["library","items","list"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.list_items"}]`.
- 别名： `library items list`, `library`, `items`, `list`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge library note get`

读取一段 Zotero note 正文

- Argv： `["library","note","get"]`.
- Argv 绑定： `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]},{"property":"format","kind":"option","token":"--format","takesValue":true,"required":false,"valueNames":["FORMAT"]},{"property":"offset","kind":"option","token":"--offset","takesValue":true,"required":false,"valueNames":["OFFSET"]},{"property":"max-chars","kind":"option","token":"--max-chars","takesValue":true,"required":false,"valueNames":["MAX_CHARS"]}]`.
- 调用 schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"},"format":{"type":"string","description":"Payload format"},"offset":{"type":"string","description":"Start offset"},"max-chars":{"type":"string","description":"Maximum characters"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"},"format":{"type":"string","description":"Payload format"},"offset":{"type":"string","description":"Start offset"},"max_chars":{"type":"string","description":"Maximum characters"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.get_note_detail"}]`.
- 别名： `library note get`, `library`, `note`, `get`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `format`, `FORMAT`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.
- Intent 搜索： `visible`.

## `zotero-bridge library note payload`

从一条 Zotero note 中读取一个嵌入式 workflow payload

- Argv： `["library","note","payload"]`.
- Argv 绑定： `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]},{"property":"payload-type","kind":"option","token":"--payload-type","takesValue":true,"required":false,"valueNames":["PAYLOAD_TYPE"]},{"property":"offset","kind":"option","token":"--offset","takesValue":true,"required":false,"valueNames":["OFFSET"]},{"property":"max-chars","kind":"option","token":"--max-chars","takesValue":true,"required":false,"valueNames":["MAX_CHARS"]}]`.
- 调用 schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"},"payload-type":{"type":"string","description":"Payload type to decode"},"offset":{"type":"string","description":"Start offset"},"max-chars":{"type":"string","description":"Maximum characters"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"},"payload_type":{"type":"string","description":"Payload type to decode"},"offset":{"type":"string","description":"Start offset"},"max_chars":{"type":"string","description":"Maximum characters"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.get_note_payload"}]`.
- 别名： `library note payload`, `library`, `note`, `payload`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `payload_type`, `payload-type`, `PAYLOAD_TYPE`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.
- Intent 搜索： `visible`.

## `zotero-bridge library note payloads`

列出一条 Zotero note 中的嵌入式 workflow payload

- Argv： `["library","note","payloads"]`.
- Argv 绑定： `[{"property":"key","kind":"option","token":"--key","takesValue":true,"required":false,"valueNames":["KEY"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"allOf":[{"not":{"required":["key","id"]}},{"oneOf":[{"required":["key"]},{"required":["id"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"key":{"type":"string","description":"Zotero item key"},"id":{"type":"string","description":"Zotero item numeric id"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.list_note_payloads"}]`.
- 别名： `library note payloads`, `library`, `note`, `payloads`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge library readiness audit`

审计 PDF、源 Markdown 和 literature-analysis artifact 的就绪状态

- Argv： `["library","readiness","audit"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.readiness_audit"}]`.
- 别名： `library readiness audit`, `library`, `readiness`, `audit`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge library readiness missing-analysis`

列出缺少 literature-analysis 生成 artifact 的 Zotero item

- Argv： `["library","readiness","missing-analysis"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.readiness_audit"}]`.
- 别名： `library readiness missing-analysis`, `library`, `readiness`, `missing-analysis`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge library readiness missing-markdown`

列出缺少同名源 Markdown 的 Zotero item

- Argv： `["library","readiness","missing-markdown"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.readiness_audit"}]`.
- 别名： `library readiness missing-markdown`, `library`, `readiness`, `missing-markdown`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge library readiness missing-pdf`

列出缺少 PDF 附件的 Zotero item

- Argv： `["library","readiness","missing-pdf"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"},"checks":{},"missingOnly":{"type":["boolean","string","number"]},"missing_only":{"type":["boolean","string","number"]}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.readiness_audit"}]`.
- 别名： `library readiness missing-pdf`, `library`, `readiness`, `missing-pdf`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge library snapshot`

同步一页 Zotero 文献库元数据 snapshot

- Argv： `["library","snapshot"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"collection":{},"collectionId":{"type":["number","string"]},"collectionKey":{"type":"string"},"collectionLibraryId":{"type":["number","string"]},"tag":{"type":"string"},"itemType":{"type":"string"},"query":{"type":"string"},"limit":{"type":["number","string"],"minimum":1},"cursor":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library.sync_snapshot"}]`.
- 别名： `library snapshot`, `library`, `snapshot`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.
