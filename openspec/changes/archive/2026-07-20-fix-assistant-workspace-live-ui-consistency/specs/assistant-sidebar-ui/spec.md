## ADDED Requirements

### Requirement: ACP Chat runtime options remain visible while connected

ACP Chat SHALL project the complete current mode, model, and reasoning option groups whenever the selected conversation is connected. Prompting, permission wait, and requested interruption SHALL NOT erase the current values or option domains. Mode SHALL remain editable in those connected states, while model and reasoning SHALL remain disabled until model configuration is editable.

#### Scenario: Prompting preserves current runtime values

- **GIVEN** an ACP Chat conversation is connected with selected mode, model, and reasoning values
- **WHEN** the conversation enters prompting, permission wait, or requested interruption
- **THEN** all three selectors SHALL continue to display their current values and options
- **AND** mode SHALL remain enabled
- **AND** model and reasoning SHALL be disabled.

#### Scenario: Disconnected conversation has no editable runtime values

- **WHEN** the selected ACP Chat conversation is disconnected or has no owner
- **THEN** mode, model, and reasoning SHALL be disabled
- **AND** the UI SHALL NOT present cached values as live editable configuration.

## MODIFIED Requirements

### Requirement: ACP Chat banner SHALL expose permission auto-approval

ACP Chat SHALL expose the conversation-scoped ACP permission auto-approval setting as a banner action next to the connection, disconnection, and authentication actions.

#### Scenario: Banner shows auto-approval toggle

- **WHEN** ACP Chat renders a conversation banner
- **THEN** the banner action row SHALL include an auto-approval toggle
- **AND** the toggle state SHALL reflect the active conversation's `autoApproveAcpPermissions` value.

#### Scenario: Toggle updates active conversation

- **WHEN** the user changes the ACP Chat auto-approval toggle
- **THEN** the action owner envelope SHALL identify the selected conversation
- **AND** the action payload SHALL include only the enabled state
- **AND** only that conversation's setting SHALL change.

#### Scenario: Successful toggle converges the current banner immediately

- **WHEN** the active conversation's auto-approval action succeeds
- **THEN** the current banner action and state label SHALL reflect the persisted value in the same publication cycle
- **AND** no owner switch or tab switch SHALL be required
- **AND** transcript and unrelated managed regions SHALL retain identity.
