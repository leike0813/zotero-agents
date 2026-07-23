# Zotero Bridge CLI 命令参考

本参考由当前仅包含机制信息的 Agent Surface descriptor 生成，是本 Skill 的完整命令清单。当嵌入 identity 与已加载 binary 不一致时，使用 `surface describe` 确认当前可执行文件。

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

## `zotero-bridge call`

执行高级诊断用的原始 capability 调用

- Argv： `["call"]`.
- Argv 绑定： `[{"property":"capability","kind":"positional","token":"CAPABILITY","position":1,"takesValue":true,"required":true,"valueNames":["CAPABILITY"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"capability":{"type":"string","description":"Capability name, for example library.get_item_detail","position":1},"input":{"type":"string","description":"Capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":["capability"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"capability":{"type":"string","description":"Capability name, for example library.get_item_detail"},"input":{"type":"string","description":"Capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"service","target":"POST /bridge/v1/call"}]`.
- 别名： `call`, `capability`, `CAPABILITY`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

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

## `zotero-bridge debug acp-skill-run reapply-result`

对一个现有 ACP Skill run 结果重新执行 applyResult

- Argv： `["debug","acp-skill-run","reapply-result"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `review`.
- Effects： `[{"kind":"debug-repair","stateChanged":true,"description":"May change debug repair state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.acpSkillRun.reapplyResult"}]`.
- 别名： `debug acp-skill-run reapply-result`, `debug`, `acp-skill-run`, `reapply-result`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug persistence`

读取仅用于调试的持久化诊断信息

- Argv： `["debug","persistence"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.persistence.snapshot"}]`.
- 别名： `debug persistence`, `debug`, `persistence`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug status`

读取仅用于调试的 Zotero Bridge 服务运行时状态

- Argv： `["debug","status"]`.
- Argv 绑定： `[]`.
- 调用 schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.status"}]`.
- 别名： `debug status`, `debug`, `status`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis cache`

列出仅用于调试的 Synthesis sidecar cache basis 行

- Argv： `["debug","synthesis","cache"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.cache.list"}]`.
- 别名： `debug synthesis cache`, `debug`, `synthesis`, `cache`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis clean-install-reset`

危险调试操作：重置 Synthesis 安装状态

- Argv： `["debug","synthesis","clean-install-reset"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"debug-repair","stateChanged":true,"description":"May change debug repair state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.cleanInstallReset"}]`.
- 别名： `debug synthesis clean-install-reset`, `debug`, `synthesis`, `clean-install-reset`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis diff`

读取仅用于调试的 Synthesis DB/cache 差异

