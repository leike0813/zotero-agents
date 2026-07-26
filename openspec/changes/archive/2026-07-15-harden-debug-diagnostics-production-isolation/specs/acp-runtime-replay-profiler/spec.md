## MODIFIED Requirements

### Requirement: Disabled and inactive replay adds no business hot-path work

The production Chat, Skills, and Workspace snapshot, render, publication, and timer paths SHALL retain their direct business behavior without Replay state, scheduler lookup, profile-context computation, Map lookup, synthetic helper, acknowledgement branch, additional allocation, or logical module initialization. Logical replay modules, synthetic control bodies, Replay production ports, and publication acknowledgement sidecars SHALL be elided when Debug or Replay Profiler source is disabled.

#### Scenario: Replay Profiler source is disabled

- **WHEN** a diagnostic bundle is built with Replay Profiler source disabled
- **THEN** logical scheduler code, synthetic helpers, Replay publication sidecars, and replay-only timer or acknowledgement markers SHALL contribute zero output bytes.

#### Scenario: Production plugin entry is bundled

- **WHEN** the real plugin entry is built with `__debug_mode__` set to false
- **THEN** Chat, Skills, and Workspace executable output SHALL contain no Replay state, profile-context lookup, synthetic seam, publication-drain identity, or rendered-acknowledgement branch
- **AND** Replay-exclusive modules SHALL contribute zero output bytes.

#### Scenario: Logical replay is inactive

- **WHEN** Replay Profiler is available but no logical run is active
- **THEN** business scheduling SHALL issue the same native timer calls and delays as before and SHALL invoke no logical port operation.

## ADDED Requirements

### Requirement: Replay publication acknowledgement is debug-exclusive

Replay SHALL publish target snapshots through a debug-exclusive sidecar and a narrow Workspace diagnostics port. The production Workspace core SHALL expose only an entirely elidable cold-path operation that obtains readiness, target child window, current revision, and forces publication for a specified tab; normal snapshot injection and child action handling SHALL contain no Replay acknowledgement state.

#### Scenario: Matching rendered publication completes

- **WHEN** the sidecar requests publication for a ready target tab and receives a message for that target snapshot with a newer revision
- **THEN** it SHALL wait until the target child's normal render listener has run and the next animation frame is reached before completing.

#### Scenario: Publication evidence does not match

- **WHEN** a message has the wrong tab, a stale revision, a replaced frame window, or an unrelated snapshot
- **THEN** the sidecar SHALL NOT acknowledge the publication.

#### Scenario: Publication wait terminates early

- **WHEN** timeout, abort, frame replacement, or child unload occurs before matching render confirmation
- **THEN** the sidecar SHALL reject with structured failure evidence and SHALL remove its listener and pending frame or timer work.

#### Scenario: Normal child rendering runs

- **WHEN** Chat, Skills, or SkillRunner child sidebars process ordinary snapshots
- **THEN** their render paths SHALL read no Replay drain property and SHALL send no Replay-specific child action.

