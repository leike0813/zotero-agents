# Spec Delta

## ADDED Requirements

### Requirement: Codex model availability uses official credential-bound discovery

The system SHALL discover visible Codex models from the official account endpoint only after user-initiated login or model refresh. It SHALL resolve only the selected encrypted credential, normalize bounded metadata, and scope discovered facts and selection to that credential. Failed discovery SHALL preserve the previous valid catalog; logout or a changed credential revision SHALL prevent a late result from restoring availability. Configuration loading SHALL remain offline. Missing capabilities SHALL remain unknown; a known context window and text input MAY admit native Codex execution when the endpoint omits a separate output ceiling.

#### Scenario: Official account exposes a new model
- **WHEN** discovery returns a visible model absent from the bundled catalog for the selected credential
- **THEN** that credential's configuration may select it using the discovered context and reasoning facts without inferring missing capabilities

#### Scenario: Another credential selects the model
- **WHEN** a configuration uses a credential different from the discovery credential
- **THEN** those discovered model facts do not establish its availability

#### Scenario: Discovery completes after logout
- **WHEN** the selected credential is deleted or its revision changes before discovery completes
- **THEN** the result is rejected and cannot restore model availability