- Argv： `["debug","synthesis","diff"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.diff"}]`.
- 别名： `debug synthesis diff`, `debug`, `synthesis`, `diff`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis inspect-paper`

检查一篇调试用 Synthesis paper

- Argv： `["debug","synthesis","inspect-paper"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.paper.inspect"}]`.
- 别名： `debug synthesis inspect-paper`, `debug`, `synthesis`, `inspect-paper`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis inspect-topic`

检查一个调试用 Synthesis topic

- Argv： `["debug","synthesis","inspect-topic"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.topic.inspect"}]`.
- 别名： `debug synthesis inspect-topic`, `debug`, `synthesis`, `inspect-topic`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis operations`

列出仅用于调试的 Synthesis 显式操作

- Argv： `["debug","synthesis","operations"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.operations.list"}]`.
- 别名： `debug synthesis operations`, `debug`, `synthesis`, `operations`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis profiler`

列出仅用于调试的 Synthesis profiler 计时

- Argv： `["debug","synthesis","profiler"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.profiler.list"}]`.
- 别名： `debug synthesis profiler`, `debug`, `synthesis`, `profiler`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug synthesis snapshot`

读取一个仅用于调试的 Synthesis snapshot

- Argv： `["debug","synthesis","snapshot"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.synthesis.snapshot"}]`.
- 别名： `debug synthesis snapshot`, `debug`, `synthesis`, `snapshot`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge debug tasks`

读取仅用于调试的 workflow task 诊断信息

- Argv： `["debug","tasks"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Debug capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `debug`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"debug.tasks.snapshot"}]`.
- 别名： `debug tasks`, `debug`, `tasks`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `hidden`.

## `zotero-bridge file download`

下载一个已注册的 file handle

- Argv： `["file","download"]`.
- Argv 绑定： `[{"property":"file_id","kind":"positional","token":"FILE_ID","position":1,"takesValue":true,"required":true,"valueNames":["FILE_ID"]},{"property":"output","kind":"option","token":"--output","takesValue":true,"required":true,"valueNames":["PATH"]},{"property":"force","kind":"option","token":"--force","takesValue":false,"required":false,"valueNames":["FORCE"]}]`.
- 调用 schema： `{"type":"object","properties":{"file_id":{"type":"string","description":"Broker-issued opaque file id","position":1},"output":{"type":"string","description":"Output file path"},"force":{"type":"boolean","description":"Overwrite the output file if it already exists"}},"required":["file_id","output"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"file_id":{"type":"string","description":"Broker-issued opaque file id"},"output":{"type":"string","description":"Output file path"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":true}`.
- 分页： `file`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"fileId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/files/{fileId}"}]`.
- 别名： `file download`, `file`, `download`, `file_id`, `FILE_ID`, `output`, `PATH`, `force`, `FORCE`.
- Intent 搜索： `visible`.

## `zotero-bridge file upload`

通过 Zotero Bridge 上传一个本地文件并返回短期 file handle

- Argv： `["file","upload"]`.
- Argv 绑定： `[{"property":"path","kind":"positional","token":"PATH","position":1,"takesValue":true,"required":true,"valueNames":["PATH"]},{"property":"display-name","kind":"option","token":"--display-name","takesValue":true,"required":false,"valueNames":["DISPLAY_NAME"]},{"property":"content-type","kind":"option","token":"--content-type","takesValue":true,"required":false,"valueNames":["CONTENT_TYPE"]}]`.
- 调用 schema： `{"type":"object","properties":{"path":{"type":"string","description":"Local file path to upload","position":1},"display-name":{"type":"string","description":"Display name stored in the Zotero-side file descriptor"},"content-type":{"type":"string","description":"Content type for the uploaded file"}},"required":["path"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"path":{"type":"string","description":"Local file path to upload"},"display_name":{"type":"string","description":"Display name stored in the Zotero-side file descriptor"},"content_type":{"type":"string","description":"Content type for the uploaded file"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"fileId":{"type":"string"}},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"ephemeral-file","stateChanged":true,"description":"May change ephemeral file state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/files/upload"}]`.
- 别名： `file upload`, `file`, `upload`, `path`, `PATH`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.
- Intent 搜索： `visible`.

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

## `zotero-bridge mutation apply`

应用一项 Zotero mutation

- Argv： `["mutation","apply"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation apply`, `mutation`, `apply`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation collection add-items`

把 Zotero item 添加到 collection

- Argv： `["mutation","collection","add-items"]`.
- Argv 绑定： `[{"property":"collection","kind":"option","token":"--collection","takesValue":true,"required":true,"valueNames":["COLLECTION"]},{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]}]`.
- 调用 schema： `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"}},"required":["collection","items"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"string","description":"Target Zotero item refs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation collection add-items`, `mutation`, `collection`, `add-items`, `COLLECTION`, `items`, `ITEMS`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation collection create`

创建 Zotero collection

- Argv： `["mutation","collection","create"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Collection creation payload"}},"required":["input"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Collection creation payload"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation collection create`, `mutation`, `collection`, `create`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation collection remove-items`

从 collection 中移除 Zotero item

- Argv： `["mutation","collection","remove-items"]`.
- Argv 绑定： `[{"property":"collection","kind":"option","token":"--collection","takesValue":true,"required":true,"valueNames":["COLLECTION"]},{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]}]`.
- 调用 schema： `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"}},"required":["collection","items"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"collection":{"type":"string","description":"Zotero collection ref"},"items":{"type":"string","description":"Target Zotero item refs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation collection remove-items`, `mutation`, `collection`, `remove-items`, `COLLECTION`, `items`, `ITEMS`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation item attach-file`

把通过 Zotero Bridge 上传的文件附加到 Zotero item

- Argv： `["mutation","item","attach-file"]`.
- Argv 绑定： `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"file-id","kind":"option","token":"--file-id","takesValue":true,"required":true,"valueNames":["FILE_ID"]},{"property":"display-name","kind":"option","token":"--display-name","takesValue":true,"required":false,"valueNames":["DISPLAY_NAME"]},{"property":"content-type","kind":"option","token":"--content-type","takesValue":true,"required":false,"valueNames":["CONTENT_TYPE"]}]`.
- 调用 schema： `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"file-id":{"type":"string","description":"Bridge-issued uploaded file id"},"display-name":{"type":"string","description":"Attachment display name"},"content-type":{"type":"string","description":"Attachment content type"}},"required":["item","file-id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"file_id":{"type":"string","description":"Bridge-issued uploaded file id"},"display_name":{"type":"string","description":"Attachment display name"},"content_type":{"type":"string","description":"Attachment content type"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[{"handle":"itemRef","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"fileId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation item attach-file`, `mutation`, `item`, `attach-file`, `ITEM`, `file_id`, `file-id`, `FILE_ID`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation item update`

更新 Zotero item 字段

- Argv： `["mutation","item","update"]`.
- Argv 绑定： `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"patch","kind":"option","token":"--patch","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"patch":{"type":"string","description":"Field patch JSON object"}},"required":["item","patch"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"item":{"type":"string","description":"Target Zotero item ref"},"patch":{"type":"string","description":"Field patch JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation item update`, `mutation`, `item`, `update`, `ITEM`, `patch`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation literature-ingest`

把检索到的文献摄取到 Zotero

- Argv： `["mutation","literature-ingest"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin"}},"required":["input"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Literature ingest payload as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation literature-ingest`, `mutation`, `literature-ingest`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation note create`

在一个 Zotero item 下创建子 note

- Argv： `["mutation","note","create"]`.
- Argv 绑定： `[{"property":"item","kind":"option","token":"--item","takesValue":true,"required":true,"valueNames":["ITEM"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"item":{"type":"string","description":"Parent Zotero item ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":["item","input"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"item":{"type":"string","description":"Parent Zotero item ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation note create`, `mutation`, `note`, `create`, `item`, `ITEM`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation note update`

更新一条 Zotero note

- Argv： `["mutation","note","update"]`.
- Argv 绑定： `[{"property":"note","kind":"option","token":"--note","takesValue":true,"required":true,"valueNames":["NOTE"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":["note","input"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Note payload JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation note update`, `mutation`, `note`, `update`, `NOTE`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation note upsert-payload`

新增或更新一个嵌入式 note payload

- Argv： `["mutation","note","upsert-payload"]`.
- Argv 绑定： `[{"property":"note","kind":"option","token":"--note","takesValue":true,"required":true,"valueNames":["NOTE"]},{"property":"input","kind":"option","token":"--input","takesValue":true,"required":true,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Payload JSON object"}},"required":["note","input"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"note":{"type":"string","description":"Target Zotero note ref"},"input":{"type":"string","description":"Payload JSON object"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation note upsert-payload`, `mutation`, `note`, `upsert-payload`, `NOTE`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation preview`

预览一项 Zotero mutation

- Argv： `["mutation","preview"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.preview"}]`.
- 别名： `mutation preview`, `mutation`, `preview`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation tag add`

向 Zotero item 添加标签

- Argv： `["mutation","tag","add"]`.
- Argv 绑定： `[{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]},{"property":"tags","kind":"option","token":"--tags","takesValue":true,"required":true,"valueNames":["TAGS"]}]`.
- 调用 schema： `{"type":"object","properties":{"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"},"tags":{"type":"array","items":{"type":"string"},"description":"Tags to add or remove"}},"required":["items","tags"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"items":{"type":"string","description":"Target Zotero item refs"},"tags":{"type":"string","description":"Tags to add or remove"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation tag add`, `mutation`, `tag`, `add`, `items`, `ITEMS`, `tags`, `TAGS`.
- Intent 搜索： `visible`.

## `zotero-bridge mutation tag remove`

从 Zotero item 移除标签

- Argv： `["mutation","tag","remove"]`.
- Argv 绑定： `[{"property":"items","kind":"option","token":"--items","takesValue":true,"required":true,"valueNames":["ITEMS"]},{"property":"tags","kind":"option","token":"--tags","takesValue":true,"required":true,"valueNames":["TAGS"]}]`.
- 调用 schema： `{"type":"object","properties":{"items":{"type":"array","items":{"type":"string"},"description":"Target Zotero item refs"},"tags":{"type":"array","items":{"type":"string"},"description":"Tags to add or remove"}},"required":["items","tags"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"items":{"type":"string","description":"Target Zotero item refs"},"tags":{"type":"string","description":"Tags to add or remove"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"mutation.execute"}]`.
- 别名： `mutation tag remove`, `mutation`, `tag`, `remove`, `items`, `ITEMS`, `tags`, `TAGS`.
- Intent 搜索： `visible`.

## `zotero-bridge operation get`

读取一份持久化 Zotero operation receipt

- Argv： `["operation","get"]`.
- Argv 绑定： `[{"property":"operation_id","kind":"positional","token":"OPERATION_ID","position":1,"takesValue":true,"required":true,"valueNames":["OPERATION_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"operation_id":{"type":"string","description":"Operation id returned by or supplied to a state-changing command","position":1}},"required":["operation_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"operation_id":{"type":"string","description":"Operation id returned by or supplied to a state-changing command"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"schema":{"const":"host-bridge.operation-receipt.v1"},"operationId":{"type":"string"},"requestDigest":{"type":"string"},"attemptId":{"type":"string"},"method":{"type":"string"},"path":{"type":"string"},"state":{"enum":["in_progress","completed","outcome_unknown"]},"createdAt":{"type":"string"},"updatedAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"stateChange":{"enum":["unchanged","changed","unknown"]},"handleConsumption":{"enum":["unconsumed","consumed","unknown"]},"response":{"type":"object"}},"required":["schema","operationId","requestDigest","attemptId","method","path","state","createdAt","updatedAt","retentionExpiresAt","stateChange","handleConsumption"],"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"operationId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/operations/{operationId}"}]`.
- 别名： `operation get`, `operation`, `get`, `operation_id`, `OPERATION_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge product download`

下载一个或全部 Dashboard Product asset

- Argv： `["product","download"]`.
- Argv 绑定： `[{"property":"product_id","kind":"positional","token":"PRODUCT_ID","position":1,"takesValue":true,"required":true,"valueNames":["PRODUCT_ID"]},{"property":"asset","kind":"option","token":"--asset","takesValue":true,"required":false,"valueNames":["ASSET"]},{"property":"output-dir","kind":"option","token":"--output-dir","takesValue":true,"required":true,"valueNames":["DIR"]},{"property":"force","kind":"option","token":"--force","takesValue":false,"required":false,"valueNames":["FORCE"]}]`.
- 调用 schema： `{"type":"object","properties":{"product_id":{"type":"string","description":"Dashboard Product id","position":1},"asset":{"type":"string","description":"Optional asset id; omit to download all assets"},"output-dir":{"type":"string","description":"Destination directory"},"force":{"type":"boolean","description":"Allow existing output files to be replaced"}},"required":["product_id","output-dir"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"productId":{"type":"string"},"assetId":{"type":"string"},"outputDir":{"type":"string"},"overwrite":{"type":"boolean"}},"required":["productId"],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"fileId":{"type":"string"},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- 分页： `file`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"productId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"workflow_products.export"}]`.
- 别名： `product download`, `product`, `download`, `product_id`, `PRODUCT_ID`, `asset`, `ASSET`, `output_dir`, `output-dir`, `DIR`, `force`, `FORCE`.
- Intent 搜索： `visible`.

## `zotero-bridge product get`

读取一个普通 Dashboard Product

- Argv： `["product","get"]`.
- Argv 绑定： `[{"property":"product_id","kind":"positional","token":"PRODUCT_ID","position":1,"takesValue":true,"required":true,"valueNames":["PRODUCT_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"product_id":{"type":"string","description":"Dashboard Product id","position":1}},"required":["product_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"productId":{"type":"string"}},"required":["productId"],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"productId":{"type":"string"}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"productId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"productId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"workflow_products.get"}]`.
- 别名： `product get`, `product`, `get`, `product_id`, `PRODUCT_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge product list`

列出普通 Dashboard Product

- Argv： `["product","list"]`.
- Argv 绑定： `[{"property":"workflow-id","kind":"option","token":"--workflow-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_ID"]},{"property":"backend-id","kind":"option","token":"--backend-id","takesValue":true,"required":false,"valueNames":["BACKEND_ID"]},{"property":"request-id","kind":"option","token":"--request-id","takesValue":true,"required":false,"valueNames":["REQUEST_ID"]},{"property":"cursor","kind":"option","token":"--cursor","takesValue":true,"required":false,"valueNames":["CURSOR"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow-id":{"type":"string"},"backend-id":{"type":"string"},"request-id":{"type":"string"},"cursor":{"type":"string"},"limit":{"type":"string"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflowId":{"type":"string"},"backendId":{"type":"string"},"requestId":{"type":"string"},"cursor":{"type":["number","string"],"minimum":0},"limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"products":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"workflow_products.list"}]`.
- 别名： `product list`, `product`, `list`, `workflow_id`, `workflow-id`, `WORKFLOW_ID`, `backend_id`, `backend-id`, `BACKEND_ID`, `request_id`, `request-id`, `REQUEST_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge product remove`

经 Zotero approval 移除一条 Dashboard Product 记录

- Argv： `["product","remove"]`.
- Argv 绑定： `[{"property":"product_id","kind":"positional","token":"PRODUCT_ID","position":1,"takesValue":true,"required":true,"valueNames":["PRODUCT_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"product_id":{"type":"string","description":"Dashboard Product id","position":1}},"required":["product_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"productId":{"type":"string"}},"required":["productId"],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"product-store","stateChanged":true,"description":"May change product store state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[{"handle":"productId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"workflow_products.remove"}]`.
- 别名： `product remove`, `product`, `remove`, `product_id`, `PRODUCT_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run active`

列出轻量级活跃 workflow 运行时 task

- Argv： `["run","active"]`.
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
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/active"}]`.
- 别名： `run active`, `run`, `active`.
- Intent 搜索： `visible`.

## `zotero-bridge run cancel`

请求取消一个 workflow run

- Argv： `["run","cancel"]`.
- Argv 绑定： `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]},{"property":"reason","kind":"option","token":"--reason","takesValue":true,"required":false,"valueNames":["REASON"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":false,"valueNames":["MESSAGE"]}]`.
- 调用 schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"},"reason":{"type":"string","description":"Optional cancellation reason"},"message":{"type":"string","description":"Optional cancellation message"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/runs/{workflowRunId}/cancel"}]`.
- 别名： `run cancel`, `run`, `cancel`, `run_id`, `RUN_ID`, `reason`, `REASON`, `message`, `MESSAGE`.
- Intent 搜索： `visible`.

## `zotero-bridge run get`

读取一个 workflow run 状态

- Argv： `["run","get"]`.
- Argv 绑定： `[{"property":"run_id","kind":"positional","token":"RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id","position":1}},"required":["run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"run_id":{"type":"string","description":"Workflow run id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"skillRunId":{"type":"string"}},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"workflowRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"skillRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs/{workflowRunId}"}]`.
- 别名： `run get`, `run`, `get`, `run_id`, `RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run list`

列出活跃和近期 workflow 运行时 task

- Argv： `["run","list"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"backend-type","kind":"option","token":"--backend-type","takesValue":true,"required":false,"valueNames":["BACKEND_TYPE"]},{"property":"request","kind":"option","token":"--request","takesValue":true,"required":false,"valueNames":["REQUEST"]},{"property":"run","kind":"option","token":"--run","takesValue":true,"required":false,"valueNames":["RUN"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"active-only","kind":"option","token":"--active-only","takesValue":false,"required":false,"valueNames":["ACTIVE_ONLY"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend-type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"},"active-only":{"type":"boolean","description":"Only return active task runtime rows"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"backend_type":{"type":"string","description":"Filter by backend type"},"request":{"type":"string","description":"Filter by provider request id"},"run":{"type":"string","description":"Filter by workflow run id"},"state":{"type":"string","description":"Filter by task state"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/tasks"}]`.
- 别名： `run list`, `run`, `list`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `request`, `REQUEST`, `RUN`, `state`, `STATE`, `active_only`, `active-only`, `ACTIVE_ONLY`.
- Intent 搜索： `visible`.

## `zotero-bridge run notification ack`

确认 workflow 通知收件箱事件

- Argv： `["run","notification","ack"]`.
- Argv 绑定： `[{"property":"event","kind":"option","token":"--event","takesValue":true,"required":true,"valueNames":["EVENTS"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"event":{"type":"array","items":{"type":"string"},"description":"Notification event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":["event"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"event":{"type":"string","description":"Notification event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"eventId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/notifications/ack"}]`.
- 别名： `run notification ack`, `run`, `notification`, `ack`, `events`, `event`, `EVENTS`, `client_id`, `client-id`, `CLIENT_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run notification list`

列出 workflow 通知收件箱事件

- Argv： `["run","notification","list"]`.
- Argv 绑定： `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- 别名： `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run notification wait`

轮询直至 workflow 通知可用

- Argv： `["run","notification","wait"]`.
- Argv 绑定： `[{"property":"workflow-run-id","kind":"option","token":"--workflow-run-id","takesValue":true,"required":false,"valueNames":["WORKFLOW_RUN_ID"]},{"property":"skill-run-id","kind":"option","token":"--skill-run-id","takesValue":true,"required":false,"valueNames":["SKILL_RUN_ID"]},{"property":"type","kind":"option","token":"--type","takesValue":true,"required":false,"valueNames":["EVENT_TYPE"]},{"property":"since-event-id","kind":"option","token":"--since-event-id","takesValue":true,"required":false,"valueNames":["SINCE_EVENT_ID"]},{"property":"client-id","kind":"option","token":"--client-id","takesValue":true,"required":false,"valueNames":["CLIENT_ID"]},{"property":"acknowledged","kind":"option","token":"--acknowledged","takesValue":true,"required":false,"valueNames":["ACKNOWLEDGED"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]},{"property":"timeout-ms","kind":"option","token":"--timeout-ms","takesValue":true,"required":false,"valueNames":["TIMEOUT_MS"]},{"property":"interval-ms","kind":"option","token":"--interval-ms","takesValue":true,"required":false,"valueNames":["INTERVAL_MS"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow-run-id":{"type":"string","description":"Filter by workflow run id"},"skill-run-id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since-event-id":{"type":"string","description":"Return events after this event id"},"client-id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout-ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval-ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow_run_id":{"type":"string","description":"Filter by workflow run id"},"skill_run_id":{"type":"string","description":"Filter by concrete skill run id"},"type":{"type":"string","description":"Filter by notification type"},"since_event_id":{"type":"string","description":"Return events after this event id"},"client_id":{"type":"string","description":"Best-effort Zotero notification client id"},"acknowledged":{"type":"string","description":"Filter by acknowledgement state"},"limit":{"type":"string","description":"Maximum number of events to return"},"timeout_ms":{"type":"string","description":"Maximum wait time in milliseconds"},"interval_ms":{"type":"string","description":"Polling interval in milliseconds"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"notifications":{"type":"array","items":{"type":"object"}},"nextSinceEventId":{"type":["string","null"]},"returned":{"type":"integer"},"hasMore":{"type":"boolean"},"truncated":{"type":"boolean"}},"required":["notifications","returned","hasMore","truncated"],"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/notifications"}]`.
- 别名： `run notification wait`, `run`, `notification`, `wait`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`, `timeout_ms`, `timeout-ms`, `TIMEOUT_MS`, `interval_ms`, `interval-ms`, `INTERVAL_MS`.
- Intent 搜索： `visible`.

## `zotero-bridge run permission get`

读取一个 Zotero 端 permission request

- Argv： `["run","permission","get"]`.
- Argv 绑定： `[{"property":"permission_request_id","kind":"positional","token":"PERMISSION_REQUEST_ID","position":1,"takesValue":true,"required":true,"valueNames":["PERMISSION_REQUEST_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id","position":1}},"required":["permission_request_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"permission_request_id":{"type":"string","description":"Permission request id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"permissionRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/{permissionRequestId}"}]`.
- 别名： `run permission get`, `run`, `permission`, `get`, `permission_request_id`, `PERMISSION_REQUEST_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run permission pending`

列出待处理的 Zotero 端 permission request

- Argv： `["run","permission","pending"]`.
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
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/permissions/pending"}]`.
- 别名： `run permission pending`, `run`, `permission`, `pending`.
- Intent 搜索： `visible`.

## `zotero-bridge run recent`

列出轻量级近期 workflow 运行时 task

- Argv： `["run","recent"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":false,"valueNames":["BACKEND"]},{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Filter by workflow id"},"backend":{"type":"string","description":"Filter by backend id"},"state":{"type":"string","description":"Filter by task state"},"limit":{"type":"string","description":"Maximum number of tasks"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/tasks/recent"}]`.
- 别名： `run recent`, `run`, `recent`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill connect`

连接一个可恢复的 ACP Skill run

- Argv： `["run","skill","connect"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/connect"}]`.
- 别名： `run skill connect`, `run`, `skill`, `connect`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill events`

列出一个 Skill run 的轻量级生命周期事件

- Argv： `["run","skill","events"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"since-updated-at","kind":"option","token":"--since-updated-at","takesValue":true,"required":false,"valueNames":["SINCE_UPDATED_AT"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"since-updated-at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"since_updated_at":{"type":"string","description":"Return events after this updatedAt timestamp"},"limit":{"type":"string","description":"Maximum number of events"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"events":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}/events"}]`.
- 别名： `run skill events`, `run`, `skill`, `events`, `skill_run_id`, `SKILL_RUN_ID`, `since_updated_at`, `since-updated-at`, `SINCE_UPDATED_AT`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill get`

读取一个具体 Skill run

- Argv： `["run","skill","get"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1}},"required":["skill_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/{skillRunId}"}]`.
- 别名： `run skill get`, `run`, `skill`, `get`, `skill_run_id`, `SKILL_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill recent`

列出近期具体 Skill run

- Argv： `["run","skill","recent"]`.
- Argv 绑定： `[{"property":"state","kind":"option","token":"--state","takesValue":true,"required":false,"valueNames":["STATE"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"state":{"type":"string","description":"Filter by skill run state"},"limit":{"type":"string","description":"Maximum number of skill runs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"skillRuns":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/skill-runs/recent"}]`.
- 别名： `run skill recent`, `run`, `skill`, `recent`, `state`, `STATE`, `limit`, `LIMIT`.
- Intent 搜索： `visible`.

## `zotero-bridge run skill reply`

回复一个等待中的 ACP Skill run

- Argv： `["run","skill","reply"]`.
- Argv 绑定： `[{"property":"skill_run_id","kind":"positional","token":"SKILL_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["SKILL_RUN_ID"]},{"property":"message","kind":"option","token":"--message","takesValue":true,"required":true,"valueNames":["MESSAGE"]}]`.
- 调用 schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id","position":1},"message":{"type":"string","description":"Reply message"}},"required":["skill_run_id","message"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"skill_run_id":{"type":"string","description":"Opaque skill run id"},"message":{"type":"string","description":"Reply message"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"skillRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/skill-runs/{skillRunId}/reply"}]`.
- 别名： `run skill reply`, `run`, `skill`, `reply`, `skill_run_id`, `SKILL_RUN_ID`, `message`, `MESSAGE`.
- Intent 搜索： `visible`.

## `zotero-bridge run workflow recent`

列出近期 workflow run

- Argv： `["run","workflow","recent"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"limit","kind":"option","token":"--limit","takesValue":true,"required":false,"valueNames":["LIMIT"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"limit":{"type":"string","description":"Maximum number of runs"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"runs":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":true}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/runs"}]`.
- 别名： `run workflow recent`, `run`, `workflow`, `recent`, `WORKFLOW`, `limit`, `LIMIT`.
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

## `zotero-bridge synthesis artifact export-filtered`

把有界 paper artifact 导出到 run workspace

- Argv： `["synthesis","artifact","export-filtered"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- 分页： `file`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.export_filtered"}]`.
- 别名： `synthesis artifact export-filtered`, `synthesis`, `artifact`, `export-filtered`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis artifact manifest`

读取 paper artifact manifest 元数据

- Argv： `["synthesis","artifact","manifest"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.get_manifest"}]`.
- 别名： `synthesis artifact manifest`, `synthesis`, `artifact`, `manifest`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis artifact read`

读取选定的 paper artifact

- Argv： `["synthesis","artifact","read"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.read"}]`.
- 别名： `synthesis artifact read`, `synthesis`, `artifact`, `read`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis artifact resolve-topic-digest`

解析 topic paper digest

- Argv： `["synthesis","artifact","resolve-topic-digest"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"paper_artifacts.resolve_topic_digest"}]`.
- 别名： `synthesis artifact resolve-topic-digest`, `synthesis`, `artifact`, `resolve-topic-digest`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis cache invalidate`

使受限的 Synthesis cache scope 失效

- Argv： `["synthesis","cache","invalidate"]`.
- Argv 绑定： `[{"property":"scope","kind":"option","token":"--scope","takesValue":true,"required":true,"valueNames":["SCOPE"]},{"property":"id","kind":"option","token":"--id","takesValue":true,"required":false,"valueNames":["ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":["scope"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"scope":{"type":"string","description":"Cache scope"},"id":{"type":"string","description":"Optional opaque target id"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `review`.
- Effects： `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/synthesis/cache/invalidate"}]`.
- 别名： `synthesis cache invalidate`, `synthesis`, `cache`, `invalidate`, `scope`, `SCOPE`, `id`, `ID`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis cache refresh-reference-sidecar`

启动 reference sidecar 刷新

- Argv： `["synthesis","cache","refresh-reference-sidecar"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"cache-maintenance","stateChanged":true,"description":"May change cache maintenance state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"reference_sidecar.refresh"}]`.
- 别名： `synthesis cache refresh-reference-sidecar`, `synthesis`, `cache`, `refresh-reference-sidecar`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis cache status`

读取 Synthesis cache 维护状态

- Argv： `["synthesis","cache","status"]`.
- Argv 绑定： `[{"property":"operation-id","kind":"option","token":"--operation-id","takesValue":true,"required":false,"valueNames":["OPERATION_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"operation-id":{"type":"string","description":"Persistent maintenance operation id to read; omit for general cache status"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"operation_id":{"type":"string"},"operationId":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"synthesis.operation.get"},{"kind":"endpoint","target":"GET /bridge/v1/synthesis/cache/status"}]`.
- 别名： `synthesis cache status`, `synthesis`, `cache`, `status`, `operation_id`, `operation-id`, `OPERATION_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis concept query`

查询 Synthesis Concept KB 候选项

- Argv： `["synthesis","concept","query"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"concepts.query"}]`.
- 别名： `synthesis concept query`, `synthesis`, `concept`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph get-layout`

读取已持久化的 citation graph 布局坐标

- Argv： `["synthesis","graph","get-layout"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_layout"}]`.
- 别名： `synthesis graph get-layout`, `synthesis`, `graph`, `get-layout`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph get-metrics`

读取选定 paper 的 citation graph 指标

- Argv： `["synthesis","graph","get-metrics"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_metrics"}]`.
- 别名： `synthesis graph get-metrics`, `synthesis`, `graph`, `get-metrics`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph get-slice`

读取一个 Synthesis citation graph slice

- Argv： `["synthesis","graph","get-slice"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_slice"}]`.
- 别名： `synthesis graph get-slice`, `synthesis`, `graph`, `get-slice`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph overview`

读取分页的 Synthesis citation graph 概览

- Argv： `["synthesis","graph","overview"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"nodeCursor":{"type":["number","string"]},"node_cursor":{"type":["number","string"]},"nodeLimit":{"type":["number","string"],"minimum":1},"node_limit":{"type":["number","string"],"minimum":1},"edgeCursor":{"type":["number","string"]},"edge_cursor":{"type":["number","string"]},"edgeLimit":{"type":["number","string"],"minimum":1},"edge_limit":{"type":["number","string"],"minimum":1},"hoverNodeCursor":{"type":["number","string"]},"hover_node_cursor":{"type":["number","string"]},"hoverNodeLimit":{"type":["number","string"],"minimum":1},"hover_node_limit":{"type":["number","string"],"minimum":1},"hoverEdgeCursor":{"type":["number","string"]},"hover_edge_cursor":{"type":["number","string"]},"hoverEdgeLimit":{"type":["number","string"],"minimum":1},"hover_edge_limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.get_overview"}]`.
- 别名： `synthesis graph overview`, `synthesis`, `graph`, `overview`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph query-cluster`

查询 topic 范围内的 citation graph cluster

- Argv： `["synthesis","graph","query-cluster"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"source_paper_refs":{"type":"array"},"sourcePaperRefs":{"type":"array"},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"paper_ref":{"type":"string"},"paperRef":{"type":"string"},"max_external_nodes":{"type":["number","string"],"minimum":0},"maxExternalNodes":{"type":["number","string"],"minimum":0},"max_nodes":{"type":["number","string"],"minimum":1},"maxNodes":{"type":["number","string"],"minimum":1},"max_edges":{"type":["number","string"],"minimum":0},"maxEdges":{"type":["number","string"],"minimum":0},"cluster_policy":{"type":"string"},"clusterPolicy":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.query_cluster"}]`.
- 别名： `synthesis graph query-cluster`, `synthesis`, `graph`, `query-cluster`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph rank-external-references`

根据 citation graph 对外部参考文献排序

- Argv： `["synthesis","graph","rank-external-references"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.rank_external_references"}]`.
- 别名： `synthesis graph rank-external-references`, `synthesis`, `graph`, `rank-external-references`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph rank-library-papers`

根据 citation graph 指标对文献库 paper 排序

- Argv： `["synthesis","graph","rank-library-papers"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"paperRefs":{"type":"array"},"paper_refs":{"type":"array"},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"sortBy":{"type":"string"},"sort_by":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"graph":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.rank_library_papers"}]`.
- 别名： `synthesis graph rank-library-papers`, `synthesis`, `graph`, `rank-library-papers`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph refresh-metrics`

刷新已持久化的 citation graph 复杂指标

- Argv： `["synthesis","graph","refresh-metrics"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"graph-metrics-maintenance","stateChanged":true,"description":"May change graph metrics maintenance state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.refresh_metrics"}]`.
- 别名： `synthesis graph refresh-metrics`, `synthesis`, `graph`, `refresh-metrics`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis graph update`

启动 citation graph 更新

- Argv： `["synthesis","graph","update"]`.
- Argv 绑定： `[{"property":"input","kind":"option","token":"--input","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"input":{"type":"string","description":"Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"scope":{"type":"string","enum":["library","papers"]},"library_id":{"type":["number","string"]},"libraryId":{"type":["number","string"]},"paper_refs":{"type":"array"},"paperRefs":{"type":"array"},"expected_reference_basis_hash":{"type":"string"},"expectedReferenceBasisHash":{"type":"string"},"idempotency_key":{"type":"string"},"idempotencyKey":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `maintenance`；危险级别： `high`.
- Effects： `[{"kind":"zotero-library","stateChanged":true,"description":"May change zotero library state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"citation_graph.update"}]`.
- 别名： `synthesis graph update`, `synthesis`, `graph`, `update`, `input`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis index library get`

读取一页 index

- Argv： `["synthesis","index","library","get"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"libraryId":{"type":["number","string"]},"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1},"includeTags":{"type":"boolean"},"includeCollections":{"type":"boolean"},"includeItems":{"type":"boolean"},"tagCursor":{"type":["number","string"]},"tagLimit":{"type":["number","string"],"minimum":1},"collectionCursor":{"type":["number","string"]},"collectionLimit":{"type":["number","string"],"minimum":1},"topicCursor":{"type":["number","string"]},"topicLimit":{"type":["number","string"],"minimum":1},"registryCursor":{"type":["number","string"]},"registryLimit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"library_index.get"}]`.
- 别名： `synthesis index library get`, `synthesis`, `index`, `library`, `get`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis index reference get`

读取一页 index

- Argv： `["synthesis","index","reference","get"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"entries":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"reference_index.get"}]`.
- 别名： `synthesis index reference get`, `synthesis`, `index`, `reference`, `get`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis index status`

读取 Synthesis index 维护状态

- Argv： `["synthesis","index","status"]`.
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
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/synthesis/index/status"}]`.
- 别名： `synthesis index status`, `synthesis`, `index`, `status`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis insight attention-queue`

读取聚合的 graph/artifact/reference 待关注项

- Argv： `["synthesis","insight","attention-queue"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"insights.get_attention_queue"}]`.
- 别名： `synthesis insight attention-queue`, `synthesis`, `insight`, `attention-queue`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis resolver resolve`

通过 topic resolver 解析出 paper 集合

- Argv： `["synthesis","resolver","resolve"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"tag":{"type":["string","array","object"]},"collection_key":{"type":["string","array"]},"paper_refs":{"type":"array","items":{"type":"string"}},"combine":{"enum":["union","intersection"],"default":"union"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"items":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"resolvers.resolve"}]`.
- 别名： `synthesis resolver resolve`, `synthesis`, `resolver`, `resolve`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis schema get`

读取 Synthesis Layer schema 元数据

- Argv： `["synthesis","schema","get"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"schemas.get"}]`.
- 别名： `synthesis schema get`, `synthesis`, `schema`, `get`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic find-by-paper-ref`

按 paper_ref 查找活跃的 topic synthesis topic

- Argv： `["synthesis","topic","find-by-paper-ref"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.find_by_paper_ref"}]`.
- 别名： `synthesis topic find-by-paper-ref`, `synthesis`, `topic`, `find-by-paper-ref`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic get-context`

读取一个 topic synthesis context

- Argv： `["synthesis","topic","get-context"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"topicId":{"type":"string"},"topic_id":{"type":"string"},"view":{"type":"string","enum":["digest","semantic","audit","full"]},"mode":{"type":"string","enum":["create","update"]},"language":{"type":"string"},"updateScope":{"type":"string"},"update_scope":{"type":"string"},"updateMode":{"type":"string"},"update_mode":{"type":"string"},"updateReason":{"type":"string"},"update_reason":{"type":"string"},"includeFull":{"type":"boolean"},"include_full":{"type":"boolean"},"includeMarkdown":{"type":"boolean"},"include_markdown":{"type":"boolean"},"includeArtifact":{"type":"boolean"},"include_artifact":{"type":"boolean"},"includeManifest":{"type":"boolean"},"include_manifest":{"type":"boolean"},"outputPath":{"type":"string"},"output_path":{"type":"string"},"overwrite":{"type":"boolean"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"file":{"type":"object","properties":{"fileId":{"type":"string"},"path":{"type":"string"},"checksum":{"type":"string"},"bytes":{"type":"integer"}},"additionalProperties":true},"delivery":{"type":"object","description":"Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.","properties":{"mode":{"enum":["local","bridge-download","bundle"]},"path":{"type":"string"},"files":{"type":"array","items":{"type":"object"}},"bundle":{"type":"object","properties":{"fileId":{"type":"string"},"displayName":{"type":"string"},"contentType":{"type":"string"},"size":{"type":"integer"}},"additionalProperties":true},"downloadCommand":{"type":"string"},"unpackHint":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}`.
- 分页： `file`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.get_context"}]`.
- 别名： `synthesis topic get-context`, `synthesis`, `topic`, `get-context`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic get-report`

读取一份 topic synthesis report 的 Markdown 正文

- Argv： `["synthesis","topic","get-report"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.get_report"}]`.
- 别名： `synthesis topic get-report`, `synthesis`, `topic`, `get-report`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic get-review-input`

从 Synthesis 读取 review workflow input

- Argv： `["synthesis","topic","get-review-input"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."}},"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.get_review_input"}]`.
- 别名： `synthesis topic get-review-input`, `synthesis`, `topic`, `get-review-input`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge synthesis topic list`

列出现有 topic synthesis topic

- Argv： `["synthesis","topic","list"]`.
- Argv 绑定： `[{"property":"query","kind":"option","token":"--query","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"query":{"type":"string","description":"Read query as inline JSON, a file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"cursor":{"type":["number","string"]},"limit":{"type":["number","string"],"minimum":1}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"capability":{"type":"string"},"approval":{"type":"object"},"data":{"description":"Capability-owned result data. A command-specific output contract may narrow this object in a later surface revision."},"topics":{"type":"array"},"nextCursor":{"type":["string","number","null"]},"hasMore":{"type":"boolean"}},"additionalProperties":false}`.
- 分页： `cursor`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"capability","target":"topics.list"}]`.
- 别名： `synthesis topic list`, `synthesis`, `topic`, `list`, `query`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-abandon`

放弃一个尚未消费的 agent run

- Argv： `["workflow","agent-abandon"]`.
- Argv 绑定： `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"state":{"type":"string"},"leaseExpiresAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"renewable":{"type":"boolean"},"abandonable":{"type":"boolean"},"renewedAt":{"type":"string"},"abandonedAt":{"type":"string"}},"required":["agentRunId","workflowId","state","leaseExpiresAt","retentionExpiresAt","renewable","abandonable"],"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"one-shot"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/abandon"}]`.
- 别名： `workflow agent-abandon`, `workflow`, `agent-abandon`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-apply`

应用已定稿的 agent 自有 workflow result bundle

- Argv： `["workflow","agent-apply"]`.
- Argv 绑定： `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]},{"property":"result","kind":"option","token":"--result","takesValue":true,"required":true,"valueNames":["AGENT_REQUEST_ID=BUNDLE_PATH"]}]`.
- 调用 schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1},"result":{"type":"array","items":{"type":"string"},"description":"Apply-back result mapping. Repeat for multiple request bundles."}},"required":["agent_run_id","result"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"},"result":{"type":"string","description":"Apply-back result mapping. Repeat for multiple request bundles."}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"applyReceipt":{"type":"string"}},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."},{"kind":"zotero-library","stateChanged":true,"description":"May apply finalized Agent results to the Zotero library."}]`.
- Approval： `{"kind":"conditional","timing":"apply-back","scope":"Each result request is preflighted before any approval or handle consumption."}`.
- Handle 转移： `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"one-shot"},{"handle":"agentRequestId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"},{"handle":"applyReceipt","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"Apply-back fails after preflight or may have partially written results.","stateCheck":"caller-held-handle","requiresHandles":["agentRunId"],"action":"Read the persisted per-request apply receipt before retrying any result.","nextCommand":"workflow agent-apply-status"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"}]`.
- 别名： `workflow agent-apply`, `workflow`, `agent-apply`, `agent_run_id`, `AGENT_RUN_ID`, `results`, `result`, `AGENT_REQUEST_ID=BUNDLE_PATH`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-apply-status`

读取一个 agent run 的可审计 apply-back receipt

- Argv： `["workflow","agent-apply-status"]`.
- Argv 绑定： `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"schema":{"const":"host-bridge.agent-apply-receipt.v2"},"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"status":{"type":"string"},"updatedAt":{"type":"string"},"stateChange":{"enum":["unchanged","changed","unknown"]},"handleConsumption":{"enum":["unconsumed","consumed","unknown"]},"recoverable":{"type":"boolean"},"results":{"type":"array","items":{"type":"object"}}},"required":["schema","agentRunId","status","results"],"additionalProperties":false}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required to read persisted apply status; the read does not consume it.","lifetime":"caller-owned"},{"handle":"applyReceipt","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/agent-runs/{agentRunId}/apply"}]`.
- 别名： `workflow agent-apply-status`, `workflow`, `agent-apply-status`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-bundle inspect`

检查本地 agent handoff 目录

- Argv： `["workflow","agent-bundle","inspect"]`.
- Argv 绑定： `[{"property":"bundle","kind":"option","token":"--bundle","takesValue":true,"required":true,"valueNames":["DIR_OR_ZIP"]}]`.
- 调用 schema： `{"type":"object","properties":{"bundle":{"type":"string","description":"Agent handoff directory or ZIP"}},"required":["bundle"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"bundle":{"type":"string","description":"Agent handoff directory or ZIP"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- 别名： `workflow agent-bundle inspect`, `workflow`, `agent-bundle`, `inspect`, `bundle`, `DIR_OR_ZIP`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-renew`

续期尚未消费的 agent-run lease

- Argv： `["workflow","agent-renew"]`.
- Argv 绑定： `[{"property":"agent_run_id","kind":"positional","token":"AGENT_RUN_ID","position":1,"takesValue":true,"required":true,"valueNames":["AGENT_RUN_ID"]}]`.
- 调用 schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run","position":1}},"required":["agent_run_id"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"agent_run_id":{"type":"string","description":"Agent run id returned by workflow agent-run"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"state":{"type":"string"},"leaseExpiresAt":{"type":"string"},"retentionExpiresAt":{"type":"string"},"renewable":{"type":"boolean"},"abandonable":{"type":"boolean"},"renewedAt":{"type":"string"},"abandonedAt":{"type":"string"}},"required":["agentRunId","workflowId","state","leaseExpiresAt","retentionExpiresAt","renewable","abandonable"],"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"agentRunId","direction":"consume","required":true,"condition":"Required by the command invocation.","lifetime":"caller-owned"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"none","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-runs/{agentRunId}/renew"}]`.
- 别名： `workflow agent-renew`, `workflow`, `agent-renew`, `agent_run_id`, `AGENT_RUN_ID`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-result validate`

依据 output contract 校验本地 agent result 目录

- Argv： `["workflow","agent-result","validate"]`.
- Argv 绑定： `[{"property":"contract","kind":"option","token":"--contract","takesValue":true,"required":true,"valueNames":["FILE"]},{"property":"result","kind":"option","token":"--result","takesValue":true,"required":true,"valueNames":["DIR_OR_ZIP"]}]`.
- 调用 schema： `{"type":"object","properties":{"contract":{"type":"string","description":"Authoritative output-contract JSON file"},"result":{"type":"string","description":"Agent result directory or ZIP"}},"required":["contract","result"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"contract":{"type":"string","description":"Authoritative output-contract JSON file"},"result":{"type":"string","description":"Agent result directory or ZIP"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"service","target":"embedded host-bridge.agent-surface.v4"}]`.
- 别名： `workflow agent-result validate`, `workflow`, `agent-result`, `validate`, `contract`, `FILE`, `result`, `DIR_OR_ZIP`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow agent-run`

准备 agent 自有的 workflow handoff bundle

- Argv： `["workflow","agent-run"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"output-dir","kind":"option","token":"--output-dir","takesValue":true,"required":false,"valueNames":["DIR"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to prepare for self-owned agent execution"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Prepare a no-selection workflow"},"output-dir":{"type":"string","description":"Download the handoff zip into this directory"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to prepare for self-owned agent execution"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"output_dir":{"type":"string","description":"Download the handoff zip into this directory"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"agentRunId":{"type":"string"},"workflowId":{"type":"string"},"workflowLabel":{"type":"string"},"generatedAt":{"type":"string"},"expiresAt":{"type":"string"},"requests":{"type":"array","items":{"type":"object"}},"instruction":{"type":"string"},"applyStatus":{"type":"object"},"bundle":{"type":"object"},"contents":{"type":"object"},"notes":{"type":"array","items":{"type":"string"}}},"required":["agentRunId","workflowId","expiresAt","requests","bundle"],"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[{"handle":"itemRef","direction":"consume","required":false,"condition":"Required only for an explicit --selection input; --none carries no itemRef.","lifetime":"caller-owned"},{"handle":"agentRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"one-shot"},{"handle":"agentRequestId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"},{"handle":"fileId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"short-lived"}]`.
- 恢复： `[{"when":"Handoff preparation fails or its response is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect the structured error; do not enter the Zotero-managed run plane.","nextCommand":"workflow describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/agent-run"}]`.
- 别名： `workflow agent-run`, `workflow`, `agent-run`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `output_dir`, `output-dir`, `DIR`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow describe`

描述 workflow selection 和 workflow options

- Argv： `["workflow","describe"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to describe"},"workflow-options":{"type":"string","description":"Draft workflow options JSON object, file path, @file, or '-' for stdin"}},"required":["workflow"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to describe"},"workflow_options":{"type":"string","description":"Draft workflow options JSON object, file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/describe"}]`.
- 别名： `workflow describe`, `workflow`, `describe`, `WORKFLOW`, `workflow_options`, `workflow-options`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow list`

列出已加载的 workflow

- Argv： `["workflow","list"]`.
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
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows"}]`.
- 别名： `workflow list`, `workflow`, `list`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow profile describe`

描述一个 backend 的 provider profile contract

- Argv： `["workflow","profile","describe"]`.
- Argv 绑定： `[{"property":"backend","kind":"option","token":"--backend","takesValue":true,"required":true,"valueNames":["BACKEND"]}]`.
- 调用 schema： `{"type":"object","properties":{"backend":{"type":"string","description":"Configured backend id whose provider profile is described"}},"required":["backend"],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"backend":{"type":"string","description":"Configured backend id whose provider profile is described"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/provider-profiles/describe"}]`.
- 别名： `workflow profile describe`, `workflow`, `profile`, `describe`, `backend`, `BACKEND`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow profile list`

列出已配置的 backend provider profile

- Argv： `["workflow","profile","list"]`.
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
- 目标： `[{"kind":"endpoint","target":"GET /bridge/v1/workflows/provider-profiles"}]`.
- 别名： `workflow profile list`, `workflow`, `profile`, `list`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow profile validate`

校验并规范化一个 backend provider profile

- Argv： `["workflow","profile","validate"]`.
- Argv 绑定： `[{"property":"provider-profile","kind":"option","token":"--provider-profile","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"provider-profile":{"type":"string","description":"Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"}},"required":[],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"provider_profile":{"type":"string","description":"Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/provider-profiles/validate"}]`.
- 别名： `workflow profile validate`, `workflow`, `profile`, `validate`, `provider_profile`, `provider-profile`, `JSON_OR_FILE`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow requirements`

读取 workflow requirements

- Argv： `["workflow","requirements"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":false,"valueNames":["WORKFLOW"]},{"property":"legacy_workflow","kind":"positional","token":"LEGACY_WORKFLOW","position":1,"takesValue":true,"required":false,"valueNames":["LEGACY_WORKFLOW"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"legacy_workflow":{"type":"string","position":1}},"required":[],"allOf":[{"not":{"required":["workflow","legacy_workflow"]}},{"oneOf":[{"required":["workflow"]},{"required":["legacy_workflow"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id"},"legacy_workflow":{"type":"string"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/requirements"}]`.
- 别名： `workflow requirements`, `workflow`, `requirements`, `WORKFLOW`, `legacy_workflow`, `LEGACY_WORKFLOW`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow submit`

使用显式 JSON input 提交 workflow

- Argv： `["workflow","submit"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"provider-profile","kind":"option","token":"--provider-profile","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to submit"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Submit a no-selection workflow"},"workflow-options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"},"provider-profile":{"type":"string","description":"Provider profile JSON object with backendId and providerOptions"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to submit"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"workflow_options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"},"provider_profile":{"type":"string","description":"Provider profile JSON object with backendId and providerOptions"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{"workflowId":{"type":"string"},"workflowLabel":{"type":"string"},"workflowRunId":{"type":"string"},"jobIds":{"type":"array","items":{"type":"string"}},"totalJobs":{"type":"integer"},"tasks":{"type":"array","items":{"type":"object"}},"permission":{"type":"object"}},"required":["workflowId","workflowRunId","jobIds","totalJobs","tasks"],"additionalProperties":false}`.
- 分页： `none`.
- 类别： `write`；危险级别： `review`.
- Effects： `[{"kind":"workflow-control","stateChanged":true,"description":"May change workflow control state."}]`.
- Approval： `{"kind":"zotero-ui-required","timing":"before-command","scope":"Zotero UI approval for the described Zotero-managed effect."}`.
- Handle 转移： `[{"handle":"itemRef","direction":"consume","required":false,"condition":"Required only for an explicit --selection input; --none carries no itemRef.","lifetime":"caller-owned"},{"handle":"workflowRunId","direction":"produce","required":false,"condition":"Returned when the corresponding operation succeeds.","lifetime":"response"}]`.
- 恢复： `[{"when":"The operation fails or completion is uncertain.","stateCheck":"command-result","requiresHandles":[],"action":"Inspect stateChange and handleConsumption before repeating the operation.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/submit"}]`.
- 别名： `workflow submit`, `workflow`, `submit`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `provider_profile`, `provider-profile`.
- Intent 搜索： `visible`.

## `zotero-bridge workflow validate`

在不启动执行的情况下校验 workflow input

- Argv： `["workflow","validate"]`.
- Argv 绑定： `[{"property":"workflow","kind":"option","token":"--workflow","takesValue":true,"required":true,"valueNames":["WORKFLOW"]},{"property":"selection","kind":"option","token":"--selection","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]},{"property":"none","kind":"option","token":"--none","takesValue":false,"required":false,"valueNames":["NONE"]},{"property":"workflow-options","kind":"option","token":"--workflow-options","takesValue":true,"required":false,"valueNames":["JSON_OR_FILE"]}]`.
- 调用 schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to validate"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"none":{"type":"boolean","description":"Validate a no-selection workflow"},"workflow-options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"}},"required":["workflow"],"allOf":[{"not":{"required":["selection","none"]}},{"oneOf":[{"required":["selection"]},{"required":["none"]}]}],"additionalProperties":false}`.
- Payload schema： `{"type":"object","properties":{"workflow":{"type":"string","description":"Workflow id to validate"},"selection":{"type":"string","description":"Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"},"workflow_options":{"type":"string","description":"Workflow options JSON object, file path, @file, or '-' for stdin"}},"required":[],"additionalProperties":false}`.
- 结果 schema： `{"type":"object","properties":{},"additionalProperties":true}`.
- 分页： `none`.
- 类别： `read`；危险级别： `none`.
- Effects： `[{"kind":"none","stateChanged":false,"description":"Reads state without changing Zotero-managed data."}]`.
- Approval： `{"kind":"none","timing":"none","scope":"No Zotero UI approval; provider runtimes may still request their own permission."}`.
- Handle 转移： `[]`.
- 恢复： `[{"when":"The read fails or returns incomplete evidence.","stateCheck":"none","requiresHandles":[],"action":"Inspect the error and retry only when retryable is true.","nextCommand":"surface describe"}]`.
- 目标： `[{"kind":"endpoint","target":"POST /bridge/v1/workflows/validate"}]`.
- 别名： `workflow validate`, `workflow`, `validate`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`.
- Intent 搜索： `visible`.

