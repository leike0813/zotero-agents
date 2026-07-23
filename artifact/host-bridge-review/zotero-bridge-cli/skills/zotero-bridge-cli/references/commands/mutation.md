# Zotero Bridge CLI 变更命令

选择准确的规范操作后，使用此生成参考查阅 `mutation` 命令。

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
