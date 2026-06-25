## ADDED Requirements

### Requirement: SkillRunner connection governance MUST separate reconcile and health lanes

SkillRunner HTTP work SHALL route terminal state polling and backend health
probing through separate governed lanes.

#### Scenario: terminal polling uses reconcile lane

- **WHEN** the frontend checks `/v1/jobs/{request_id}` for an already registered
  SkillRunner run
- **THEN** the request SHALL run in the `reconcile` lane
- **AND** the request SHALL use a bounded timeout
- **AND** it SHALL NOT share the `background` lane used by non-critical history
  or gap sync

#### Scenario: health probe uses health lane

- **WHEN** the frontend probes backend reachability with `/v1/system/ping`
- **THEN** the request SHALL run in the `health` lane
- **AND** health lane queueing or skipping SHALL NOT by itself mark an active
  run failed
- **AND** health lane failure SHALL NOT consume critical submit, settlement, or
  reconcile capacity

### Requirement: SkillRunner backend connection budget MUST protect critical lanes

The SkillRunner connection governor SHALL keep submit, settlement, and reconcile
work able to start under normal UI stream load.

#### Scenario: backend active cap is six

- **WHEN** SkillRunner work is scheduled for one backend
- **THEN** the default plugin-side active connection cap SHALL be six

#### Scenario: critical lane may evict warm stream

- **WHEN** a backend is at its active connection cap
- **AND** a `submit`, `settlement`, or `reconcile` task is queued
- **AND** an evictable warm foreground stream exists
- **THEN** the governor SHALL abort the least-recently focused evictable stream
- **AND** it SHALL start the critical task instead of waiting for background or
  stream work to finish

#### Scenario: low-priority lanes reserve budget

- **WHEN** `background`, `maintenance`, or `health` work is queued
- **THEN** that work SHALL leave at least two backend slots available for
  critical lanes
