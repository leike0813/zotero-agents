# acp-chat-session-management Delta

## ADDED Requirements

### Requirement: ACP Chat conversations SHALL optionally auto-approve ACP tool permissions

ACP Chat conversations SHALL persist an `autoApproveAcpPermissions` setting.
The setting SHALL default to disabled for new conversations and SHALL apply only
to the conversation that owns the active permission request.

#### Scenario: ACP allow-once option is selected

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with `source: "acp-tool-call"` and an
  ACP-standard `kind: "allow_once"` option
- **THEN** ACP Chat SHALL resolve the permission with that option
- **AND** it SHALL NOT publish `pendingPermissionRequest` for that request.

#### Scenario: Allow once is preferred over allow always

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with both ACP-standard
  `kind: "allow_always"` and `kind: "allow_once"` options
- **THEN** ACP Chat SHALL resolve the permission with the first `allow_once`
  option.

#### Scenario: Allow always option is selected when no allow once exists

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an ACP-standard
  `kind: "allow_always"` option and no `allow_once` option
- **THEN** ACP Chat SHALL resolve the permission with the first `allow_always`
  option.

#### Scenario: Non-standard requests remain manual

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission without an ACP-standard
  `kind: "allow_once"` or `kind: "allow_always"` option
- **THEN** ACP Chat SHALL keep the permission pending for manual user action.

#### Scenario: Other permission channels are unaffected

- **GIVEN** an ACP Chat conversation has `autoApproveAcpPermissions: true`
- **WHEN** a permission request source is not `acp-tool-call`
- **THEN** ACP Chat SHALL NOT auto-approve that request.

#### Scenario: Conversation scope is preserved

- **GIVEN** one ACP Chat conversation enables `autoApproveAcpPermissions`
- **WHEN** the user switches to another conversation for the same backend
- **THEN** the second conversation SHALL use its own persisted setting.
