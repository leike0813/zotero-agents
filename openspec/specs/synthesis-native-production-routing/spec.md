# synthesis-native-production-routing Specification

## Purpose
Defines how the Synthesis production routes traffic to the native Rust runtime: the closed grouped client surface, native readiness and identity contract, reverse-Host access, and the no-legacy-fallback rule.

## Requirements
### Requirement: Native RPC SHALL implement the complete grouped client surface

The native production adapter SHALL expose every operation in the closed grouped `SynthesisClient` production inventory through versioned, typed request and result contracts. The wire inventory SHALL be reconciled against all 131 public methods at `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c`; every baseline method MUST have a migrated, merged, Host-owned, or approved-retired disposition with executable evidence. A retired disposition MUST belong to the closed 23-method authorization in the migration SSOT and MUST have no production consumer. The adapter MUST NOT accept arbitrary method names, expose repository/path/credential/host-object internals, or treat handler presence as behavioral readiness.

#### Scenario: Production client inventory is compared
- **WHEN** the native capability inventory is checked against the fixed baseline and grouped client
- **THEN** every production method has exactly one typed native route or explicit equivalent owner
- **AND** every baseline method maps to one operation, one Host owner, or one authorized retirement disposition with evidence ID

#### Scenario: Public maintenance work is controlled
- **WHEN** a caller cancels, continues, or retries an accepted public maintenance operation
- **THEN** the approved `client.controlPublicMaintenanceOperation` wire-only extension applies the typed action to that operation ID
- **AND** the extension is recorded separately from the 131-method baseline audit

#### Scenario: Unknown native operation is requested
- **WHEN** a request names an operation outside the closed capability inventory
- **THEN** the service rejects it as `invalid_request` without dispatching application code

#### Scenario: Listed route has no real implementation
- **WHEN** a route cannot produce its baseline-backed projection or effect
- **THEN** it returns a stable unavailable result without fabricated success fields or side effects

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
- **WHEN** an accepted Reference Refresh operation runs for more than five seconds and less than its manifest deadline
- **THEN** the original command has already returned its public operation receipt and the work remains observable by operation ID
- **AND** no `worker_timeout` is reported

#### Scenario: Accepted work exceeds the control-plane deadline
- **WHEN** Advanced Reference matching or Citation Graph layout runs for more than the control-plane deadline and remains within its work and worker-phase deadlines
- **THEN** the accepted operation remains running and observable by operation ID
- **AND** the control-plane deadline does not cancel its worker or change its durable terminal

#### Scenario: Native operation reaches its deadline
- **WHEN** a bounded production operation exceeds its manifest deadline
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

### Requirement: Native production routes SHALL form one validated executable catalog

Before publishing readiness, the native sidecar SHALL combine the manifest-owned capability inventory and operation policies with the Rust-owned handlers and execution behavior. Every declared capability MUST have exactly one handler and a valid execution plan; no undeclared or duplicate handler MAY be admitted. All detected catalog issues SHALL be reported together and startup SHALL fail before ready publication.

#### Scenario: Complete catalog starts
- **WHEN** every manifest capability has exactly one handler, valid policy, and valid execution plan
- **THEN** the native sidecar publishes the complete production capability inventory in manifest order
- **AND** every published capability can be dispatched through the same validated catalog

#### Scenario: Catalog contains several defects
- **WHEN** startup finds missing, duplicate, undeclared, policy-less, or invalid-plan routes
- **THEN** startup reports every detected issue with its issue category and route identity
- **AND** the sidecar does not publish readiness or dispatch application code

### Requirement: Production capability fingerprint SHALL be independently verified

The native sidecar SHALL recompute the production capability fingerprint from the manifest capability identifiers sorted by their current canonical ordering, joined with LF separators, and terminated by one LF. The recomputed SHA-256 digest MUST match the manifest fingerprint before readiness is published. A separate Rust digest constant or ready-roster copy MUST NOT serve as verification evidence.

#### Scenario: Embedded capability manifest is intact
- **WHEN** startup recomputes the fingerprint for the embedded capability inventory
- **THEN** the digest matches the manifest fingerprint
- **AND** catalog validation may continue

#### Scenario: Capability content and fingerprint disagree
- **WHEN** the manifest capability identifiers do not produce the declared fingerprint
- **THEN** startup rejects the catalog before ready publication

### Requirement: Native route execution SHALL use a closed execution plan

The validated catalog SHALL execute production requests through a closed plan that combines manifest-owned lifecycle and data-plane policy with Rust-owned typed handler, special execution step, and canonical-effect semantics. Production routing MUST NOT accept runtime route registration, arbitrary executor callbacks, or capability-string branches outside the validated catalog. Transfer, maintenance, delivery, canonical autosync, deadlines, receipts, and stable error behavior SHALL remain compatible with the current wire contract.

#### Scenario: Route combines several execution concerns
- **WHEN** a declared route requires transfer processing, typed dispatch, and canonical change observation
- **THEN** the validated plan applies those concerns in the established wire-compatible order
- **AND** no caller interprets or mutates the plan

