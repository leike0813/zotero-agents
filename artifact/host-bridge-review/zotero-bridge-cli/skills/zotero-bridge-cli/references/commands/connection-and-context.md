# Zotero Bridge CLI 连接与上下文命令

选择准确的规范操作后，使用此生成参考查阅 `surface`、`bridge` 或 `context` 命令。

## `zotero-bridge bridge backend list`

列出经过脱敏的 backend profile 诊断信息

- Argv： `["bridge","backend","list"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/backends"}]`.
- 别名： `bridge backend list`, `bridge`, `backend`, `list`.
- Intent 搜索： `visible`.

## `zotero-bridge bridge backend status`

读取一个经过脱敏的 backend profile 状态

- Argv： `["bridge","backend","status"]`.
- Argv 绑定： `[{"property":"backend_id","kind":"positional","token":"BACKEND_ID","position":1,"takesValue":true,"required":true,"valueNames":["BACKEND_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"backend_id":{"type":"string","description":"Backend id","position":1}},"required":["backend_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"backend_id":{"type":"string","description":"Backend id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/backends/{backendId}"}]`.
- 别名： `bridge backend status`, `bridge`, `backend`, `status`, `backend_id`, `BACKEND_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge bridge manifest`

读取经过身份验证的 Zotero Bridge 服务 manifest 信息

- Argv： `["bridge","manifest"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/manifest"}]`.
- 别名： `bridge manifest`, `bridge`, `manifest`.
- Intent 搜索： `visible`.

## `zotero-bridge bridge profile diagnose`

诊断 Zotero Bridge connection profile 就绪状态

- Argv： `["bridge","profile","diagnose"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/profile/diagnose"}]`.
- 别名： `bridge profile diagnose`, `bridge`, `profile`, `diagnose`.
- Intent 搜索： `visible`.

## `zotero-bridge bridge profile inspect`

检查经过脱敏的 Zotero Bridge connection profile

- Argv： `["bridge","profile","inspect"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/diagnostics/profile"}]`.
- 别名： `bridge profile inspect`, `bridge`, `profile`, `inspect`.
- Intent 搜索： `visible`.

## `zotero-bridge bridge status`

无需身份验证即可检查 Zotero Bridge 服务健康状态

- Argv： `["bridge","status"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/health"}]`.
- 别名： `bridge status`, `bridge`, `status`.
- Intent 搜索： `visible`.

## `zotero-bridge context collection open`

打开一个 Zotero collection

- Argv： `["context","collection","open"]`.
- Argv 绑定： `[{"property":"collection_key","kind":"positional","token":"COLLECTION_KEY","position":1,"takesValue":true,"required":true,"valueNames":["COLLECTION_KEY"]},{"property":"library-id","kind":"option","token":"--library-id","takesValue":true,"required":false,"valueNames":["LIBRARY_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"collection_key":{"type":"string","description":"Zotero collection key","position":1},"library-id":{"type":"string","description":"Zotero library id for key lookup"}},"required":["collection_key"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"collection_key":{"type":"string","description":"Zotero collection key"},"library_id":{"type":"string","description":"Zotero library id for key lookup"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `navigation`；危险级别： `review`.
- Effects： `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"collectionKey","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/context/collections/open"}]`.
- 别名： `context collection open`, `context`, `collection`, `open`, `collection_key`, `COLLECTION_KEY`, `library_id`, `library-id`, `LIBRARY_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge context current`

读取当前 Zotero UI context

- Argv： `["context","current"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"context.get_current_view"},{"kind":"endpoint","target":"GET /bridge/v1/context/current"}]`.
- 别名： `context current`, `context`, `current`.
- Intent 搜索： `visible`.

## `zotero-bridge context item open`

打开一个 Zotero item

- Argv： `["context","item","open"]`.
- Argv 绑定： `[{"property":"object_ref","kind":"positional","token":"OBJECT_REF","position":1,"takesValue":true,"required":true,"valueNames":["OBJECT_REF"]}]`.
- 调用 schema： `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object","position":1}},"required":["object_ref"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `navigation`；危险级别： `review`.
- Effects： `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"itemRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/context/items/open"}]`.
- 别名： `context item open`, `context`, `item`, `open`, `object_ref`, `OBJECT_REF`.
- Intent 搜索： `visible`.

## `zotero-bridge context note open`

打开一条 Zotero note

