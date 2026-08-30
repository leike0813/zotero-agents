## ADDED Requirements

### Requirement: Host Bridge snapshot output SHALL expose only opaque remote state
The Host Bridge snapshot projection SHALL expose bounded portable item pages, opaque snapshot and cursor identities, normalized terminal status, and completion evidence suitable for the remote contract. It MUST NOT expose local paths, native handles, process objects, repository records, or internal session storage.

#### Scenario: Remote snapshot page is encoded
- **WHEN** Host Bridge returns a snapshot page
- **THEN** every output value is strict JSON and remote-safe while retaining the canonical snapshot ordering and bounds

### Requirement: Snapshot surface guidance SHALL preserve semantic parity
Any governed agent-facing guidance changed for snapshot behavior SHALL preserve all baseline instructions except entries named in the approved deletion inventory. The approved deletion inventory for this change SHALL be empty.

#### Scenario: Semantic review completes
- **WHEN** the snapshot source guidance and materialized packages are reviewed against baseline `4dbddc24e884921262c559428bf851db5eadf2d7`
- **THEN** unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate counts are all zero and every instruction-depth warning has an explicit disposition
