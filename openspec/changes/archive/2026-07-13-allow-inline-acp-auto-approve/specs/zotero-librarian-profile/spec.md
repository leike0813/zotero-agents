## ADDED Requirements

### Requirement: Request-level provider profile guidance
The Zotero Librarian profile SHALL distinguish a provider, a configured backend, and an external-agent-owned request-level provider profile. Its workflow guidance SHALL describe `autoApproveAcpPermissions` as an ACP-only provider option supplied during submission, not as Zotero write approval, a direct pending-permission action, or a Host-persisted setting.

#### Scenario: An agent selects a configured ACP policy

- **WHEN** an external workflow preset supplies an ACP backend and `autoApproveAcpPermissions: true` in its provider profile
- **THEN** the profile guidance directs the agent to submit that profile without treating it as a persisted Host Bridge configuration

