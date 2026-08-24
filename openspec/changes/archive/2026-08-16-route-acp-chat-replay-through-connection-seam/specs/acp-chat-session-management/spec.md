## ADDED Requirements

### Requirement: ACP Chat SHALL support scoped adapter factories with backend admission

Session manager SHALL accept adapter factories scoped by backend id. A backend
with a registered scoped factory SHALL be admitted to ACP Chat connection and
backend selection without being written to the persistent backend registry.
Scoped factories SHALL take precedence over the default factory.

#### Scenario: Scoped factory backend connects through the normal path

- **WHEN** a scoped adapter factory is registered with a synthetic backend
- **AND** the active conversation connects through `connectAcpConversation`
- **THEN** session manager SHALL admit the registered backend
- **AND** SHALL build the adapter with the scoped factory
- **AND** SHALL bind adapter update, close, diagnostic, and permission listeners

#### Scenario: Unregistering a scoped factory removes admission

- **WHEN** the scoped factory is unregistered
- **THEN** the backend SHALL no longer be admitted
- **AND** later connects SHALL fall back to the default factory or normal
  backend resolution

### Requirement: ACP Chat SHALL handle user_message_chunk session updates

ACP Chat transcript handling SHALL append `user_message_chunk` updates as user
transcript items using the same streaming text rules as assistant chunks.

#### Scenario: Replayed user turn lands in the transcript

- **WHEN** an adapter emits a `user_message_chunk` session update
- **AND** the session id matches the active session
- **THEN** the Chat transcript SHALL append a user message item
- **AND** active assistant streaming text SHALL finalize at the user boundary
