## ADDED Requirements

### Requirement: R9a implementation MAY proceed with R8 remote evidence deferred

R8 five-platform remote evidence MAY remain an explicit external debt while R9a artifacts and local implementation proceed. The debt MUST NOT be represented as passing evidence, and R9a SHALL NOT dispatch, publish, sign, synchronize, or declare complete R9/Stage 1 release acceptance.

#### Scenario: R9a local acceptance is reported
- **WHEN** local contracts, cutover rehearsal, tests, and builds pass without R8 remote results
- **THEN** the report identifies the remote evidence as pending
- **AND** makes no five-platform, signed-XPI, or real-machine completion claim

### Requirement: R9a and R9b SHALL remain separately auditable

R9a SHALL transfer production ownership and make legacy code unreachable from production. Physical deletion of Node runtime, legacy implementation, dependencies, and release branches SHALL occur only in the separate R9b change within the same release milestone.

#### Scenario: R9a deletion inventory is reviewed
- **WHEN** R9a is ready for verification
- **THEN** production routes contain no legacy fallback
- **AND** retained oracle source is listed for R9b rather than deleted opportunistically

