# Zotero Bridge CLI 文件、Product 与操作命令

选择准确的规范操作后，使用此生成参考查阅 `file`、`product` 或 `operation` 命令。

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
