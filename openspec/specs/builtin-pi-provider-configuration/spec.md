# builtin-pi-provider-configuration Specification

## Purpose

Provides profile-scoped, browser-compatible model catalog, provider configuration, credential, and selection behavior for future Pi Conversation and Pi Skill Run turns.

## Requirements

### Requirement: Static catalog and declarative overlay remain safe offline

The system SHALL expose normalized bundled model metadata and a sanitized, read-only local overlay. It SHALL preserve the last valid sanitized overlay when refresh fails, SHALL NOT silently redirect bundled model identities, and SHALL NOT execute or import credential-bearing overlay content.

#### Scenario: Invalid overlay follows a valid refresh
- **WHEN** a valid overlay is cached and a later refresh contains a secret, executable field, or bundled identity conflict
- **THEN** the refresh fails, the previous sanitized cache remains available, and no network or command is invoked

#### Scenario: Unknown model has no inferred capability
- **WHEN** an unknown model is declared without a capability
- **THEN** that capability is absent from its normalized metadata

### Requirement: Pi configurations and defaults are independent of Backend Profiles

The system SHALL persist multiple profile-scoped Pi configurations with explicit model, auth variant, credential reference, enabled state, and scoped defaults. Selection precedence SHALL be explicit run override, saved owner selection, kind default, global default, then catalog default. Incomplete or disabled configurations SHALL NOT be runnable or accepted as defaults.

#### Scenario: Multiple configurations coexist
- **WHEN** one Pi configuration is edited or disabled
- **THEN** other Pi configurations and existing Backend Profiles remain unchanged

#### Scenario: Explicit selection wins
- **WHEN** all default levels and an explicit override are present
- **THEN** the explicit override is selected for the new turn only

### Requirement: Frozen selection contains no credential material

Each selected turn SHALL receive an immutable snapshot of configuration identity, provider and model, auth variant, reasoning level, catalog revision, runtime and adapter versions, and resolved policy. Reasoning values SHALL be `off`, `minimal`, `low`, `medium`, `high`, `xhigh`, or `max`; an unsupported explicit value SHALL fail locally.

#### Scenario: Configuration changes after selection
- **WHEN** a configuration or default changes after a turn selection is created
- **THEN** the existing snapshot remains unchanged and contains no secret, header, or native SDK object

### Requirement: Profile credentials fail closed

The system SHALL retain multiple labeled API-key or OpenAI Codex credential records in versioned encrypted envelopes, expose only redacted metadata to UI, and resolve plaintext only for an active caller. Missing, corrupt, or cryptographically inaccessible credentials SHALL fail closed. Deleting a configuration SHALL NOT implicitly delete its credential, and deleting a credential SHALL NOT silently select another.

#### Scenario: Encrypted record cannot be decrypted
- **WHEN** a selected credential envelope is damaged or its profile key is missing
- **THEN** credential resolution fails without publishing plaintext or falling back to another credential

### Requirement: Custom endpoint boundary is explicit

Custom OpenAI-compatible endpoints SHALL declare `openai-responses` or `openai-completions`. Remote endpoints SHALL use HTTPS; local network endpoints SHALL be marked for a later Local Network capability preflight. Configuration loading SHALL NOT perform implicit network discovery.

#### Scenario: Remote insecure endpoint
- **WHEN** a user saves a non-local HTTP custom endpoint
- **THEN** the configuration is rejected before persistence

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

### Requirement: Optional Conversation auxiliary model selection

Provider configuration SHALL support one optional auxiliary model selection referencing an existing runnable configuration. It SHALL be used only for Pi Conversation title generation, carry no separate credentials, and be invalidated when its referenced configuration becomes unavailable. Absence SHALL use deterministic titles without an auxiliary Provider call.

#### Scenario: Auxiliary configuration is removed

- **WHEN** its referenced Provider configuration is deleted or made unavailable
- **THEN** new title tasks use deterministic fallback and existing main Conversation model selection remains independent.
