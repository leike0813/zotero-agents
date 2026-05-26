## ADDED Requirements

### Requirement: Recovery excludes normal note mirror operation

Synthesis recovery SHALL treat Zotero note mirror as a legacy migration source
only.

#### Scenario: Mirror recovery action is not advertised

- **WHEN** Synthesis sync/recovery status is computed during normal plugin
  runtime
- **THEN** it SHALL NOT advertise `rebuild_mirror_from_canonical` or
  `recover_canonical_from_mirror` as normal actions.
