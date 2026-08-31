## MODIFIED Requirements

### Requirement: Live item traversal SHALL be bounded and callback-scoped
`library.traverseItems` SHALL accept only the `top-level-regular` scope in v12, process batches serially, enforce centralized defaults and hard maxima, and return completed, canceled, or resource-limited coverage. Each batch item SHALL be a traversal-only regular-item summary carrying the Broker-owned canonical tag digest from the same complete Host read as its revision and tags; the delivered revision SHALL be reused from that same read and MUST NOT be re-read before delivery. Each item's canonical tag set SHALL be deduplicated and sorted in code-unit order, and that ordering SHALL be identical across the plugin and the Synthesis sidecar runtimes. The terminal coverage digest SHALL be computed by buffering every delivered (ref, revision, tagDigest) tuple, sorting the buffered tuples by (libraryId, key) in code-unit order at completion, and hashing the sorted tuple stream, so the digest is independent of page delivery order and reproducible across processes. Ordinary item-list and selection-summary DTOs SHALL remain unchanged. Previously completed callbacks SHALL not be represented as rolled back after a later stop.

#### Scenario: Callback receives audit evidence
- **WHEN** a traversal batch is delivered to a trusted callback
- **THEN** every item carries its canonical tag digest and the terminal coverage digest is derived from those exact delivered item references, revisions, and tag digests

#### Scenario: Items are delivered out of identity order across pages
- **WHEN** a multi-item traversal delivers batches whose item order differs from (libraryId, key) code-unit order
- **THEN** the terminal coverage digest equals the digest computed from the same tuples sorted by (libraryId, key), matching the digest the Synthesis sidecar computes for the same delivered set

#### Scenario: Callback rejects
- **WHEN** the batch callback throws or rejects
- **THEN** traversal fails and does not claim that caller side effects from earlier batches were rolled back

#### Scenario: Empty library is traversed
- **WHEN** no item matches the resolved criteria
- **THEN** traversal returns completed with canonical empty coverage evidence

## ADDED Requirements

### Requirement: Tag reads on write and snapshot paths SHALL be fail-closed
Any Host operation whose result commits, verifies, or evidences item tag state SHALL obtain tags through the canonical bounded tag read. A failed, non-array, truncated, or over-limit tag read SHALL fail the operation with a stable error instead of silently substituting an empty or partial tag set. This applies to `item.updateTags`, `statusTags.transition`, and library sync snapshot item serialization. A snapshot whose tag read fails SHALL NOT issue completion evidence.

#### Scenario: Tag read fails during a tag mutation
- **WHEN** the canonical tag read throws or returns invalid data while `item.updateTags` or `statusTags.transition` verifies pre- or post-write tag state
- **THEN** the mutation fails with a stable read-phase error and does not commit a tag state derived from partial data

#### Scenario: Tag read fails during snapshot serialization
- **WHEN** an item's tags cannot be read completely while a library sync snapshot item is serialized
- **THEN** the snapshot fails and no completion evidence covering that item is issued

### Requirement: Mutation admission SHALL reject unsupported operations and retry SHALL form successor attempts
`mutations.execute` SHALL reject any operation name outside the closed canonical operation set at admission with a stable `unsupported_operation` error before any reservation or write. When a previously recorded terminal failure carries the `retry_same_operation` recovery contract, a retried call with the same operation identity and semantic input SHALL NOT replay the stale failure snapshot; the authority SHALL discard the failed record and execute a fresh successor attempt under the same operation identity. Idempotency conflicts for diverging semantic input and in-flight deduplication for identical running operations SHALL remain unchanged.

#### Scenario: Unknown operation is submitted
- **WHEN** a caller submits an operation name not in the canonical eleven-operation union
- **THEN** admission fails with `unsupported_operation` naming the submitted operation and no mutation record or Host write is created

#### Scenario: Retriable failure is retried
- **WHEN** an operation whose recorded terminal failure has recovery `retry_same_operation` is submitted again with identical semantic input
- **THEN** the stale failure is discarded and a new attempt executes, producing a fresh terminal result rather than the cached failure

### Requirement: Attachment mutations SHALL require ordinary-role targets
`attachments.updateMetadata`, `attachments.replaceFile`, `attachments.move`, and `attachments.remove` SHALL resolve the target attachment's role before writing and SHALL reject targets whose role is `note_image` or `note_payload` with a stable `invalid_ref` error carrying reason `wrong_kind`. Attachment creation role assignment and note-payload write paths SHALL remain governed by their own named interfaces.

#### Scenario: Managed note-image attachment is targeted
- **WHEN** a caller submits an attachment mutation against an attachment whose role is `note_image` or `note_payload`
- **THEN** the mutation fails with `invalid_ref`/`wrong_kind` before any write, and the managed attachment is unchanged

### Requirement: Tag audit runs SHALL reconcile stale activity and promote idempotently
Tag audit run begin SHALL carry the host's currently active run ids and SHALL be serialized per host so concurrent begins observe a consistent active set; the Synthesis runtime SHALL abandon runs of the same host that are not in that active set before admitting the new run. Promoting an audit run that was already promoted for the same source run SHALL return the persisted snapshot rather than a freshly computed unpublished revision. `acknowledgeRegulation` SHALL fail with a stable `canceled` error when the caller signal is already aborted, and MUST NOT fabricate a stale outcome. A successful audit publish or regulation acknowledgement SHALL trigger tag-ledger invalidation notification for the affected surfaces.

#### Scenario: Begin follows a crashed run
- **WHEN** a new audit run begins while the repository holds a non-terminal run for the same host that is not in the caller's active set
- **THEN** the stale run is abandoned before the new run is admitted

#### Scenario: Promote is retried after success
- **WHEN** promotion is requested again for an audit run whose promotion already succeeded
- **THEN** the result is the persisted snapshot for that source run, not a new unpublished revision

#### Scenario: Acknowledgement is canceled before execution
- **WHEN** `acknowledgeRegulation` is invoked with an already-aborted control signal
- **THEN** the call fails with a stable `canceled` error and issues no acknowledgement
