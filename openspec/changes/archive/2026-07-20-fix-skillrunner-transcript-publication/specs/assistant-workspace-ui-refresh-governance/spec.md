## MODIFIED Requirements

### Requirement: Assistant Workspace UI publish events are governed

Assistant Workspace panels SHALL classify runtime refreshes as `critical`,
`boundary`, `live`, or `background` and SHALL apply the global `live`,
`boundary`, or `silent` execution display mode before publishing.

Scheduling urgency and transcript eligibility SHALL be additive. A critical event SHALL publish immediately, but in live mode it SHALL NOT suppress changed UI-visible transcript content or cancel a queued live transcript without publishing equivalent content. Background events SHALL not publish. In `live`, text/thought live events SHALL publish naturally and metadata live events SHALL use the shared cadence. In `boundary`, live text SHALL remain unpublished until a complete semantic message or other existing boundary. In `silent`, ordinary live and boundary events SHALL not publish transcript content; only a semantic-message count change or critical interaction/terminal state SHALL publish.

#### Scenario: live text advances naturally

- **GIVEN** execution display mode is `live`
- **WHEN** a panel receives text or thought chunks
- **THEN** the UI-visible transcript advances without waiting for metadata cadence.

#### Scenario: critical refresh retains concurrent live transcript

- **GIVEN** execution display mode is `live`
- **AND** a selected owner's UI-visible transcript changed
- **WHEN** a critical lifecycle or metadata refresh publishes before a queued live refresh
- **THEN** the critical snapshot SHALL include the changed transcript
- **AND** the transcript revision SHALL advance exactly once for that published mirror state.

#### Scenario: boundary mode preserves message publication

- **GIVEN** execution display mode is `boundary`
- **WHEN** partial text is followed by a complete semantic message boundary
- **THEN** partial text remains hidden until the boundary
- **AND** the completed message publishes immediately.

#### Scenario: silent chunks publish only first-segment progress

- **GIVEN** execution display mode is `silent`
- **WHEN** many chunks form one assistant semantic message
- **THEN** only the first chunk changes the visible message count
- **AND** later chunks publish no snapshot.

#### Scenario: silent critical state remains immediate

- **GIVEN** execution display mode is `silent`
- **WHEN** a run requires permission, authentication, or user input, or becomes terminal
- **THEN** that critical state publishes immediately.
