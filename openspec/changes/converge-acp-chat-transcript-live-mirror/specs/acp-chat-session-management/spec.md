## ADDED Requirements

### Requirement: ACP Chat session drawer spans all backends

ACP Chat SHALL show all known backend sessions in the session drawer regardless of the currently selected backend.

#### Scenario: Drawer uses all backend sessions

- **GIVEN** ACP Chat has visible sessions for more than one backend
- **WHEN** the Assistant Workspace projects the ACP Chat session drawer
- **THEN** the drawer SHALL group sessions from `backendChatSessions`
- **AND** it SHALL include sessions from inactive backends
- **AND** the banner conversation selector MAY remain scoped to the active backend.
