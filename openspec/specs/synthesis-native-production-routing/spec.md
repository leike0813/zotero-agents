# synthesis-native-production-routing Specification

## Purpose
Defines how the Synthesis production routes traffic to the native Rust runtime: the closed grouped client surface, native readiness and identity contract, reverse-Host access, and the no-legacy-fallback rule.

## Requirements
### Requirement: Native RPC SHALL implement the complete grouped client surface

The native production adapter SHALL expose every operation in the closed grouped `SynthesisClient` production inventory through versioned, typed request and result contracts. The current inventory contains 96 operations: the audited 95-operation baseline inventory plus the approved `client.controlPublicMaintenanceOperation` wire-only extension. It MUST NOT add another public client method without an explicit audited extension, accept arbitrary method names, or expose repository, path, credential, or host-object internals.

#### Scenario: Production client inventory is compared
- **WHEN** the native capability inventory is checked against `SynthesisClient`
- **THEN** every production method has exactly one typed native route
- **AND** every post-baseline extension is explicitly recorded in the migration SSOT

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

The plugin SHALL expose a separately authenticated, instance-scoped reverse-Host endpoint containing only the declared paged library/artifact/image reads, remote export delivery, operation-specific ACP run-workspace materialization, secret-free WebDAV transport, and preconditioned Host effects required by native applications. Every request MUST carry profile, service-instance, operation-correlation, root correlation when debug diagnostics are enabled, deadline, and bounded payload metadata.

#### Scenario: Native application requests Host data
- **WHEN** a current ready native instance invokes a declared Host port within its bounds
- **THEN** the plugin rebuilds the typed request, performs only that Host operation, and returns a typed bounded result or stable failure

#### Scenario: Reverse Host authority is invalid
- **WHEN** a request is stale, unknown, oversized, expired, disconnected, or fails its permission or precondition
- **THEN** the plugin rejects it without reading or mutating Zotero state

#### Scenario: Native filtered artifacts use local delivery
- **WHEN** the native filtered-artifact application supplies bounded canonical entries for local delivery
- **THEN** the plugin SHALL materialize them only beneath a validated ACP skill-run `run_root`
- **AND** absolute, traversing, duplicate, oversized, or out-of-scope targets SHALL be rejected before file I/O

### Requirement: Production routing SHALL have no legacy fallback

Default-client, Workbench, workflow, Host Bridge, MCP, and startup production paths SHALL resolve the same native composition. Transport, worker, service, or Host failures MUST surface through existing stable client error categories and MUST NOT invoke the in-process or Node implementation.

#### Scenario: Native request fails
- **WHEN** any native production call fails before or after mutation admission
- **THEN** the caller observes the stable failure
- **AND** no request is retried through a legacy implementation

### Requirement: Production operation deadlines SHALL be manifest owned

The shared production operation manifest SHALL define an operation-specific control-plane deadline and work model for every production capability. Bounded reads and short mutations SHALL complete within that deadline. Every full-library or worker-backed mutation SHALL also declare an explicit, independently persisted work deadline. Such mutations SHALL return an accepted public operation receipt within the short control-plane deadline and continue only through bounded operation phases with explicit progress, cancellation, retry, and terminal state. TypeScript and Rust routes MUST resolve the same policy from the manifest.

#### Scenario: Long native work is accepted
- **WHEN** a caller starts Reference refresh/matching, Citation rebuild/refresh/metrics/layout, a knowledge-index rebuild, or WebDAV sync
- **THEN** the route returns the existing public operation receipt without holding the RPC until terminal completion
- **AND** subsequent progress and terminal reads use the read-only operation API while cancel, continue, and retry use the bounded control mutation

#### Scenario: Reference Refresh exceeds the former plugin timeout
- **WHEN** an accepted Reference Refresh operation runs for more than five seconds and less than its manifest work deadline
- **THEN** the original command has already returned its public operation receipt and the work remains observable by operation ID
- **AND** no `worker_timeout` is reported

#### Scenario: Accepted work exceeds the control-plane deadline
- **WHEN** Advanced Reference matching or Citation Graph layout runs for more than the control-plane deadline and remains within its work and worker-phase deadlines
- **THEN** the accepted operation remains running and observable by operation ID
- **AND** the control-plane deadline does not cancel its worker or change its durable terminal

#### Scenario: Native operation reaches its deadline
- **WHEN** a production operation exceeds its manifest deadline
- **THEN** Rust returns `operation_timeout`
- **AND** the plugin preserves that code before its local transport grace expires

#### Scenario: Native operation reaches a phase deadline
- **WHEN** bounded work exceeds its phase deadline before promotion
- **THEN** Rust records `operation_timeout` and preserves the prior usable state
- **AND** no unreported commit occurs after the caller observes timeout

#### Scenario: Ordinary operation resolves its deadline
- **WHEN** a bounded read or short mutation has no override
- **THEN** its effective deadline comes from the shared manifest