#### Scenario: Unknown production route is requested
- **WHEN** a production request or production-result transfer manifest names an undeclared capability
- **THEN** the validated catalog rejects membership before application dispatch or transfer-session creation

### Requirement: Resolved public maintenance routes SHALL enter one lifecycle interface

The validated production catalog SHALL be the only source that combines a maintenance capability handler with its manifest-owned deadline, semantic-success, receipt, and canonical-effect policy. Production routing SHALL pass an opaque resolved maintenance route into one typed lifecycle interface for submit, control, read, and restart reconciliation. Callers MUST NOT construct handlers or policies, interpret durable records, or orchestrate lifecycle phases.

#### Scenario: Maintenance capability is submitted
- **WHEN** a declared production capability resolves to public maintenance work
- **THEN** routing SHALL submit its typed request and opaque resolved route to the maintenance lifecycle
- **AND** routing SHALL NOT perform durable acceptance, worker spawning, terminal classification, or receipt persistence itself

#### Scenario: Pending work is continued after restart
- **WHEN** a caller explicitly continues a `continuation_required` operation
- **THEN** the lifecycle SHALL reconstruct execution from the persisted stable basis and the current catalog resolution
- **AND** no handler implementation, function pointer, or parallel route discriminator SHALL be persisted

### Requirement: Public maintenance lifecycle views SHALL be transport neutral

The maintenance lifecycle SHALL return a typed operation view containing lifecycle identity, state, phase, scope, progress, timestamps, and an optional opaque capability receipt payload. Existing retry eligibility and sanitized diagnostic codes remain part of the terminal receipt. Persistence records, basis encoding, source hashes, raw diagnostics storage, and wire-specific field aliases MUST NOT cross the lifecycle interface.

#### Scenario: Operation is queried through a production adapter
- **WHEN** a caller reads a public maintenance operation
- **THEN** the lifecycle SHALL return the typed operation view or absence
- **AND** the adapter MAY encode the view for its wire contract without reclassifying status, phase, retry eligibility, or terminal outcome

#### Scenario: Capability returns a domain receipt
- **WHEN** a maintenance handler settles with a capability-specific receipt payload
- **THEN** the catalog-owned semantic-success policy SHALL classify the operation terminal in one place
- **AND** the lifecycle view SHALL preserve the domain payload without treating its internal status as a second lifecycle state

### Requirement: Citation Graph handlers SHALL NOT duplicate public maintenance lifecycle ownership

Citation Graph maintenance handlers SHALL return typed graph outcomes to the existing public maintenance lifecycle. They SHALL NOT create or settle a second public operation, publish maintenance lifecycle events, infer public retry or continue eligibility, or reconcile public restart state.

#### Scenario: A Citation Graph handler completes
- **WHEN** a public maintenance worker receives a typed promoted, unchanged, superseded, canceled, timed-out, or failed graph outcome
- **THEN** only the public maintenance lifecycle terminal compare-and-set winner persists the public terminal receipt and publishes the terminal event

#### Scenario: A duplicate public request arrives
- **WHEN** the public durable insert or continue compare-and-set does not win execution ownership
- **THEN** no Citation Graph attempt is created
- **AND** the stored public operation view is returned unchanged

### Requirement: Production routes SHALL use typed domain ownership

Production routing SHALL limit the central dispatcher to authentication, manifest policy, typed dispatch, and stable error mapping. Domain DTO reconstruction SHALL be owned by typed adapters; business rules by application services; SQL by repositories; and Zotero/WebDAV/effect calls by reverse-Host ports. Route-local fallback parsing and business-state fabrication are forbidden.

#### Scenario: Domain operation is dispatched
- **WHEN** a valid production operation reaches Rust
- **THEN** one typed domain adapter invokes its application port
- **AND** the adapter does not directly invent missing domain state or bypass validation

#### Scenario: DTO is invalid
- **WHEN** a request cannot be rebuilt as its strict operation DTO
- **THEN** it fails before repository, canonical, worker, or Host side effects

#### Scenario: Review result crosses the production boundary
- **WHEN** a typed Reference, Concept, or Topic Graph review application commits or rejects a command
- **THEN** the adapter maps the domain result to the existing public review result and stable diagnostic contract
- **AND** it does not substitute a success-shaped generic mutation status

#### Scenario: Reversible Reference action is repeated after another transition
- **WHEN** a proposal is accepted, reopened, and accepted again
- **THEN** receipt reuse is allowed only when the current monotonic transition basis equals the completed receipt after-basis
- **AND** the second acceptance restores its binding or redirect in a new transaction

### Requirement: Production wire policy SHALL distinguish control data from content

Ordinary metadata and page DTOs SHALL target no more than 768 KiB and MUST NOT exceed 1 MiB. Valid large Topic assets, artifact bodies, review inputs, and exports SHALL use the existing authenticated locator, transfer, or delivery path and MUST NOT be rejected solely because their content cannot fit the general JSON envelope.

#### Scenario: Large Topic result is applied
- **WHEN** a valid Topic result contains assets above the general request limit and within Topic content bounds
- **THEN** the client transfers hash-bound assets and sends a bounded control manifest
- **AND** Rust validates and applies the same public semantic input

