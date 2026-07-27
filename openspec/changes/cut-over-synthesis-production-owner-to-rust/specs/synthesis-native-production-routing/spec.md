## ADDED Requirements

### Requirement: Native RPC SHALL implement the complete grouped client surface

The native production adapter SHALL expose every method in the code-derived grouped `SynthesisClient` inventory through versioned, typed request and result contracts. The current inventory contains 96 methods. It MUST NOT add a public client method, accept arbitrary method names, or expose repository, path, credential, or host-object internals.

#### Scenario: Production client inventory is compared
- **WHEN** the native capability inventory is checked against `SynthesisClient`
- **THEN** every production method has exactly one typed native route
- **AND** the public method names and DTOs remain unchanged

#### Scenario: Unknown native operation is requested
- **WHEN** a request names an operation outside the closed capability inventory
- **THEN** the service rejects it as `invalid_request` without dispatching application code

### Requirement: Native production readiness SHALL be complete and owner-scoped

Health and handshake SHALL report the implementation, profile, schema, bundle fingerprint, capability fingerprint, owner mode, cutover receipt identity, and mutation admission. A production client MUST NOT be published unless all identities match the current supervisor generation and the complete capability inventory is available.

#### Scenario: Native identity is complete
- **WHEN** the service owns the production roots and presents a valid completed cutover receipt
- **THEN** the supervisor may publish the native production client
- **AND** mutation admission remains disabled until post-cutover smoke succeeds

#### Scenario: Capability or identity is stale
- **WHEN** profile, instance, schema, bundle, capability, owner, or receipt identity does not match
- **THEN** client acquisition fails closed as unavailable or incompatible
- **AND** no legacy composition is created

### Requirement: Reverse Host access SHALL be explicit and bounded

The plugin SHALL expose a separately authenticated, instance-scoped reverse-Host endpoint containing only the declared paged library/artifact/image reads, export delivery, secret-free WebDAV transport, and preconditioned Host effects required by native applications. Every request MUST carry profile, service-instance, operation-correlation, deadline, and bounded payload metadata.

#### Scenario: Native application requests Host data
- **WHEN** a current ready native instance invokes a declared Host port within its bounds
- **THEN** the plugin rebuilds the typed request, performs only that Host operation, and returns a typed bounded result or stable failure

#### Scenario: Reverse Host authority is invalid
- **WHEN** a request is stale, unknown, oversized, expired, disconnected, or fails its permission or precondition
- **THEN** the plugin rejects it without reading or mutating Zotero state

### Requirement: Production routing SHALL have no legacy fallback

Default-client, Workbench, workflow, Host Bridge, MCP, and startup production paths SHALL resolve the same native composition. Transport, worker, service, or Host failures MUST surface through existing stable client error categories and MUST NOT invoke the in-process or Node implementation.

#### Scenario: Native request fails
- **WHEN** any native production call fails before or after mutation admission
- **THEN** the caller observes the stable failure
- **AND** no request is retried through a legacy implementation
