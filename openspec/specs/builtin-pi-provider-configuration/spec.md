# builtin-pi-provider-configuration Specification

## Purpose

Provides profile-scoped, browser-compatible model catalog, provider configuration, credential, and selection behavior for future Pi Conversation and Pi Skill Run turns.

## Requirements

### Requirement: Static catalog and declarative overlay remain safe offline

The system SHALL use a pinned official Pi seed and the last compatible public snapshot offline. A sanitized read-only overlay SHALL supplement applicable facts without changing saved connections, widening known hard limits, enabling unsupported execution or restoring retired models. Failed or missing overlay reads SHALL preserve adopted declarations until explicit removal. No credential-bearing or executable declaration SHALL be adopted.

#### Scenario: Invalid overlay follows a valid refresh
- **WHEN** an adopted overlay is followed by a secret, executable field, duplicate identity or illegal override
- **THEN** the refresh fails and the previous declarations and effective directory remain available

#### Scenario: Unknown model has no inferred capability
- **WHEN** a model lacks a necessary capability
- **THEN** that fact remains unknown and cannot establish execution requiring that capability

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

### Requirement: Frozen selection contains no credential material

Each turn SHALL receive an immutable target/auth-applicable metadata snapshot including safe binding identity, source/schema/catalog and execution versions, reasoning mapping, capabilities, constraints, compat and pricing. Unsupported explicit reasoning SHALL fail locally. Canonical snapshots SHALL contain no secret, authorization header, SDK object or private absolute path.

#### Scenario: Configuration changes after selection
- **WHEN** configuration, defaults or catalog facts change after selection
- **THEN** the active turn retains its frozen facts and future turns independently validate their actual selection

### Requirement: Profile credentials fail closed

The system SHALL retain multiple labeled API-key or verified ChatGPT credential records in versioned encrypted envelopes, expose only redacted metadata to UI, and resolve plaintext only for an active caller. Missing, corrupt, or cryptographically inaccessible credentials SHALL fail closed. Deleting a configuration SHALL NOT implicitly delete its credential, and deleting a credential SHALL NOT silently select another.

#### Scenario: Encrypted record cannot be decrypted
- **WHEN** a selected credential envelope is damaged or its profile key is missing
- **THEN** credential resolution fails without publishing plaintext or falling back to another credential

### Requirement: Custom endpoint boundary is explicit

Custom OpenAI-compatible endpoints SHALL declare `openai-responses` or `openai-completions`. Remote endpoints SHALL use HTTPS; local network endpoints SHALL be marked for a later Local Network capability preflight. Configuration loading SHALL NOT perform implicit network discovery.

#### Scenario: Remote insecure endpoint
- **WHEN** a user saves a non-local HTTP custom endpoint
- **THEN** the configuration is rejected before persistence

### Requirement: ChatGPT visibility and applicable facts are registration bound

The system SHALL discover the selected ChatGPT registration through the official models API after login, explicit refresh or user account switch. It SHALL preserve listed order/display names/slugs, isolate cached identity and reject stale commits. Visible models SHALL require reliable SIWC-applicable context for execution; missing output/capabilities/pricing remain unknown without same-name public API inheritance.

#### Scenario: User switches registration

- **WHEN** a user selects another saved registration
- **THEN** its own cache projects first and only its discovery refreshes

#### Scenario: Unknown limits

- **WHEN** a listed model has no reliable SIWC context limit
- **THEN** it is visible but cannot invoke

#### Scenario: Valid empty discovery

- **WHEN** a valid selected-account response has no listed models
- **THEN** its visibility becomes empty without another account's recommendations

### Requirement: Optional Conversation auxiliary model selection

Provider configuration SHALL support one optional auxiliary selection referencing an existing model configuration, not a separate connection or credential. It SHALL be used only for Pi Conversation title generation. Unavailable referenced models SHALL retain their selection with an availability reason and SHALL NOT run; absent or unavailable selection SHALL use deterministic titles without an auxiliary Provider call. Explicit removal of the referenced model SHALL clear the title purpose.

