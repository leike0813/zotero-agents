## MODIFIED Requirements

### Requirement: ACP visual alignment preserves semantic presentation

The shared ACP panel SHALL render service availability as service indicators,
numeric usage as a gauge, and recovery/workspace metadata in detail sections.
It SHALL NOT convert arbitrary presentation fields into LED indicators.
The ACP Chat and ACP Skills usage gauge SHALL remain mounted and display `N/A`
when the selected owner has no usage data.

#### Scenario: A run reports usage and workspace metadata

- **WHEN** ACP Skills projects the selected owner
- **THEN** usage appears in the shared gauge
- **AND** workspace metadata appears in details without creating LEDs.

#### Scenario: A selected owner has no usage data

- **WHEN** ACP Chat or ACP Skills projects a selected owner without usage
- **THEN** the reply footer keeps the usage gauge mounted
- **AND** the gauge displays `N/A`.

### Requirement: ACP drawers target the selected item

Chat session and Skills task drawer cards, selectors, and item actions SHALL
remain interactive during live updates and SHALL target the item the user
activated.

#### Scenario: User selects a historical Chat session

- **WHEN** the session card is clicked
- **THEN** the Host selects that session's canonical owner
- **AND** owner-first loading is rendered before its indexed transcript page.

### Requirement: Assistant panel layout remains mounted without an owner

The shared ACP main and conversation layout containers SHALL remain mounted
with transcript and composer through empty selection, loading, ready, and owner
switch.
The empty selection state SHALL be rendered inside the conversation region.

#### Scenario: ACP Skills has no selected task

- **WHEN** the empty state is visible
- **THEN** transcript and reply geometry remains stable
- **AND** selecting a task does not replace the main layout container.
