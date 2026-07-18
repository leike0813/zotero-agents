## MODIFIED Requirements

### Requirement: Managed regions preserve stable layout identity

The shared child SHALL keep main layout containers mounted while region
signatures independently govern toolbar, banner, conversation, plan, hint,
reply, drawer, details, permission, and transcript rendering.

#### Scenario: Owner navigation clears selection

- **WHEN** navigation atomically replaces the old selection with empty loading
- **THEN** old owner content is invalidated
- **AND** non-content layout containers retain their DOM identity.

### Requirement: Renderer failure diagnostics are bounded and retryable

Transcript rendering SHALL return a bounded stage, code, and render path.
Failed effects SHALL not commit signatures or partial renderer state.

#### Scenario: Virtual row reconciliation rejects a delta

- **WHEN** the renderer cannot locate a planned row
- **THEN** the ACK contains the bounded reconciliation failure
- **AND** the next valid publication can retry without requiring stale state.
