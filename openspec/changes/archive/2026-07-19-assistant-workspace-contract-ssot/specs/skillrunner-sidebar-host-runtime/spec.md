## MODIFIED Requirements

### Requirement: Run-workspace snapshots are schema-versioned and validated

Every run-workspace snapshot SHALL carry
`schema: "zotero-agents.skillrunner-workspace-snapshot.v1"` from the single
production builder. The receiver SHALL validate each inbound snapshot through
the shared `validate` implementation in
`src/shared/skillRunnerSnapshotContract.ts` before rendering and SHALL drop
and trace invalid payloads. Validation SHALL cover schema equality, required
structural keys (including the own `session` key), per-level known-key
whitelists rejecting unknown fields, and L2 type spot checks; decorated
fields (hostMode, badges, sidebar, renderHints) SHALL remain optional.

#### Scenario: Snapshot without an own session key arrives

- **WHEN** an inbound snapshot lacks the own `session` key
- **THEN** the receiver SHALL drop and trace it
- **AND** the panel model's envelope-as-session sniffing fallback SHALL NOT
  be reached.

#### Scenario: Producer emits a malformed snapshot in a debug build

- **WHEN** the debug-gated producer self-check is enabled and the built
  snapshot violates the v1 contract
- **THEN** the host SHALL throw before delivery.

#### Scenario: Both sides validate identically

- **WHEN** the TS assert and the receiver gate evaluate the same payload
- **THEN** they SHALL accept or reject identically, because both call the
  same shared validate implementation.
