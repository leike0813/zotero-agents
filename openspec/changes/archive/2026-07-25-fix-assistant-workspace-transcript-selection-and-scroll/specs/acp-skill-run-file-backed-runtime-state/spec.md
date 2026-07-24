## MODIFIED Requirements

### Requirement: Skills publication count is display-projected

ACP Skills SHALL keep raw run transcript counts inside its domain store and SHALL expose `totalVisibleItemCount` to Workspace only through the selected display projection. Snapshot and delta metadata SHALL use the same projected count. Cold indexed transcript store reads SHALL apply the same UI-visibility projection as mirror reads before a page is published, so display-hidden streaming items never enter a Workspace page or its count.

#### Scenario: Skills holds boundary text

- **WHEN** a Skills assistant chunk is stored but not yet UI-visible
- **THEN** the Workspace visible count remains unchanged until release.

#### Scenario: Cold store read in boundary mode hides streaming items

- **GIVEN** a Skills run has a durable transcript whose full mirror is not loaded
- **AND** the transcript contains an in-flight streaming assistant message
- **WHEN** the Workspace reads the run's transcript page in boundary display mode
- **THEN** the streaming message SHALL NOT appear in the published page items
- **AND** `totalVisibleItemCount` SHALL count only UI-visible items
- **AND** a live-mode read of the same transcript SHALL include the streaming message.
