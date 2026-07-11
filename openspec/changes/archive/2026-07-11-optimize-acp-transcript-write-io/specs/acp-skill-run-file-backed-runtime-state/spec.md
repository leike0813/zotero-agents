## ADDED Requirements

### Requirement: Live transcript persistence is bounded and durable at semantic boundaries

ACP Skill live transcript events SHALL update the live mirror synchronously and SHALL be persisted through an owner-scoped buffered writer with bounded delay, payload, and entry thresholds.

#### Scenario: Synchronous transcript burst is physically batched

- **WHEN** one ACP Skill owner receives many synchronous compatible text chunks below a durability boundary
- **THEN** its live mirror, revision, item count, preview, and live delta SHALL reflect every chunk immediately
- **AND** the chunks SHALL be persisted using a bounded number of physical JSONL appends
- **AND** adjacent compatible `append_text` events MAY be coalesced without changing text order or final item semantics.

#### Scenario: Transcript durability boundary drains target owner

- **WHEN** an ACP Skill transcript page or full mirror is read, a user or interaction boundary is entered, a request becomes terminal or is applied, or the owner is disconnected, ended, archived, or released
- **THEN** pending transcript JSONL and required index checkpoint writes for that owner SHALL complete before the boundary returns
- **AND** unrelated owners SHALL NOT be required to flush.

#### Scenario: Shutdown drains live persistence

- **WHEN** the plugin performs controlled shutdown
- **THEN** pending ACP Skill transcript and metadata writes SHALL be drained within the existing bounded shutdown wait
- **AND** a failure or timeout SHALL emit structured diagnostics.

### Requirement: Transcript index checkpoints are derived and recoverable

The transcript index SHALL use a rebuildable format that records the durable JSONL source byte length and checkpoint time, and normal live writes SHALL checkpoint no more often than every 30 seconds or each additional 1 MiB of source data except at explicit durability boundaries.

#### Scenario: Valid stale index recovers JSONL tail

- **GIVEN** a valid current-version index has a `sourceByteLength` shorter than the transcript JSONL
- **WHEN** the transcript is read or forced durable
- **THEN** the store SHALL incrementally fold the unindexed JSONL tail
- **AND** the resulting page metadata, event sequence, offsets, previews, and items SHALL match the canonical JSONL.

#### Scenario: Old or invalid index rebuilds

- **GIVEN** the index is version 1, malformed, or records a source length greater than the current JSONL
- **WHEN** the transcript is read
- **THEN** the store SHALL rebuild a current index from the complete JSONL
- **AND** it SHALL NOT migrate or rewrite historical transcript events.

#### Scenario: Index failure does not negate transcript append

- **WHEN** JSONL append succeeds but an index checkpoint fails
- **THEN** the transcript append SHALL remain successful and canonical
- **AND** the index SHALL remain dirty for retry at the next durability boundary.

### Requirement: Soft ACP Skill metadata uses trailing persistence

ACP Skill transcript-only, usage, workspace activity, and non-terminal tool-call updates SHALL use bounded trailing metadata persistence, while semantic boundary state SHALL persist immediately.

#### Scenario: Soft metadata burst is coalesced

- **WHEN** many soft live updates arrive for one ACP Skill run within approximately two seconds
- **THEN** the in-memory run state SHALL reflect them immediately
- **AND** SQLite metadata persistence SHALL be coalesced into a bounded number of writes.

#### Scenario: Boundary metadata is immediate

- **WHEN** a user message, permission or interaction, plan, new tool call, terminal request, apply, disconnect, end, or archive boundary occurs
- **THEN** pending metadata for the target owner SHALL be persisted before the boundary returns
- **AND** a duplicate lifecycle event with the same stable identity SHALL NOT replace the same event row again.
