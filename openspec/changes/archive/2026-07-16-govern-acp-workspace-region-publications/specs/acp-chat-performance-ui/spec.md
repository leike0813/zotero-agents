## ADDED Requirements

### Requirement: ACP Chat routes runtime changes to bounded regions

ACP Chat SHALL classify runtime UI changes as baseline/status, message-counts, transcript, plan, permission, reply/hint, or context/details. Message-count changes SHALL NOT be treated as metadata/status, and transcript append, streaming, loading, page, or revision changes SHALL request only transcript-region work.

Only backend or session scope changes, lifecycle structure, or a user-visible baseline status change SHALL request a baseline publication. ACP Chat SHALL NOT use a generalized reason fallback to build a full panel snapshot.

#### Scenario: Message count changes

- **WHEN** only ACP Chat semantic message counts change
- **THEN** baseline or full snapshot prepare, signature, and post counts SHALL remain zero
- **AND** any visible count update SHALL use its own bounded region publication.

#### Scenario: Transcript advances

- **WHEN** transcript content streams, appends, loads, changes page, or advances revision
- **THEN** ACP Chat SHALL publish only the selected owner's transcript region
- **AND** unrelated managed regions SHALL retain DOM identity.

#### Scenario: Structural status changes

- **WHEN** backend/session scope, lifecycle structure, or user-visible baseline status changes
- **THEN** ACP Chat MAY publish only the affected baseline or status region.

### Requirement: ACP Chat region publication preserves interaction behavior

Region publication SHALL preserve existing live, boundary, and silent projection; tool update coalescing; plan and permission behavior; cancel and resume controls; and owner switching. Side-channel message-count or transcript activity SHALL NOT split assistant text segments or rebuild interaction regions whose visible DTO is unchanged.

#### Scenario: Tool update during streaming

- **WHEN** a tool update or usage side-channel arrives during an assistant text segment
- **THEN** the assistant segment SHALL remain continuous
- **AND** unchanged plan, permission, reply, and drawer regions SHALL not rebuild.

#### Scenario: Permission is requested

- **WHEN** the current owner requests permission
- **THEN** the permission region SHALL publish immediately
- **AND** transcript and unrelated managed regions SHALL retain identity unless their own DTO changes.
