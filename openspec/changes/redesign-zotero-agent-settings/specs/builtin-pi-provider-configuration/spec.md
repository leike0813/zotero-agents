## MODIFIED Requirements

### Requirement: Pi configurations and defaults are independent of Backend Profiles

The system SHALL persist profile-scoped model connections and separately identified model configurations. A connection SHALL own provider parameters and authentication; multiple model configurations SHALL reference it without duplicate key entry. Defaults SHALL reference model configurations. Precedence SHALL be explicit run override, saved owner selection, kind default, then general default. Missing selection SHALL require explicit configuration; incomplete or disabled selections SHALL NOT run or become new defaults. Configuration edits SHALL preserve unrelated Pi state and Backend Profiles.

#### Scenario: Multiple configurations coexist

- **WHEN** one model configuration is edited or disabled
- **THEN** other cards and Backend Profiles remain unchanged, and that card's existing default reference remains with an availability reason

#### Scenario: Explicit selection wins

- **WHEN** default levels and an explicit override are present
- **THEN** the explicit override is selected for the new turn only

#### Scenario: No default is configured

- **WHEN** no explicit, owner, kind or general selection exists
- **THEN** configuration is required without choosing a catalog default or the first available model

#### Scenario: One authenticated connection has two models

- **WHEN** two model configurations reference the same connection
- **THEN** target/authentication resolution is shared appropriately while model options, target-specific facts and default purposes remain independent

### Requirement: Optional Conversation auxiliary model selection

Provider configuration SHALL support one optional auxiliary selection referencing an existing model configuration, not a separate connection or credential. It SHALL be used only for Pi Conversation title generation. Unavailable referenced models SHALL retain their selection with an availability reason and SHALL NOT run; absent or unavailable selection SHALL use deterministic titles without an auxiliary Provider call. Explicit removal of the referenced model SHALL clear the title purpose.

#### Scenario: Auxiliary configuration is removed

- **WHEN** its referenced model configuration is deleted
- **THEN** title use is disabled, new titles use deterministic fallback and existing main Conversation model selection remains independent

#### Scenario: Auxiliary connection loses authentication

- **WHEN** the selected title model cannot run because its connection needs authentication
- **THEN** its saved reference remains, provider-based title calls are blocked and main model selection is unchanged

## ADDED Requirements

### Requirement: Connection operations preserve explicit bindings and references

Connection changes SHALL retain model cards and default references while revalidating their target/authentication facts. Rename SHALL preserve applicable test evidence. Target, credential identity or calling-option changes SHALL invalidate affected evidence. A card removal SHALL clear only its purposes; explicit connection removal SHALL remove its cards and affected purposes, retain independent ChatGPT registrations and clear API-key credentials only when no references remain.

#### Scenario: Connection credential changes

- **WHEN** a user saves a replacement key or registration
- **THEN** cards/default references remain with current admission state and old-identity tests no longer establish completion

#### Scenario: Removing a shared connection

- **WHEN** a confirmed connection removal affects a key still referenced elsewhere
- **THEN** that key remains available to other references and their configuration/history is unchanged

### Requirement: Model tests prove only the captured model invocation

Model tests SHALL require an explicit user action against saved complete configuration and disclose possible usage. Each SHALL make one short tool-free inference with no automatic retry, correlate connection/model/request/target/options/authentication identity and accept only actual validated completion. A test SHALL NOT change defaults, automatically enable sources or resume tasks; quota recovery SHALL reuse existing registration admission.

#### Scenario: Connection identity changes before test completion

- **WHEN** a replacement credential or target is saved while an earlier probe is outstanding
- **THEN** the earlier result cannot certify the new model binding or remove its registration pause

#### Scenario: One model completes a test

- **WHEN** its actual response completes and validates
- **THEN** only that model's applicable result becomes completed, without certifying other models on the connection
