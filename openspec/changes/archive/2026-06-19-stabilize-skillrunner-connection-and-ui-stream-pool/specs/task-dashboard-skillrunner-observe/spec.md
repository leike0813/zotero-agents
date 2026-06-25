## MODIFIED Requirements

### Requirement: SkillRunner stream lifecycle MUST be bounded by state and UI stream ownership

Plugin MUST minimize long-lived stream connections while preserving stable
RunDialog switching for recently focused runs.

#### Scenario: UI foreground stream pool ownership

- **WHEN** run workspace selection moves between SkillRunner runs on the same
  backend
- **THEN** the selected running run SHALL have a foreground chat stream
- **AND** the most recently selected previous running run MAY keep a warm
  foreground chat stream
- **AND** the backend SHALL keep at most two active UI foreground chat streams

#### Scenario: third selected run evicts least-recently focused stream

- **WHEN** two runs on a backend already hold warm foreground chat streams
- **AND** a third running run on the same backend becomes selected
- **THEN** plugin SHALL abort the least-recently focused existing stream
- **AND** plugin SHALL start or reuse the selected run stream

#### Scenario: two-run switching reuses warm streams

- **WHEN** the user switches repeatedly between the same two running runs on one
  backend
- **THEN** plugin SHALL reuse the existing streams
- **AND** switching SHALL NOT repeatedly disconnect and reconnect those streams

#### Scenario: state boundaries release stream sessions

- **WHEN** a stream-owned run becomes waiting, terminal, backend-gated, or the
  workspace closes
- **THEN** plugin SHALL abort that run's foreground stream
- **AND** stream disconnect SHALL NOT mark the backend unreachable

## ADDED Requirements

### Requirement: Foreground chat stream MUST be isolated from background session sync

RunDialog chat stream frames SHALL update the selected or warm run session
without starting background event-session sync.

#### Scenario: interaction event does not start background sync

- **WHEN** a foreground `/chat` stream emits an interaction or auth event
- **THEN** RunDialog MAY refresh pending/auth state for that run
- **AND** it SHALL NOT call the background session sync entrypoint for that
  event

#### Scenario: clean stream close reconnects lightly

- **WHEN** a foreground chat stream ends without a terminal run error
- **THEN** RunDialog SHALL use reconnect backoff
- **AND** it SHALL NOT immediately run a full metadata, pending, and history
  refresh chain unless a cursor gap, stream error, or explicit refresh requires
  catch-up
