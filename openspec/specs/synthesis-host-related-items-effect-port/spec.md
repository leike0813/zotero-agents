# synthesis-host-related-items-effect-port Specification

## Purpose
Defines the Synthesis Host port for host related items effect, specifying the injected interface that the application service uses to delegate to Host-owned implementation.

## Requirements

### Requirement: Related Items Host plans are bounded and JSON-safe

The Synthesis application SHALL request Related Items mutations through an environment-neutral Host port. A batch SHALL contain one to fifty unique effects. Each effect SHALL contain a deterministic effect ID, semantic ensure action, stable source and target item refs, citation provenance, and permission context. Validation SHALL rebuild the canonical DTO and fail before Zotero access for invalid bounds, identifiers, actions, duplicates, self-relations, or non-JSON values.

#### Scenario: A valid effect batch is submitted
- **WHEN** the application submits valid ensure-present and ensure-absent effects
- **THEN** the Host SHALL receive only canonical JSON-safe fields
- **AND** no Zotero objects, functions, numeric item IDs, paths, or callbacks SHALL cross the boundary

#### Scenario: A batch is invalid
- **WHEN** a batch is empty, oversized, duplicated, malformed, or contains a self-relation
- **THEN** it SHALL fail with the stable invalid-request classification before any Zotero item is resolved

### Requirement: Zotero relation mutations are idempotent and receipt-based

The Host SHALL atomically inspect the current relation state for each effect and apply only the change required by its semantic action. It SHALL return exactly one receipt per effect with status `applied`, `already_satisfied`, `not_found`, or `failed`, a Host timestamp, and bounded diagnostics.

#### Scenario: Desired relation state already holds
- **WHEN** ensure-present targets an existing relation or ensure-absent targets an absent relation
- **THEN** the Host SHALL return `already_satisfied`
- **AND** it SHALL NOT save a redundant Zotero mutation

#### Scenario: One item cannot be mutated
- **WHEN** an item is missing or a save fails within an otherwise valid batch
- **THEN** that effect SHALL return `not_found` or `failed`
- **AND** valid sibling effects SHALL still receive their own receipts

### Requirement: Intended effects are durable before Host IO

The application SHALL persist each dispatched effect as `pending_external_write` before invoking the Host and SHALL reconcile its durable status only after validating the corresponding receipt. Host IO SHALL NOT occur inside a repository transaction.

#### Scenario: A Host batch succeeds partially
- **WHEN** a batch returns mixed applied, already-satisfied, not-found, and failed receipts
- **THEN** each durable effect SHALL be mapped independently to applied/revoked, already-existing/already-absent, needs-attention, or failed state
- **AND** operation counts and diagnostics SHALL reflect every receipt

#### Scenario: Transport fails after pending persistence
- **WHEN** the Host invocation throws or returns malformed receipts
- **THEN** the current batch SHALL remain pending
- **AND** later batches SHALL not be dispatched
- **AND** the operation SHALL fail with bounded diagnostics while remaining explicitly retryable

### Requirement: Retry and revoke preserve ownership

Deterministic ensure plans SHALL reconcile interrupted pending effects idempotently. A relation that was already present before the first Synthesis dispatch SHALL remain user-owned. Ensure-absent SHALL be generated only for a prior effect proven to be Synthesis-created.

#### Scenario: Retry observes an already-satisfied relation
- **WHEN** a prior pending ensure-present effect is retried and the Host reports already-satisfied
- **THEN** the effect SHALL recover as Synthesis-applied with a recovery diagnostic
- **AND** the relation SHALL not be added again

#### Scenario: Existing user relation is scanned for the first time
- **WHEN** no prior pending Synthesis effect exists and ensure-present reports already-satisfied
- **THEN** the effect SHALL be stored as already-existing and not Synthesis-created
- **AND** a later revoke SHALL not remove it

### Requirement: Receipt reconciliation preserves notifier echoes

Fresh applied mutations SHALL await the related-item notifier echo. If the observer consumes the durable pending row before receipt reconciliation, the final applied or revoked row SHALL preserve the observed echo state.

#### Scenario: Echo arrives before receipt persistence
- **WHEN** Zotero emits and the observer consumes a matching notifier event before the Host receipt is reconciled
- **THEN** receipt reconciliation SHALL not reset the row to awaiting-echo
- **AND** the notifier SHALL remain classified as a Synthesis effect

### Requirement: Production composition owns the Zotero adapter

The single legacy composition root SHALL inject the Zotero Related Items effect adapter. The service SHALL contain no Related Items Zotero fallback, item-object access, or function-valued Host override. The readonly composition SHALL omit the write port. The public service SHALL retain 128 methods and exactly one production direct consumer.

#### Scenario: Static boundary is checked
- **WHEN** the Synthesis boundary checker runs
- **THEN** Related Items orchestration SHALL depend only on the Host effect port
- **AND** the service inventory SHALL remain 128 methods and one direct consumer

### Requirement: Related Items Host batches SHALL be typed and receipt-exact

`effects.related_items.apply_batch` SHALL accept at most twenty-five deterministic effect requests and return one valid receipt for every and only requested effect ID. The port SHALL preserve request ordering for correlation while allowing per-effect results to differ.

#### Scenario: Receipt is an exact partition
- **WHEN** every requested effect ID appears exactly once with a valid outcome
- **THEN** the application may coordinate each effect's durable state
- **AND** unrelated or reordered domain outcomes cannot be applied to another effect

#### Scenario: Receipt is missing, duplicated, or foreign
- **WHEN** a receipt omits a requested ID, repeats an ID, includes an unknown ID, or has an invalid outcome
- **THEN** the whole current Host batch is treated as malformed
- **AND** no effect in that batch is falsely marked externally applied
