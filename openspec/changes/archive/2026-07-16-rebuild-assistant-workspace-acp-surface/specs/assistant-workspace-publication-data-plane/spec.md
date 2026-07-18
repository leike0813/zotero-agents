## MODIFIED Requirements

### Requirement: Workspace publication uses one v4 vocabulary

ACP Chat and ACP Skills SHALL use the same v4 owner, canonical region, transcript page, item, mutation, publication, and acknowledgement field names and semantics. Workspace production code SHALL NOT decode, alias, or dual-write older publication fields.

#### Scenario: Either surface initializes transcript

- **WHEN** ACP Chat or ACP Skills publishes owner-first transcript initialization
- **THEN** both produce the same canonical transcript region shape and status invariants
- **AND** neither emits a surface-specific transcript lifecycle field.

### Requirement: Transcript fields have one scope

Transcript page SHALL use stable `pageKey`, `startCursor`, `limit`, `totalVisibleItemCount`, nullable adjacent cursors, `sourceEventSeq`, and shared items. Transcript continuity SHALL use `transcriptRevision`; publication-kind order SHALL use `regionRevision`; Shell delivery SHALL use `deliverySequence`. Raw store item counts SHALL NOT cross a surface adapter.

#### Scenario: Snapshot and delta describe the same visible universe

- **WHEN** an owner publishes a ready snapshot followed by a visible delta
- **THEN** both forms define `totalVisibleItemCount` after the same display projection
- **AND** held text or hidden source events do not create a count mismatch.

### Requirement: Queue overflow and gaps force coordinator-owned rebase

The shared mutation buffer SHALL merge consecutive same-item appends and SHALL be limited to 512 mutations or 256 KiB. Overflow, child gap, or render failure SHALL stop delta publication and schedule exactly one current-page snapshot rebase through the shared host runtime. Child SHALL NOT request an automatic rebase page.

#### Scenario: Mutation buffer overflows

- **WHEN** either surface exceeds a buffer limit
- **THEN** the coordinator schedules one rebase snapshot in the owner lane
- **AND** no residual mutation or control publication is delivered as continuous delta.

#### Scenario: Child reports a gap

- **WHEN** the shared child controller rejects a transcript publication as a gap
- **THEN** it sends one terminal rejection acknowledgement
- **AND** the host reads and publishes the current page once.

### Requirement: Transcript page requests are shared

Both child panels SHALL send one owner-plus-page-request action shape for explicit user navigation, and Host SHALL dispatch only by owner source. Automatic rebase SHALL be coordinator-owned and SHALL NOT use the child page-request action.

#### Scenario: User opens a historical page

- **WHEN** either surface requests a transcript cursor through the UI
- **THEN** it sends the same owner-plus-page-request shape
- **AND** Host publishes the selected page in that owner's ordered lane.

### Requirement: Transcript delta application is atomic and structurally incremental

The shared browser controller SHALL validate a complete mutation batch before rendering and SHALL commit page metadata, item map, item order, transcript revision, canonical region state, and acknowledgement as one transaction after the bounded DOM effect succeeds. A steady delta SHALL NOT fall back to initialization or full-page rendering.

#### Scenario: A later delta edits a newly inserted item

- **WHEN** one accepted delta upserts an item and the next delta appends or patches that item
- **THEN** the second delta resolves the item from the committed index and is accepted
- **AND** no gap or rebase is produced.

#### Scenario: A batch or render effect fails

- **WHEN** validation or targeted rendering cannot complete
- **THEN** committed model, revision, and unrelated DOM remain unchanged
- **AND** one terminal rejection enters coordinator-owned rebase.

## ADDED Requirements

### Requirement: ACP child state is source-neutral

ACP Chat and ACP Skills SHALL use one canonical child state containing `owner` and the same named regions for owner navigation, baseline status, message counts, transcript, plan, permission, reply hint, and context details. Shared receiver/controller code SHALL NOT write source-specific panel snapshot fields.

#### Scenario: Equivalent publications reach both children

- **WHEN** equivalent normalized publications are delivered to Chat and Skills
- **THEN** they update the same canonical region field
- **AND** only labels, capabilities, owner payloads, and item content may differ.

### Requirement: Automatic rebase has no wire control form

Transcript publication form SHALL be `snapshot` or `delta`. Gap and overflow SHALL be host lifecycle decisions rather than a `resync-required` publication.

#### Scenario: Valid delta stream remains steady

- **WHEN** a selected owner receives a valid sequence of transcript mutations
- **THEN** every steady transcript publication is a delta
- **AND** no automatic-rebase control form or snapshot is posted.
