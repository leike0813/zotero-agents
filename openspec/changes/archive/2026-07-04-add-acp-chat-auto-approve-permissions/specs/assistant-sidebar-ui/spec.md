# assistant-sidebar-ui Delta

## ADDED Requirements

### Requirement: ACP Chat banner SHALL expose permission auto-approval

ACP Chat SHALL expose the conversation-scoped ACP permission auto-approval
setting as a banner action next to the connection, disconnection, and
authentication actions.

#### Scenario: Banner shows auto-approval toggle

- **WHEN** ACP Chat renders a conversation banner
- **THEN** the banner action row SHALL include an auto-approval toggle
- **AND** the toggle state SHALL reflect the active conversation's
  `autoApproveAcpPermissions` value.

#### Scenario: Toggle updates active conversation

- **WHEN** the user changes the ACP Chat auto-approval toggle
- **THEN** the action payload SHALL include the selected `backendId`,
  `conversationId`, and enabled state
- **AND** only that conversation's setting SHALL change.