### Requirement: Production RPC transport SHALL use transport failure vocabulary

The production RPC client SHALL apply a two-second local grace after the manifest operation deadline and SHALL classify its own failures only as `request_timeout`, `request_canceled`, `response_invalid`, or `service_unavailable`. Shared sidecar error rebuilding SHALL preserve `operation_timeout`.

#### Scenario: Local response timer expires
- **WHEN** no valid native response arrives before the operation deadline plus transport grace
- **THEN** the plugin reports `request_timeout`
- **AND** it does not use a worker-oriented error code

#### Scenario: Native timeout response arrives during grace
- **WHEN** Rust returns `operation_timeout` after its operation deadline but before the plugin grace expires
- **THEN** callers observe `operation_timeout` unchanged

### Requirement: Production client request admission SHALL use the operation budget

Production `client.*` requests SHALL allow one string member to consume up to the operation's aggregate 1 MiB request budget. JSON depth and node limits SHALL remain enforced, and non-production sidecar capabilities SHALL retain the general 64 KiB string-member bound.

#### Scenario: Digest request contains one large valid string
- **WHEN** a production literature-digest apply request contains a string larger than 64 KiB while the complete request remains within 1 MiB
- **THEN** request admission accepts it for typed operation validation

#### Scenario: Production request exceeds its aggregate budget
- **WHEN** the serialized production request exceeds 1 MiB
- **THEN** request admission rejects it before application dispatch

#### Scenario: General capability contains an oversized string
- **WHEN** a non-production capability contains a string larger than 64 KiB
- **THEN** request admission rejects it under the general member bound

### Requirement: Native literature apply SHALL commit complete scoped state atomically

`client.applyLiteratureDigestSidecar` SHALL validate the public workflow DTO and apply artifact descriptors, changed reference and citation-analysis projections, safe canonical bindings, citation roles, bounded literature matching metadata, cache staleness, and the success receipt in one SQLite transaction through the reference-refresh application. Digest-only changes SHALL NOT rebuild unchanged raw references. No Node fallback or second public interface SHALL participate.

#### Scenario: Complete literature apply succeeds
- **WHEN** a valid request carries digest, references, citation-analysis, matching metadata, and matched-reference evidence for one source
- **THEN** the native repository persists the corresponding artifact, reference, role, unambiguous binding, metadata, cache, and receipt state
- **AND** the public result remains compatible and reports `sidecar_applied`

#### Scenario: Identical literature apply repeats
- **WHEN** a request has the same canonical inputs as an already successful apply
- **THEN** the native operation returns an unchanged idempotent `sidecar_applied` result
- **AND** it does not duplicate references, bindings, metadata, or receipts

#### Scenario: Literature apply fails before commit
- **WHEN** validation, artifact preparation, reference projection, or transaction commit fails
- **THEN** no partial artifact, reference, role, binding, matching metadata, cache mutation, or success receipt remains

#### Scenario: Matching evidence is ambiguous
- **WHEN** no citekey match exists and title plus year identifies more than one candidate
- **THEN** the apply leaves that reference unbound

#### Scenario: Only digest content changes
- **WHEN** digest descriptor or hash changes while reference and citation-analysis facts remain identical
- **THEN** artifact state and matching metadata may update
- **AND** raw references are not rebuilt and graph-related caches are not marked stale without fact changes

### Requirement: Native routing SHALL decode by capability before domain dispatch

The native dispatcher and reverse-Host client SHALL select a capability-specific strict DTO before calling application or Host code. Raw JSON MAY exist only inside bounded transport decoding and MUST NOT cross into domain ports.

#### Scenario: Required nested field is absent
- **WHEN** a production or reverse-Host payload omits a required nested field
- **THEN** routing returns the stable invalid-contract failure before domain dispatch
- **AND** no fabricated default state is observed

#### Scenario: Valid capability payload is dispatched
- **WHEN** a payload satisfies the exact recursive contract for its capability
- **THEN** the typed application or Host handler receives the corresponding concrete DTO
- **AND** its result is serialized from the mapped concrete result type

### Requirement: Production routing SHALL preserve security and contract-error precedence

After bounded transport reading, the production service SHALL authenticate the caller before returning capability-specific recursive validation details. Envelope and lifecycle authorization SHALL precede domain dispatch. Invalid request DTOs SHALL produce `invalid_request`; an invalid value returned by a capability implementation SHALL produce `internal`.

#### Scenario: Unauthenticated capability payload is invalid
- **WHEN** an unauthenticated caller submits a bounded payload whose capability DTO is invalid
- **THEN** the service rejects authentication before reporting the capability validation error
- **AND** no domain handler runs

#### Scenario: Capability returns a non-JSON-safe result
- **WHEN** an authenticated capability returns an unsupported value, undefined member, or cycle
- **THEN** the boundary returns the stable `internal` error
- **AND** it does not coerce or silently remove the invalid value
