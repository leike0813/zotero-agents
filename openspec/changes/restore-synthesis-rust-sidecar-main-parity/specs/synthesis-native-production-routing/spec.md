## MODIFIED Requirements

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

## ADDED Requirements

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
