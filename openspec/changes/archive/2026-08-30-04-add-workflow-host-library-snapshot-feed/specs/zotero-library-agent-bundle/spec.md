## ADDED Requirements

### Requirement: Zotero Librarian index refresh SHALL be generation-based
The resident indexer SHALL write rows from one full snapshot into a staging generation and SHALL promote that generation only after complete snapshot evidence validates. It MUST NOT update the current index in place page by page.

#### Scenario: Complete refresh succeeds
- **WHEN** all snapshot pages and evidence validate
- **THEN** changed rows are upserted, absent rows are removed, and the staged generation becomes current in one promotion boundary

#### Scenario: Resident process is interrupted
- **WHEN** the resident process stops before promotion
- **THEN** the previous generation remains current and the incomplete staged generation is recoverable as non-authoritative state

### Requirement: Live Zotero facts SHALL outrank cached index state
Snapshot sessions and their completion evidence SHALL come from the current Host. A cached generation, local receipt, or previously completed run MUST NOT independently prove current Zotero state.

#### Scenario: Cached index is available after Host restart
- **WHEN** the Host restarts while a prior index remains readable
- **THEN** the index may serve as stale cache but a fresh snapshot is required before replacement or absent-row deletion
