## ADDED Requirements

### Requirement: SkillRunner connection audit snapshots SHALL be metadata-only

Runtime UI and debug capability snapshots for SkillRunner connection audit SHALL
contain only redacted connection metadata.

#### Scenario: governor audit event is redacted

- **WHEN** a SkillRunner connection lifecycle event is captured
- **THEN** the event SHALL include backend id, lane, request id when present,
  operation label, timestamps, duration, timeout, reason, and error name when
  available
- **AND** the event SHALL NOT include request payloads, response bodies,
  parameters, tokens, local paths, or result contents

#### Scenario: late settlement is visible

- **WHEN** a governed task settles after the governor already timed out or
  aborted it
- **THEN** the governor audit event buffer SHALL record a
  `late_resolve_after_timeout`, `late_reject_after_timeout`, or corresponding
  late-abort settlement event
- **AND** that event SHALL be visible in the debug audit snapshot
