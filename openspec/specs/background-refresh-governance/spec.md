# background-refresh-governance Specification

## Purpose
Defines governance rules for long-lived background refresh timers to ensure they remain scoped, lightweight, and do not perform expensive reads unless explicitly needed by foreground surfaces.

## Requirements

### Requirement: Long-lived background refreshes declare scope and budget

The plugin SHALL govern every long-lived host-side timer with an explicit owner,
activation condition, scope key, permitted data sources, maximum read shape,
foreground or visibility rule, and minimum interval or documented exemption.

#### Scenario: Timer registry is audited
- **WHEN** a long-lived timer is added or changed
- **THEN** it SHALL either be registered through the background refresh
  governance helper or covered by a documented exemption
- **AND** short-lived debounce, tooltip, animation, and persistence flush timers
  SHALL NOT be treated as long-lived background refresh timers.

### Requirement: Periodic ticks perform cheap scope gates before reads

Long-lived periodic ticks SHALL perform a cheap activation and scope check before
reading task, run, log, product, or history stores.

#### Scenario: Inactive scope skips refresh
- **WHEN** a periodic timer fires for a surface that is not visible or not the
  active scoped surface
- **THEN** the tick SHALL skip heavy store reads
- **AND** it MAY keep the timer alive for later cheap scope checks.

### Requirement: Background summaries use lightweight read models

Background UI summaries SHALL use lightweight read models that do not read full
ACP transcripts, ACP event lists, SkillRunner full run payloads, runtime log
details, workflow product previews, or full task history unless a foreground
detail scope requires them.

#### Scenario: Attention count refreshes
- **WHEN** a workspace or sidebar attention badge refreshes
- **THEN** it SHALL read only active task and permission summary data
- **AND** it SHALL NOT read full SkillRunner run payloads or ACP transcript
  arrays.

### Requirement: Heavy read diagnostics are available to tests

The plugin SHALL expose test diagnostics that count full run payload reads and
other heavy read-model operations relevant to background refresh governance.

#### Scenario: Background refresh test inspects diagnostics
- **WHEN** a test exercises a background refresh with many retained runs
- **THEN** the test SHALL be able to assert that the refresh did not perform a
  full unscoped run payload read.

### Requirement: Service health timers remain scoped to their service

Service health timers SHALL read only the specific service, runtime, or
workspace state for their declared scope, including backend reachability,
managed local runtime, Host Bridge supervisor, synthesis progress/handshake, and
ACP workspace activity timers.

#### Scenario: Runtime heartbeat fires
- **WHEN** a runtime heartbeat or service supervisor tick fires
- **THEN** it SHALL NOT trigger dashboard task projection, full run-store reads,
  or workflow product/history scans.

### Requirement: Foreground bounded panel reads SHALL NOT weaken background scope rules

Foreground panel surfaces SHALL keep bounded lightweight run projection reads
limited to active foreground panel scope. Background refreshes, Dashboard home
refreshes, sidebar attention badges, and popovers SHALL remain on scoped summary
or active-only read paths.

#### Scenario: Dashboard background refresh does not use panel history reads

- **GIVEN** many retained completed SkillRunner runs exist
- **WHEN** Dashboard home, workspace attention, sidebar badges, or popovers
  refresh in the background
- **THEN** those refresh paths SHALL NOT invoke the SkillRunner foreground panel
  bounded history projection read
- **AND** they SHALL NOT read full SkillRunner run payloads.

#### Scenario: SkillRunner panel foreground may read bounded projections

- **GIVEN** the SkillRunner sidebar panel is the active foreground tab
- **WHEN** the panel builds its task list
- **THEN** it MAY read a bounded lightweight SkillRunner history projection
  window
- **AND** that read SHALL be scoped as a foreground panel read, not as a
  Dashboard or background refresh read.
