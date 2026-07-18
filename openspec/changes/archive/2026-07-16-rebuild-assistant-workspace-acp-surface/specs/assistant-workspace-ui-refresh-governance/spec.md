## ADDED Requirements

### Requirement: ACP Workspace surfaces use one owner-scoped runtime

ACP Chat and ACP Skills SHALL register source adapters with one shared Workspace surface runtime. The runtime SHALL own initialization, owner-scoped scheduling, region signatures, publication lifecycle, rebase, and owner cleanup. Sidebar and source adapters SHALL NOT implement a second publication scheduler or DTO conversion layer.

#### Scenario: Active owner changes

- **WHEN** Chat conversation or Skills run selection changes
- **THEN** the shared runtime clears the prior owner's pending lanes and publishes the new owner loading-first
- **AND** no global single-slot timer can overwrite another owner or region.

#### Scenario: Workspace target deactivates

- **WHEN** the active Assistant Workspace target closes or moves to another host target
- **THEN** the shared runtime terminates every pending publication lifecycle as superseded and clears queued owner work
- **AND** reopening the same child document continues monotonic region and delivery revisions without inheriting an undeliverable identity.

### Requirement: ACP initialization is typed and region-scoped

ACP Chat and ACP Skills initialization and activation SHALL publish an ordered set of canonical region publications and SHALL NOT build a complete panel or frontend snapshot. Transcript loading SHALL precede its ready indexed page.

#### Scenario: Workspace opens for the first time

- **WHEN** the active ACP child document becomes ready
- **THEN** it receives owner-first loading state followed by the current typed regions and ready transcript page
- **AND** transcript visibility does not depend on another session or tab switch.

### Requirement: Owner navigation is not lifecycle status

Backend/conversation and run-list/selection changes SHALL use the canonical owner-navigation region. Baseline status SHALL contain only current owner lifecycle status.

#### Scenario: Conversation list changes

- **WHEN** Chat creates, renames, archives, or selects a conversation
- **THEN** owner navigation updates without rebuilding transcript or masquerading as baseline status.
