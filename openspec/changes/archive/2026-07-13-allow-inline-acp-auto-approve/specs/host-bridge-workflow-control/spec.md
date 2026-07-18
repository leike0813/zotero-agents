## ADDED Requirements

### Requirement: Request-level ACP permission policy
The Host Bridge workflow control surface SHALL accept `autoApproveAcpPermissions` as a boolean in `providerProfile.providerOptions` for a workflow request. The accepted value SHALL remain request-scoped, SHALL be normalized by the resolved provider, and SHALL NOT read, write, or merge persisted workflow settings.

#### Scenario: ACP workflow submission enables the policy

- **WHEN** a compatible ACP workflow is submitted with `providerProfile.providerOptions.autoApproveAcpPermissions` set to `true`
- **THEN** the prepared execution receives the normalized ACP provider option

#### Scenario: Omitted policy keeps the default

- **WHEN** a workflow request omits `autoApproveAcpPermissions` or supplies `false`
- **THEN** the ACP provider retains its default non-auto-approval behavior

#### Scenario: Unsafe provider profile fields remain rejected

- **WHEN** a provider profile contains credentials, endpoint values, or local-path values
- **THEN** Host Bridge rejects the request as an invalid workflow submit request
