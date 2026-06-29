## MODIFIED Requirements

### Requirement: ACP Skill runs SHALL optionally auto-approve ACP tool permissions

ACP Skill runs SHALL automatically resolve ACP backend tool-call permission
requests only when the run's frozen ACP provider options enable permission
auto-approval. Auto-approved ACP tool-call permission requests SHALL preserve
the normal permission audit trail without publishing a pending user-action
state.

#### Scenario: Approve option is selected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an `approve` option
- **THEN** the run SHALL resolve the permission with that option
- **AND** the transcript SHALL retain the normal permission audit item
- **AND** the run SHALL NOT publish `pendingPermission` for that request
- **AND** the workspace UI SHALL NOT emit a waiting-user toast for that
  permission request.

#### Scenario: Allow option is selected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission with an allow-style option
- **THEN** the run SHALL resolve the permission with the first compatible
  allow-style option
- **AND** the run SHALL NOT publish `pendingPermission` for that request.

#### Scenario: Non-allow requests remain manual

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** the backend requests permission without any approve or allow-style
  option
- **THEN** the run SHALL keep the permission pending for manual user action.

#### Scenario: Other permission channels are unaffected

- **GIVEN** an ACP Skill run has `autoApproveAcpPermissions: true`
- **WHEN** a permission request source is not `acp-tool-call`
- **THEN** the run SHALL NOT auto-approve that request.
