## ADDED Requirements

### Requirement: Sync runtime Host capabilities are explicit

The complete Synthesis service SHALL receive Git runtime and WebDAV remote-operation capabilities through composition and SHALL NOT construct them from Zotero preferences, encrypted credentials, subprocess runners, global fetch, or default Host clients.

#### Scenario: Production service is composed

- **WHEN** the default legacy composition creates the complete service
- **THEN** it SHALL inject a prefs-configured Git runtime binding and WebDAV Host port
- **AND** the application service SHALL receive no plaintext credential or Git command runner.

#### Scenario: Capability is absent

- **WHEN** a service is constructed without a Git binding or WebDAV Host port
- **THEN** the corresponding Sync state SHALL be stably disabled
- **AND** no prefs, credential, fetch, or subprocess fallback SHALL run.

### Requirement: WebDAV Host port is strict and secret-free

The WebDAV Host port SHALL canonically rebuild managed-relative-path requests and bounded JSON-safe results for sanitized description, text read, text write, and collection preparation. It SHALL reject invalid input before Host I/O and SHALL NOT expose credentials, Authorization headers, raw URLs with userinfo or secret query values, absolute paths, callbacks, or raw errors.

#### Scenario: Application reads or writes remote content

- **WHEN** WebDAV Sync requests a relative durable-sync path
- **THEN** the Host adapter SHALL resolve it under the current configured remote root and read the current credential internally
- **AND** only a canonical available, missing, written, conflict, ready, disabled, or unavailable result SHALL cross the port.

#### Scenario: Host result is malformed or Host I/O fails

- **WHEN** the port throws or returns a malformed result
- **THEN** WebDAV Sync SHALL produce a stable sanitized diagnostic
- **AND** it SHALL preserve the existing durable state rather than leak Host details.

### Requirement: Configuration ownership remains in Preferences

Preferences hooks SHALL remain the only supported owner of Git/WebDAV configuration status, save, credential clear/store, and connection-test operations, and successful configuration changes SHALL invalidate the default Synthesis client composition.

#### Scenario: Configuration changes

- **WHEN** Preferences successfully saves or clears Sync configuration or credentials
- **THEN** it SHALL invalidate the cached default client
- **AND** the next runtime command SHALL receive freshly composed Host capabilities.

### Requirement: Complete service inventory excludes dead Sync facade

The complete service SHALL remove the ten unconsumed Git/WebDAV configuration facade methods while retaining all runtime Sync client commands and exactly one production direct consumer. The inventory SHALL be `115 methods / 1 direct consumer`.

#### Scenario: Boundary inventory is checked

- **WHEN** the service return surface and migration inventory are compared
- **THEN** none of the ten configuration/status/credential/test methods SHALL be present
- **AND** the retained Git/WebDAV runtime methods and `SynthesisClient.sync` commands SHALL remain available.

### Requirement: Readonly Sync composition has no Host effects

The readonly composition SHALL explicitly inject disabled Sync capabilities and SHALL provide stable disabled Sync projections without reading or mutating prefs, decrypting credentials, using fetch, or starting subprocesses.

#### Scenario: Readonly harness reads Sync state

- **WHEN** the readonly client loads a Sync surface
- **THEN** Git and WebDAV SHALL report disabled runtime state
- **AND** no production Host adapter SHALL be invoked.
