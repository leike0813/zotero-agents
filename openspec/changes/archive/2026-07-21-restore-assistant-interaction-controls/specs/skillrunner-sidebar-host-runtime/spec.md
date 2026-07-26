## MODIFIED Requirements

### Requirement: SkillRunner waiting-user replies are canonical and token-bound

The SkillRunner Assistant host SHALL prefer a valid `ui_hints.kind` over a degraded pending kind, bind controls to `pendingInteractionId`, and submit quick replies through `reply-run` with typed response values.

#### Scenario: Backend degrades an upload interaction kind

- **WHEN** pending kind is open text but valid UI hints declare `upload_files`
- **THEN** the Assistant interaction SHALL render the file declaration

### Requirement: SkillRunner file replies are capability-gated

The plugin SHALL treat file reply as unsupported unless handshake capability `skillrunner.interaction-files.v1` is present. It SHALL retain a text composer and show a localized unsupported state when disabled. When enabled, it SHALL enforce the lower of plugin and advertised limits and submit multipart metadata and repeated file parts through the management client.

#### Scenario: Existing backend requests files

- **WHEN** the handshake omits the file-reply capability
- **THEN** the Assistant SHALL display the requested slots and unsupported status
- **AND** SHALL NOT issue a multipart request

#### Scenario: Capable backend accepts files

- **WHEN** the capability is present and selected files fit effective limits
- **THEN** the client SHALL POST to `/v1/jobs/{requestId}/interaction/reply/files`
- **AND** metadata SHALL bind interaction id, idempotency key, slots, and file indexes
- **AND** the multipart body SHALL carry repeated `files` parts