#### Scenario: Auxiliary configuration is removed
- **WHEN** its referenced model configuration is deleted
- **THEN** title use is disabled, new titles use deterministic fallback and existing main Conversation model selection remains independent

#### Scenario: Auxiliary connection loses authentication
- **WHEN** the selected title model cannot run because its connection needs authentication
- **THEN** its saved reference remains, provider-based title calls are blocked and main model selection is unchanged

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

### Requirement: Web sources reference isolated credentials and official models

The system SHALL retain Web-only credentials in the encrypted web-source namespace. Grounded sources SHALL reference existing enabled compatible official model-provider configurations and freeze their credential identity. Custom endpoints SHALL NOT qualify. Loading and saving sources SHALL remain offline.

#### Scenario: Configuration is disabled
- **WHEN** a grounded source references a disabled configuration
- **THEN** it is unavailable and permitted fallback may continue

### Requirement: Execution versions identify the selected code independently

Frozen selections SHALL identify the admitted runtime and Provider implementation versions from a shared exact dependency basis. Estimator records SHALL identify their own implementation version. Catalog revision SHALL remain independent and historical selections SHALL retain their original versions.

#### Scenario: SDK upgrade creates a new selection
- **WHEN** the admitted matched SDK dependencies change and a new turn selection is created
- **THEN** it records the new execution versions without changing historical snapshots or substituting catalog revision

### Requirement: Public directory updates are independent and bounded
The system SHALL check the official public directory without credentials using the actual runtime version, a 30-second timeout and an 8-MiB streamed limit. Four-hour automatic checks SHALL follow recent attempt time and be optional. Manual checks SHALL bypass the interval. Loading configuration, selectors and starting tasks SHALL remain offline. Only a fully validated and persisted candidate SHALL publish.

#### Scenario: Candidate fails validation or persistence
- **WHEN** a response has invalid known fields, duplicate identities, incompatible structure, cancellation or write failure
- **THEN** the previous effective data remains and a safe source failure is published

#### Scenario: Empty or conditional response
- **WHEN** a compatible empty catalog or a matching 304 arrives
- **THEN** empty data replaces public recommendations, while 304 retains the matching body and updates check time only

#### Scenario: Conditional response has no usable body
- **WHEN** 304 arrives without its matching compatible cached body
- **THEN** at most one full request is attempted and no invalid body is adopted

### Requirement: Public recovery preserves independent facts
The system SHALL retain current, previous and seed public data, validate cache on load and fall back in that order. Manual recovery SHALL persist before publication and disable automatic checks. Recovery SHALL preserve overlay, connections, account visibility, history and known retirement constraints. Missing public models SHALL remain separately described for existing configurations without becoming public recommendations.

#### Scenario: Rollback follows retirement
- **WHEN** a user restores a previous snapshot containing a now explicitly retired model
- **THEN** the model remains blocked for new turns and unrelated sources retain their facts

### Requirement: Source ownership prevents late or competing publication
The system SHALL share in-flight refreshes within each source scope, serialize source commits using current independent facts and reject obsolete generations. Removing overlay, restoring public data, credential replacement and shutdown SHALL invalidate affected work. Window closure SHALL release its waiter without canceling work needed by others. Account discovery SHALL persist safe identity-scoped descriptions and distinguish failed observations from valid empty results.

#### Scenario: Independent sources complete concurrently
- **WHEN** public and account refreshes finish in either order
- **THEN** the resulting directory contains both current facts without losing one source's update

#### Scenario: Account identity changes during discovery
- **WHEN** a credential is removed or replaced before discovery publishes
- **THEN** its obsolete result cannot restore availability, while ordinary token renewal retains the same discovery identity

### Requirement: Saved connections and source maintenance remain explicit
The system SHALL retain versioned validated connection bindings and configured model descriptions across directory changes. Source updates SHALL NOT redirect credentials or change authentication. Official seed preparation SHALL be explicit and reproducible; daily public compatibility monitoring SHALL use the same normalizer without accounts, model calls or automatic SDK/seed changes.

#### Scenario: Upstream changes an endpoint
- **WHEN** updated catalog metadata suggests another target for a saved configuration
- **THEN** its existing binding remains and the change requires explicit user acceptance
