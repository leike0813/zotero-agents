## MODIFIED Requirements

### Requirement: SkillRunner observation MUST degrade under connection pressure

Dashboard and run workspace observation MUST prefer stable operation over real-time refresh when connection pressure is detected.

#### Scenario: reachability probe is idle-only

- **WHEN** a SkillRunner backend has active or queued plugin-side requests
- **THEN** plugin SHALL NOT send a reachability probe for that backend
- **AND** ordinary successful backend responses SHALL be used as reachability success signals.

#### Scenario: physical debt degrades observation

- **WHEN** a backend has physical connection debt from timed-out requests without late settlement
- **THEN** plugin SHALL skip low-priority reachability/background/history requests
- **AND** plugin SHALL keep submit, settlement, and request-level reconcile available.

#### Scenario: degraded stream pool keeps only selected run

- **WHEN** a backend is in degraded observation mode
- **THEN** plugin SHALL keep at most one foreground chat stream for the selected run
- **AND** warm streams for recently selected runs SHALL be released.

#### Scenario: connection audit exposes degraded reachability state

- **WHEN** debug connection audit is opened
- **THEN** it SHALL expose reachability mode, physical debt, degraded mode, and skipped low-priority request counters.
