## MODIFIED Requirements

### Requirement: ACP Chat child snapshots deliver a selected transcript page for virtualized rendering

ACP Chat child snapshots MUST deliver structural panel data plus a selected
transcript page from the selected conversation read-model instead of full
transcript content rows when transcript pagination virtualization is enabled.

#### Scenario: Virtualized ACP Chat snapshot includes selected mirror page

- **WHEN** ACP Chat is rendered with transcript pagination virtualization
  enabled
- **AND** the active conversation transcript mirror is ready
- **THEN** the host snapshot SHALL use structural transcript items for panel
  chrome
- **AND** it SHALL include `selectedTranscriptPage` for the active
  backend/conversation scope
- **AND** that page SHALL be read from the hydrated conversation mirror.

#### Scenario: Loading ACP Chat transcript omits selected page

- **WHEN** ACP Chat is rendered with transcript pagination virtualization
  enabled
- **AND** the active conversation transcript mirror is loading or failed
- **THEN** the host snapshot SHALL include the selected transcript state
- **AND** it SHALL omit `selectedTranscriptPage`
- **AND** it SHALL NOT read a durable transcript page as a panel fallback.

#### Scenario: ACP Chat selected page respects streaming render preference

- **WHEN** the active conversation mirror contains streaming message or thought
  rows
- **AND** Assistant Workspace streaming render is disabled
- **THEN** ACP Chat selected transcript pages SHALL omit those streaming rows
- **AND** structural transcript rows SHALL remain eligible for display.

#### Scenario: ACP Chat append refresh respects streaming render preference

- **WHEN** an active ACP Chat `transcript-append` change is emitted
- **THEN** the workspace host SHALL refresh the ACP Chat child snapshot only
  when streaming render is enabled
- **AND** `transcript-boundary` changes SHALL refresh the selected snapshot
  regardless of the streaming render preference.

### Requirement: ACP Chat panel snapshots are prepared by a no-refresh read-model

ACP Chat panel publication MUST prepare child snapshots through a selected
conversation read-model that does not refresh backend registries or hydrate full
transcript content synchronously into the panel payload.

#### Scenario: Mirror page read failure keeps panel chrome

- **WHEN** a selected transcript mirror page cannot be read
- **THEN** the panel read-model SHALL still return ACP Chat toolbar, backend,
  session, status, and frontend metadata
- **AND** it SHALL omit `selectedTranscriptPage` for that snapshot.
