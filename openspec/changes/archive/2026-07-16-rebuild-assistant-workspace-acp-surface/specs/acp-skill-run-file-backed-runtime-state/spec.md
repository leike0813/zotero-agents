## ADDED Requirements

### Requirement: Skills publication count is display-projected

ACP Skills SHALL keep raw run transcript counts inside its domain store and SHALL expose `totalVisibleItemCount` to Workspace only through the selected display projection. Snapshot and delta metadata SHALL use the same projected count.

#### Scenario: Skills holds boundary text

- **WHEN** a Skills assistant chunk is stored but not yet UI-visible
- **THEN** the Workspace visible count remains unchanged until release.

### Requirement: Skills ordinary progress uses shared message counts

ACP Skills non-silent tool and progress changes SHALL publish the same canonical message-count region semantics as ACP Chat where applicable. Progress SHALL NOT be restricted to the silent-mode path.

#### Scenario: Ordinary tool boundary advances progress

- **WHEN** a non-silent Skills run accepts a tool boundary that changes semantic progress
- **THEN** the adapter emits transcript and message-count domain changes through the shared runtime
- **AND** neither change materializes a full run panel.