- Argv： `["context","note","open"]`.
- Argv 绑定： `[{"property":"object_ref","kind":"positional","token":"OBJECT_REF","position":1,"takesValue":true,"required":true,"valueNames":["OBJECT_REF"]}]`.
- 调用 schema： `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object","position":1}},"required":["object_ref"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"object_ref":{"type":"string","description":"Zotero object ref: key, numeric id, libraryId:key, or JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `navigation`；危险级别： `review`.
- Effects： `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"noteRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/context/notes/open"}]`.
- 别名： `context note open`, `context`, `note`, `open`, `object_ref`, `OBJECT_REF`.
- Intent 搜索： `visible`.

## `zotero-bridge context selection get`

读取所选 Zotero item 的摘要

- Argv： `["context","selection","get"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"itemRef":{"type":"string"}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"itemRef","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"context.get_selected_items"},{"kind":"endpoint","target":"GET /bridge/v1/context/selection"}]`.
- 别名： `context selection get`, `context`, `selection`, `get`.
- Intent 搜索： `visible`.

## `zotero-bridge context selection open`

将一个或多个 Zotero item 作为当前选中项打开

- Argv： `["context","selection","open"]`.
- Argv 绑定： `[{"property":"item_refs","kind":"positional","token":"ITEM_REFS","position":1,"takesValue":true,"required":true,"valueNames":["ITEM_REFS"]}]`.
- 调用 schema： `{"type":"object","properties":{"item_refs":{"type":"array","items":{"type":"string"},"description":"Zotero item refs","position":1}},"required":["item_refs"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"item_refs":{"type":"string","description":"Zotero item refs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `navigation`；危险级别： `review`.
- Effects： `[{"kind":"ui-navigation","stateChanged":true,"description":"May change ui navigation state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"itemRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/context/selection/open"}]`.
- 别名： `context selection open`, `context`, `selection`, `open`, `item_refs`, `ITEM_REFS`.
- Intent 搜索： `visible`.

## `zotero-bridge surface describe`

描述一条 canonical command

- Argv： `["surface","describe"]`.
- Argv 绑定： `[{"property":"command","kind":"positional","token":"COMMAND","position":1,"takesValue":true,"required":true,"valueNames":["COMMAND"]},{"property":"json","kind":"option","token":"--json","takesValue":false,"required":false,"valueNames":["JSON"]}]`.
- 调用 schema： `{"type":"object","properties":{"command":{"type":"array","items":{"type":"string"},"description":"Canonical command, for example workflow submit","position":1},"json":{"type":"boolean","description":"Emit JSON (the CLI output contract is always JSON)"}},"required":["command"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"command":{"type":"string","description":"Canonical command, for example workflow submit"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true."}]`.
- 目标： `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- 别名： `surface describe`, `surface`, `describe`, `command`, `COMMAND`, `json`, `JSON`.
- Intent 搜索： `visible`.

## `zotero-bridge surface identity`

输出精确的 CLI build 与 command catalog identity

- Argv： `["surface","identity"]`.
- Argv 绑定： `[{"property":"json","kind":"option","token":"--json","takesValue":false,"required":false,"valueNames":["JSON"]}]`.
- 调用 schema： `{"type":"object","properties":{"json":{"type":"boolean","description":"Emit JSON (the CLI output contract is always JSON)"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true."}]`.
- 目标： `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- 别名： `surface identity`, `surface`, `identity`, `json`, `JSON`.
- Intent 搜索： `visible`.

## `zotero-bridge surface search`

按 task intent 搜索 canonical command

- Argv： `["surface","search"]`.
- Argv 绑定： `[{"property":"intent","kind":"option","token":"--intent","takesValue":true,"required":true,"valueNames":["INTENT"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"include-debug","kind":"option","token":"--include-debug","takesValue":false,"required":false,"valueNames":["INCLUDE_DEBUG"]},{"property":"json","kind":"option","token":"--json","takesValue":false,"required":false,"valueNames":["JSON"]}]`.
- 调用 schema： `{"type":"object","properties":{"intent":{"type":"string","description":"Natural-language task intent"},"limit":{"type":"string","description":"Maximum number of ranked matches (1-100)"},"include-debug":{"type":"boolean","description":"Include raw and debug commands in intent recommendations"},"json":{"type":"boolean","description":"Emit JSON (the CLI output contract is always JSON)"}},"required":["intent"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"intent":{"type":"string","description":"Natural-language task intent"},"limit":{"type":"string","description":"Maximum number of ranked matches (1-100)"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true."}]`.
- 目标： `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- 别名： `surface search`, `surface`, `search`, `intent`, `INTENT`, `limit`, `LIMIT`, `include_debug`, `include-debug`, `INCLUDE_DEBUG`, `json`, `JSON`.
- Intent 搜索： `visible`.
