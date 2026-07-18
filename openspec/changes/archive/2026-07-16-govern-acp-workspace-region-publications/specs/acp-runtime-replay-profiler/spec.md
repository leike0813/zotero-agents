## ADDED Requirements

### Requirement: Replay requires complete region publication evidence

Replay SHALL mark R3 captured only when all required host prepare/post, shell-forward, child-apply, and render-ack metric families are present and attributable for successfully posted publications. Missing stages SHALL keep execution evidence intact but mark measurement incomplete with a structured reason.

#### Scenario: Render acknowledgement is missing

- **WHEN** a replay publication is posted but no matching child render acknowledgement is captured
- **THEN** replay execution MAY remain complete
- **AND** R3 measurement SHALL be incomplete with the missing lifecycle stage identified.

#### Scenario: Replay drain waits for the exact publication

- **WHEN** the child receives a forced diagnostic publication before its render acknowledgement reaches the host
- **THEN** replay drain SHALL remain pending
- **AND** it SHALL complete only after that publication ID has render-complete evidence and earlier same-tab publications have reached a terminal state.

#### Scenario: Owner-first activation temporarily rejects the probe

- **WHEN** the host owner is ready but the child still rejects the forced publication as old-owner, or a newer generation supersedes it
- **THEN** replay drain SHALL treat that result as a terminal state for the rejected identity
- **AND** it SHALL retry the idempotent diagnostic publication without overlapping force builds.

#### Scenario: A prior run acknowledgement arrives late

- **WHEN** an acknowledgement from prepare or a previous replay round arrives during the current profile
- **THEN** it SHALL NOT satisfy the current round's publication lifecycle
- **AND** equal aggregate counts with mismatched publication identities SHALL keep R3 measurement incomplete.

#### Scenario: Closed surface replays

- **WHEN** the Workspace surface is closed
- **THEN** replay SHALL require no R3 publication lifecycle and SHALL report expected-zero R3.

### Requirement: Replay attributes inactive and matching region work

Replay SHALL distinguish matching-target, opposite-active, and inactive-source causality. Open-inactive replay SHALL NOT build target or opposite-tab publications from trace-source changes; it MAY record dropped-before-build. Target-active replay SHALL attribute region publication and acknowledgement only to the mapped current owner.

#### Scenario: Open-inactive Chat trace replays

- **WHEN** a Chat trace runs while another Workspace tab is active
- **THEN** Chat region DTO prepare and post SHALL remain zero
- **AND** any source-change evidence SHALL be recorded as dropped-before-build rather than hidden.

#### Scenario: Target-active Chat trace replays

- **WHEN** a live Chat trace runs on its matching active owner
- **THEN** every successful post SHALL have matching shell-forward, child-apply, and render-ack evidence.

### Requirement: Replay reports region governance comparison

Replay reports SHALL compare corrected before and after live Chat R3 counts and actual posted bytes under identical provenance. Formal target-active baseline publications SHALL be fewer than the corrected pre-governance total, actual posted bytes SHALL decrease, and the greater-than-100-millisecond drift bucket SHALL not worsen in real-host recorded-cadence runs.

#### Scenario: Logical cadence report is generated

- **WHEN** the comparison uses logical cadence
- **THEN** the report SHALL compare stable lifecycle counts and bytes
- **AND** it SHALL NOT interpret wall time as actual Zotero responsiveness.

#### Scenario: Real-host formal evidence is generated

- **WHEN** matching recorded-cadence live Chat formal runs complete on Zotero 7 or Zotero 9
- **THEN** the report SHALL compare R3 lifecycle counts, actual posted bytes, and drift buckets using identical provenance.
