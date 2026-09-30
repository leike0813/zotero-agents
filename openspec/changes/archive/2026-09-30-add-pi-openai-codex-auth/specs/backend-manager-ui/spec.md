# Spec Delta

## ADDED Requirements

### Requirement: Built-in Agent page manages Codex account connection

The Built-in Agent page SHALL offer connect, cancel, reconnect, and local disconnect actions for an explicitly selected OpenAI Codex configuration. It SHALL show only a request-bound verification URL, one-time user code, masked account status, and redacted completion or failure state. Device codes SHALL remain transient and stale action results SHALL NOT replace a newer flow. While authorization is active, repeated connect/reconnect actions SHALL preserve the current request and code until explicit cancellation or completion.

#### Scenario: User connects a Codex account
- **WHEN** the user starts a Codex connection
- **THEN** the page displays the verification address and code for that request while its existing Backend Profile rows remain unchanged

#### Scenario: User disconnects locally
- **WHEN** the user disconnects the selected Codex credential
- **THEN** the local encrypted credential is removed, a later invocation fails closed, and other credentials remain available

#### Scenario: Connect is repeated during authorization
- **WHEN** an authorization request already owns a displayed device code and connect is triggered again
- **THEN** the current request and code remain unchanged and no new authorization request is sent

### Requirement: Built-in Agent page refreshes official Codex models

The page SHALL offer explicit model refresh for a saved connected Codex configuration and SHALL query its credential-bound catalog after login. Catalog query results SHALL be request-correlated; changing the selected credential SHALL NOT display another credential's discovered models.

#### Scenario: Connected account refreshes its models
- **WHEN** the user refreshes models for a connected Codex configuration
- **THEN** selectable models and configuration availability reflect the official discovered facts for that credential

#### Scenario: Host publishes an unchanged catalog snapshot
- **WHEN** the host publishes a configuration snapshot with the same catalog revision
- **THEN** current queried model candidates remain visible, while a changed provider or credential clears old candidates and rejects stale query results
