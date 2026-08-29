## MODIFIED Requirements

### Requirement: R7 SHALL complete durable parity without advancing native lifecycle

R7 SHALL implement and verify Rust repository, canonical store, all private typed applications, two read-only candidate canaries, and five-target durability gates while leaving native manifest/lifecycle to R8 and production writer cutover to R9. Repository/canonical parity MAY be accepted independently, but R7 application parity SHALL remain incomplete until each application family has real typed differential evidence.

#### Scenario: R7 completion is claimed
- **WHEN** migration status and acceptance evidence are reviewed
- **THEN** repository and canonical parity are recorded from their durable corpus
- **AND** only application families with typed Node/Rust differential reports are recorded complete
- **AND** no R8 installer/supervisor or R9 production ownership claim is present

#### Scenario: R8 is proposed after the reference slice
- **WHEN** Workbench and Topic typed parity pass but later application clusters remain uncovered
- **THEN** `introduce-synthesis-native-runtime-manifest-v2` remains blocked
- **AND** the thirteen-family inventory cannot be used to waive the missing differentials