#### Scenario: Large artifact is read
- **WHEN** an artifact body is valid but larger than the general response limit
- **THEN** the operation returns or resolves it through the approved content path
- **AND** the control response remains within its metadata bound

#### Scenario: Large artifact export is delivered locally
- **WHEN** a valid local artifact export is larger than the reverse-Host request-body limit and remains within export limits
- **THEN** Rust stages the export entries through an authenticated, hash-bound output transfer and sends only its descriptor and run root over the reverse-Host control plane
- **AND** the plugin verifies the complete transfer before writing entries and writes the workspace manifest last

#### Scenario: Large artifact export is delivered remotely
- **WHEN** a valid remote artifact export is larger than the reverse-Host request-body limit and remains within export limits
- **THEN** the plugin drains and verifies the output transfer before passing the rebuilt entries to the archive delivery port
- **AND** the reverse-Host control request remains below its general request limit

#### Scenario: Export transfer delivery fails
- **WHEN** an export transfer descriptor, page, hash, or rebuilt entry is invalid, or the delivery port fails
- **THEN** no success-shaped delivery result is returned and no manifest is materialized for an incomplete local export
- **AND** the sidecar transfer session is canceled after the terminal outcome

### Requirement: Citation layout SHALL tolerate valid self-referential facts

The Citation layout engine SHALL validate every supplied edge against the graph contract and SHALL treat a valid edge whose source equals its target as layout-neutral. The durable Citation edge, input graph identity, and returned `graphHash` MUST remain unchanged; only the algorithm-specific edge set used to derive coordinates MAY omit that self-loop.

#### Scenario: Graph contains a self-loop
- **WHEN** a valid Citation layout request contains an endpoint-closed self-loop
- **THEN** every supported layout algorithm returns the same coordinates it would return without that self-loop
- **AND** the result preserves the request graph hash and complete node set

### Requirement: Tag routes SHALL preserve the public vocabulary contract

Tag production routes SHALL deserialize the grouped client's public vocabulary and staged-suggestion DTOs rather than repository records. Vocabulary replacement, entry update/delete, staged add/update/discard, and promotion semantics SHALL be owned by the Tag application service. Public reads SHALL return JSON-safe public fields and MUST NOT expose repository revision, serialized-column, or timestamp bookkeeping fields as required client inputs.

#### Scenario: Workflow saves a loaded vocabulary
- **WHEN** the Tag Regulator loads a vocabulary and saves its public entries, aliases, abbreviations, and protocol
- **THEN** the native route accepts that public DTO without requiring repository state or record timestamps
- **AND** reopening the vocabulary returns the saved public projection

#### Scenario: Workflow stages suggestions
- **WHEN** the Tag Regulator stages suggestions containing `tag`, optional `facet` and `note`, `source_flow`, and `parent_bindings`
- **THEN** the application merges them case-insensitively with current staged state
- **AND** listing staged suggestions returns the public projection without serialized repository columns

#### Scenario: Tag mutation is behaviorally accepted
- **WHEN** save, stage, update, discard, delete, or promote is claimed ready
- **THEN** a real production-route test supplies the grouped-client DTO and verifies the resulting read projection after reopen
- **AND** an expected `invalid_request` fixture cannot count as readiness evidence for a valid request

### Requirement: Topic apply SHALL project its owned and proposed domain state

A successful Topic apply SHALL persist the Topic aggregate and SHALL pass optional Concept and Topic Graph sidecars through their owning application boundaries. Sidecar projection failure MUST NOT roll back the committed Topic aggregate, but it SHALL produce a stable warning and MUST NOT report the affected projection as current.

#### Scenario: Topic apply contains Concept proposals
- **WHEN** a valid Topic apply resolves a Concept proposal sidecar through its controlled analysis manifest
- **THEN** the Topic aggregate is persisted and the Concept application ingests the proposal through its own validation and merge rules
- **AND** reopening the production repository returns both the Topic and the resulting Concept facts

#### Scenario: Optional projection fails after Topic promotion
- **WHEN** Concept or Topic Graph proposal ingestion fails after the Topic aggregate is committed
- **THEN** Topic apply remains persisted and returns a stable projection warning
- **AND** no partial or fabricated projection success is exposed

### Requirement: Declared Host capabilities SHALL be proven reachable from production entry points

A reverse-Host capability declaration, handler registration, or serializable DTO SHALL NOT count as production readiness by itself. Each restored Host-backed behavior SHALL have real-route evidence beginning at its grouped-client or startup entry point and observing the exact Host request, durable facts or effects, public projection, failure isolation, and cold reopen behavior.

#### Scenario: Host capability is declared but unreachable
- **WHEN** a capability appears in the closed Host roster but no real user or startup route invokes it
- **THEN** the corresponding production behavior remains incomplete
- **AND** migration acceptance and destructive retirement remain blocked

#### Scenario: Host-backed behavior is accepted
- **WHEN** a restored route is claimed complete
- **THEN** production-route evidence exercises native composition, HTTP, Rust application and repository ownership, and reverse Host
- **AND** it verifies the stable failure semantics rather than accepting handler presence
