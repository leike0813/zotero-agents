## MODIFIED Requirements

### Requirement: Synthesis foundation manages canonical transactions and derived projection state

Foundation SHALL provide reusable transaction, event, diagnostics, and projection stale helpers for canonical store domains.

#### Scenario: Git adapter exchange runs

- **WHEN** a production Git adapter exchanges canonical assets with a worktree
- **THEN** the local canonical store SHALL remain the source of truth
- **AND** imported remote content SHALL still enter the store only through Foundation-backed Git Sync import validation and promotion.
