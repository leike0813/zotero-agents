## ADDED Requirements

### Requirement: ACP Chat child snapshots deliver a selected transcript page for virtualized rendering

ACP Chat child snapshots MUST deliver structural panel data plus a selected
durable transcript page instead of full transcript content rows when transcript
pagination virtualization is enabled.

#### Scenario: Virtualized ACP Chat snapshot includes selected page

- **WHEN** ACP Chat is rendered with transcript pagination virtualization
  enabled
- **THEN** the host snapshot SHALL use structural transcript items for panel
  chrome
- **AND** it SHALL include `selectedTranscriptPage` for the active
  backend/conversation scope
- **AND** it SHALL mark transcript pagination virtualization as enabled.

#### Scenario: ACP Chat child rejects wrong-scope pages

- **WHEN** the ACP Chat child receives a selected transcript page whose
  backend/conversation scope does not match the active conversation
- **THEN** it SHALL NOT render that page's transcript rows.

#### Scenario: ACP Chat child requests additional pages with scope

- **WHEN** the shared transcript renderer requests another ACP Chat page
- **THEN** the child SHALL send `load-transcript-page` with backend id,
  conversation id, request id, cursor, and limit
- **AND** the host SHALL ignore requests outside the current active
  backend/conversation scope.

#### Scenario: Full render fallback remains available

- **WHEN** transcript pagination virtualization is disabled
- **THEN** ACP Chat SHALL keep the existing eager/full transcript render
  behavior.
