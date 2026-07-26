## ADDED Requirements

### Requirement: Formal Replay rejects valid-stream rebase storms

Formal ACP Chat and ACP Skills boundary Replay SHALL require visible target transcript, complete execution and measurement, complete publication identities, zero forbidden steady materialization, and zero gap/rebase snapshots for valid steady mutations.

#### Scenario: Either target-active surface rebases valid deltas

- **WHEN** a valid steady trace produces a gap, automatic rebase page read, or rebase snapshot
- **THEN** the affected record and atomic cross-surface acceptance are incomplete.

### Requirement: Rebase drain follows the coordinator barrier

Replay diagnostic publication drain SHALL wait for the exact coordinator-owned publication barrier. Child automatic page requests and removed control-publication identities SHALL NOT participate in the barrier.

#### Scenario: A diagnostic equal-content snapshot is forced

- **WHEN** Replay forces an owner snapshot after all prior same-surface work
- **THEN** it receives and waits for the exact snapshot publication identity
- **AND** unrelated historical or removed rebase-control state cannot block completion.
