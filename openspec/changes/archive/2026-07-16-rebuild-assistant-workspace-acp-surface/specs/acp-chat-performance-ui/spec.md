## ADDED Requirements

### Requirement: Valid Chat transcript streams stay incremental

ACP Chat target-active steady transcript changes SHALL remain deltas through producer, coordinator, Shell, child, and renderer. A valid sequence SHALL produce no gap, automatic rebase snapshot, complete-page render, full-panel materialization, or frontend materialization.

#### Scenario: Tool boundaries append and finalize rows

- **WHEN** boundary mode releases assistant text and a sequence of new tool rows with later updates
- **THEN** each accepted mutation updates only affected rows
- **AND** unrelated row and managed-region DOM identities remain stable.

### Requirement: Chat target-active evidence removes snapshot amplification

Formal same-provenance Replay SHALL attribute Chat steady publications by typed kind and SHALL show no snapshot amplification from valid delta continuity. Existing posted-byte and recorded-cadence drift budgets remain mandatory.

#### Scenario: Formal Chat boundary replay completes

- **WHEN** the fixed Chat trace runs target-active
- **THEN** transcript is visible, measurement identity is complete, and valid steady gap/rebase snapshot counts are zero
- **AND** target-active recorded-cadence overhead improves without a greater-than-100-millisecond drift regression.
