# Zotero Bridge CLI 文件、Product 与操作命令

选择准确的规范操作后，使用此生成参考查阅 `file`、`product` 或 `operation` 命令。

## 首先选择拥有身份

文件传输、Product检查和操作恢复是相关的，因为它们移动或验证持久输出，但它们的标识符不可互换。

- 本地路径标识已可用于 agent 的字节。
- `fileId` 标识桥介导的传输访问，并且可能会过期或被消耗。
- Product ID 标识 Zotero 插件 Product 记录，而不是其资产之一。
- Product 资产具有其自己声明的角色、媒体类型、大小、校验和和传送路径。
- 操作 ID 标识持久状态更改或维护操作及其 receipt。
- workflow artifact 仍由其 workflow 或请求合约拥有，直到通过该合约下载或应用为止。
- Zotero 附件是实时库状态，必须通过库或写入变更表面读取。

从拥有命令返回的身份开始。不要将看起来绝对的 Zotero 路径转换为本地路径，从 Product 推断出 `fileId`，或使用操作 ID 作为运行 handle。

## 文件传输决定

当任务需要使用实际字节跨越桥接边界时，请使用文件命令。

下载前：

1. 识别附件、Product资产、artifact或拥有字节的操作。
2. 从该所有者处获取声明的转让指令或`fileId`。
3. 当命令需要时，选择一个绝对本地目的地。
4. 检查覆盖行为和预期的校验和或字节计数。
5. 下载一次并验证生成的本地文件。

上传前：

1. 解析并验证本地文件。
2. 确认后续哪个语义操作将消耗上传的字节。
3. 上传时不暴露本地路径作为 Zotero 证据。
4. 保留返回的 `fileId`、校验和、大小以及过期或消耗事实。
5. 仅在声明的下一个命令中使用发出的handle。

单独上传不会附加、导入或保留 Zotero 中的任何内容。单独下载并不能证明 Product 已完成或 workflow 应用了其结果。

## Product决定

当任务命名生成的仪表板输出或已完成的 workflow 声明 Products 作为其结果证据时，请使用 Product 命令。

在选择资产之前检查Product：

- 确认Product身份并产生 workflow 或任务；
- 检查资产的现状和申报；
- 按角色和媒体类型而不是猜测的文件名选择资产；
- 保留资产大小和校验和；
- 通过Product当前合约请求交付；
- 独立验证下载的字节。

没有预期 Product 的终端 workflow 未成功输出传递。缺少或失败的所需资产的Product记录不是完整的可交付成果。下载的 Product 并不自动成为 Zotero 附件或注释。

## 操作receipt决策

当先前的命令返回操作 ID 或结构化 receipt 时，使用操作命令以进行写入变更、维护、导入、导出准备或其他持久效果。

在决定重试是否安全之前解释一下receipt：

- `stateChange: unchanged` 表示未接受目标更改。
- `stateChange: changed` 表示在另一次写入之前检查实时受影响的对象或模型。
- `stateChange: unknown` 表示停止并从操作receipt 和当前目标状态恢复。
- `handleConsumption: reusable` 仅允许声明的延续。
- `handleConsumption: consumed` 禁止重复使用输入handle。
- `handleConsumption: unknown` 在重复之前需要进行持久检查。
- `retryable: true`是必要的，但还不够；当前状态还必须使重试不重复。

不要用新的提交、上传、写入变更或维护调用替换未知的receipt。首先判断先前的效果是否被接受。

## 端到端模式

### 下载workflowProduct

1. 读取 workflow 运行并验证其最终结果合约。
2. 检查声明的 Product 而不是猜测输出路径。
3. 选择所需资产并获取其当前文件交付handle。
4. 下载到绝对本地目的地。
5. 验证校验和和字节数。
6. 分别报告Product ID、资产角色、已验证的本地artifact以及任何缺失的预期资产。

### 将本地 artifact 附加到 Zotero 条目

1. 解析父项目和当前附件。
2. 验证本地artifact。
3. 上传字节并保存发布的`fileId`。
4. 使用确切的父级和file handle预览语义附件写入变更。
5. 获得当前批准并申请一次。
6. 重新阅读父附件并将实时结果与提案进行比较。

### 恢复中断的维护操作

1. 保留操作 ID 并清理原始范围。
2. 阅读耐用的receipt。
3. 当 receipt 报告更改或未知状态时，检查受影响的实时模型或对象。
4. 确定哪些科目已完成、未通过、未尝试或无法验证。
5. 仅构造receipt允许的剩余动作。
6. 任何补偿或扩大的变更都需要新的权力。

## 故障边界

- 过期的文件访问权限：从所属附件Product或artifact重新获取访问权限。
- 校验和不匹配：保留接收到的文件用于诊断，不将其用作证据，并遵循声明的重试路线。
- 缺少Product资产：报告缺少的角色并检查生产运行或 workflow 结果；请勿替换名称相似的资产。
- 未知操作状态：重放前停止并检查receipt加上当前目标。
- 消耗handle：仅从其所有者处获得新的handle；永远不要重建一个。
- 部分传输：仅当命令明确支持恢复时才保留已验证的字节；否则遵循其安全的下一步行动。

完成需要适合所请求边界的证据：验证传输的本地字节、检查Product所需的资产，或持久的receipt以及操作的活动状态。

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
