# Zotero Bridge CLI File, Product, and Operation Commands

Use this generated reference for `file`, `product`, and `operation` commands after selecting the exact canonical operation.

## Choose the owning identity first

File transfer, Product inspection, and operation recovery are related because they move or verify durable outputs, but their identifiers are not interchangeable.

- A local path identifies bytes already available to the agent.
- A `fileId` identifies bridge-mediated transfer access and can expire or be consumed.
- A Product ID identifies a Zotero plugin Product record, not one of its assets.
- A Product asset has its own declared role, media type, size, checksum, and delivery route.
- An operation ID identifies a durable state-changing or maintenance operation and its receipt.
- A workflow artifact remains owned by its workflow or request contract until it is downloaded or applied through that contract.
- A Zotero attachment is live library state and must be read through the library or mutation surface.

Start from the identity returned by the owning command. Do not turn an absolute-looking Zotero path into a local path, infer a `fileId` from a Product, or use an operation ID as a run handle.

## File transfer decision

Use file commands when the task needs to cross the bridge boundary with actual bytes.

Before download:

1. Identify the attachment, Product asset, artifact, or operation that owns the bytes.
2. Obtain the declared transfer instruction or `fileId` from that owner.
3. Choose an absolute local destination when the command requires one.
4. Inspect overwrite behavior and expected checksum or byte count.
5. Download once and verify the resulting local file.

Before upload:

1. Resolve and verify the local file.
2. Confirm which later semantic operation will consume the uploaded bytes.
3. Upload without exposing the local path as Zotero evidence.
4. Preserve the returned `fileId`, checksum, size, and expiry or consumption facts.
5. Use the issued handle only in the declared next command.

An upload alone does not attach, import, or persist anything in Zotero. A download alone does not prove that a Product is complete or that a workflow applied its result.

## Product decision

Use Product commands when a task names a generated Dashboard output or when a completed workflow declares Products as its result evidence.

Inspect the Product before selecting an asset:

- confirm Product identity and producing workflow or task;
- inspect current state and declared assets;
- select the asset by role and media type, not by guessed filename;
- preserve asset size and checksum;
- request delivery through the Product's current contract;
- verify the downloaded bytes independently.

A terminal workflow with no expected Product is not successful output delivery. A Product record with a missing or failed required asset is not a complete deliverable. A downloaded Product is not automatically a Zotero attachment or note.

## Operation receipt decision

Use operation commands when a prior command returned an operation ID or structured receipt for mutation, maintenance, import, export preparation, or another durable effect.

Interpret the receipt before deciding whether a retry is safe:

- `stateChange: unchanged` means no target change was accepted.
- `stateChange: changed` means inspect the live affected object or model before another write.
- `stateChange: unknown` means stop and recover from the operation receipt and current target state.
- `handleConsumption: reusable` permits only the declared continuation.
- `handleConsumption: consumed` prohibits reusing the input handle.
- `handleConsumption: unknown` requires durable inspection before any repeat.
- `retryable: true` is necessary but not sufficient; the current state must also make the retry non-duplicating.

Do not replace an unknown receipt with a fresh submission, upload, mutation, or maintenance call. First determine whether the earlier effect was accepted.

## End-to-end patterns

### Download a workflow Product

1. Read the workflow run and verify its terminal result contract.
2. Inspect the declared Product rather than guessing an output path.
3. Select the required asset and obtain its current file delivery handle.
4. Download to an absolute local destination.
5. Verify checksum and byte count.
6. Report the Product ID, asset role, verified local artifact, and any missing expected assets separately.

### Attach a local artifact to a Zotero item

1. Resolve the parent item and current attachments.
2. Verify the local artifact.
3. Upload the bytes and preserve the issued `fileId`.
4. Preview the semantic attachment mutation with the exact parent and file handle.
5. Obtain current approval and apply once.
6. Re-read the parent attachments and compare the live result with the proposal.

### Recover an interrupted maintenance operation

1. Preserve the operation ID and sanitized original scope.
2. Read the durable receipt.
3. Inspect the affected live model or object when the receipt reports changed or unknown state.
4. Determine which subjects are completed, failed, unattempted, or unverifiable.
5. Construct only the residual action permitted by the receipt.
6. Require new authority for any compensating or expanded change.

## Failure boundaries

- Expired file access: reacquire access from the owning attachment, Product, or artifact.
- Checksum mismatch: preserve the received file for diagnosis, do not use it as evidence, and follow the declared retry route.
- Missing Product asset: report the missing role and inspect the producing run or workflow result; do not substitute a similarly named asset.
- Unknown operation state: stop before replay and inspect the receipt plus current target.
- Consumed handle: obtain a new handle only from its owner; never reconstruct one.
- Partial transfer: keep verified bytes only when the command explicitly supports resume; otherwise follow its safe next action.

Completion requires evidence appropriate to the requested boundary: verified local bytes for transfer, inspected required assets for a Product, or a durable receipt plus live state for an operation.

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
