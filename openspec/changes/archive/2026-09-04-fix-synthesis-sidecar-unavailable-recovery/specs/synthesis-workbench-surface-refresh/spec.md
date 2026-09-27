## ADDED Requirements

### Requirement: Chrome refreshes SHALL be coalesced per Workbench runtime

Each Workbench runtime SHALL allow at most one chrome read in flight. Requests
arriving while that read is active SHALL merge into at most one follow-up read,
and any forced-refresh request in the merged set SHALL make the follow-up read
forced. Cross-runtime load SHALL remain bounded by sidecar transport admission.

#### Scenario: Repeated refreshes overlap one chrome read

- **WHEN** multiple chrome refresh requests arrive before the active chrome read completes
- **THEN** the Workbench issues no additional concurrent chrome read for that runtime
- **AND** it issues at most one follow-up read after the active read completes
- **AND** the follow-up retains forced-refresh intent when any merged request was forced

#### Scenario: Workbench runtime is cleaned up while refresh is queued

- **WHEN** a chrome read is active and a follow-up refresh is queued
- **AND** the Workbench runtime is cleaned up
- **THEN** the queued refresh is discarded
- **AND** the completed stale response does not update the Workbench

