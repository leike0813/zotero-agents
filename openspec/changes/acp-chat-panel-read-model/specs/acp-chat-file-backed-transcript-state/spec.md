## ADDED Requirements

### Requirement: ACP Chat panel snapshots are prepared by a no-refresh read-model

ACP Chat panel publication MUST prepare child snapshots through a selected
conversation read-model that does not refresh backend registries or hydrate full
transcript content.

#### Scenario: Ordinary panel snapshot does not refresh backends

- **WHEN** the assistant workspace posts an ordinary ACP Chat child snapshot
- **THEN** it SHALL call the ACP Chat panel read-model
- **AND** it SHALL NOT call backend refresh from that snapshot path.

#### Scenario: Virtualized panel snapshot includes selected transcript page

- **WHEN** transcript pagination virtualization is enabled for ACP Chat
- **THEN** the panel read-model SHALL return structural transcript items
- **AND** it SHALL include the selected durable transcript page when the page
  scope matches the active backend/conversation.

#### Scenario: Transcript page read failure keeps panel chrome

- **WHEN** a selected transcript page cannot be read
- **THEN** the panel read-model SHALL still return ACP Chat toolbar, backend,
  session, status, and frontend metadata
- **AND** it SHALL omit `selectedTranscriptPage` for that snapshot.

### Requirement: ACP Chat panel publication is driven by typed filtered changes

ACP Chat panel publication MUST use typed change notifications with host-side
filtering instead of untyped high-frequency frontend snapshot reposts.

#### Scenario: Active chrome changes refresh the panel

- **WHEN** the active ACP Chat scope, status, permission, session list,
  runtime options, backend metadata, or transcript boundary changes
- **THEN** the assistant workspace SHALL post a no-refresh ACP Chat panel
  snapshot.

#### Scenario: Pure append changes do not rebuild virtualized panel snapshots

- **WHEN** transcript pagination virtualization is enabled
- **AND** the only ACP Chat panel change is an active transcript append
- **THEN** the assistant workspace SHALL NOT rebuild the full ACP Chat panel
  snapshot.

#### Scenario: Background transcript-only changes do not refresh the active panel

- **WHEN** a background ACP Chat conversation emits transcript-only changes
- **THEN** the assistant workspace SHALL NOT refresh the active ACP Chat child
  snapshot.

#### Scenario: Explicit backend refresh settles into one no-refresh repost

- **WHEN** ACP Chat backend refresh completes at an explicit lifecycle boundary
- **THEN** it MAY emit a typed backend/global panel change
- **AND** the resulting assistant workspace snapshot repost SHALL use the
  no-refresh ACP Chat panel read-model.

#### Scenario: Failed delivery models remain absent

- **WHEN** ACP Chat panel publication is implemented
- **THEN** it SHALL NOT introduce `notifyFrontend: false` delivery
- **AND** it SHALL NOT introduce listener item-mode maps or session index
  caches.
