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

<!-- host-bridge-command-reference:entries -->
