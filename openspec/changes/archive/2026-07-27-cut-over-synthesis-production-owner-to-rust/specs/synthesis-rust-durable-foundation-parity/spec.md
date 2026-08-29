## REMOVED Requirements

### Requirement: R7 SHALL remain shadow-only

**Reason**: R9a explicitly promotes the accepted Rust durable implementation from isolated parity candidate to the single production owner.

**Migration**: Shadow-only behavior remains mandatory before a completed R9a cutover receipt; afterward the Rust owner uses production roots and legacy/Node cannot share them.

## ADDED Requirements

### Requirement: Durable parity SHALL be consumed only through receipted cutover

The R7 repository, canonical-store, and application implementation SHALL become production-authoritative only after backup verification, production-copy preflight, exclusive owner lock, forward recovery, and a completed cutover receipt.

#### Scenario: Candidate lacks a receipt
- **WHEN** a Rust instance has parity evidence but no valid production receipt
- **THEN** it can access only derived isolated roots and remains mutation-disabled

#### Scenario: Receipted owner restarts
- **WHEN** a compatible Rust bundle restarts for a production receipt
- **THEN** it reconciles repository and canonical journals before serving reads or mutations
- **AND** it never opens a Node or plugin-owned fallback root
