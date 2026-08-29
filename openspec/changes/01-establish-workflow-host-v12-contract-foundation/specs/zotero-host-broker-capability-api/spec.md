## ADDED Requirements

### Requirement: Broker adapters SHALL preserve stable safe failure data
Every Broker adapter SHALL preserve the shared error code, retryability, and code-specific details without reconstructing meaning from prose. An adapter MUST reject results or test doubles that contain undeclared codes, open details, lossy JSON values, or unconfigured capability members.

#### Scenario: Fail-closed test adapter omits a capability
- **WHEN** a test adapter does not explicitly configure a required Broker capability
- **THEN** the call fails as unavailable instead of falling through to the real Zotero runtime

#### Scenario: Transport projects a Broker failure
- **WHEN** Host Bridge or another adapter maps a canonical Broker failure to its transport envelope
- **THEN** the transport preserves the canonical semantics without making transport codes the Broker source of truth

### Requirement: Broker DTO validation SHALL be bounded and deterministic
Strict-JSON validation SHALL reject non-finite numbers, excessive nesting, excessive collection size, and unsupported values using deterministic bounded diagnostics. Validation MUST NOT use stringify/parse as a sanitizer.

#### Scenario: Lossy value is submitted
- **WHEN** a request contains `undefined`, a function, a native object, or a non-finite number
- **THEN** validation fails before Zotero state is read or mutated
