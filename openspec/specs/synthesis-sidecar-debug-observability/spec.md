## Purpose

Defines the Synthesis sidecar observability contract: bounded production
failure summaries and a payload-free correlated debug timeline across
lifecycle, RPC, reverse-Host, operation, and process boundaries.

## Requirements

### Requirement: Diagnostics SHALL expose structured runtime admission failure

The debug lifecycle projection SHALL publish `runtime-admission` before reading
or classifying the first cutover receipt. Failure projection SHALL prefer a
structured `details.reason`, then a stable error code, and MUST NOT derive a
reason by tokenizing human-readable error text.

#### Scenario: Installed build differs from current admission
- **WHEN** startup detects a non-admitted build fingerprint
- **THEN** every diagnostic consumer reports `runtime-admission / runtime_mismatch`
- **AND** sanitized details include current and target fingerprints

#### Scenario: Error message begins with prose
- **WHEN** a runtime error contains whitespace-delimited explanatory text
- **THEN** diagnostic code selection does not emit the first message word

### Requirement: Sidecar diagnostics SHALL preserve boundary identity

Production SHALL invoke a bounded, sanitized failure recorder only from failed lifecycle, RPC, reverse-Host, native operation, batch, and process boundaries. Debug builds SHALL additionally retain and print correlated start/success/failure events only when the independent Synthesis Sidecar diagnostic source switch and `__debug_mode__` are both enabled. The outer plugin RPC request ID SHALL be the root `correlationId`; native RPC request IDs, operation IDs, Reverse Host request IDs, and batch ordinals SHALL remain distinct local identities.

#### Scenario: Debug reference refresh
- **WHEN** refresh crosses the RPC, batch, apply, and reverse-Host boundaries with both diagnostic gates enabled
- **THEN** every event carries the root `correlationId` and its own applicable local identity
- **AND** events expose capability, stage, duration, status, batch ordinal, source and payload counts, measured and configured bytes and JSON nodes, and aggregate counts
- **AND** credentials, payloads, locators, paper references, note text, WebDAV content, and unrestricted process output are absent

#### Scenario: Dashboard selects an outer failure
- **WHEN** a user selects a correlated outer RPC failure
- **THEN** the Synthesis Sidecar page includes its native RPC, batch, Reverse Host, apply, and terminal events ordered as one causal timeline
- **AND** older events without `correlationId` remain joinable through request or operation ID equality

#### Scenario: Production success
- **WHEN** debug mode is disabled and an operation succeeds
- **THEN** no debug correlation string or success event is constructed, serialized, written, parsed, retained, subscribed, or rendered

#### Scenario: Production failure
- **WHEN** debug mode is disabled and an operation fails
- **THEN** one bounded causal failure summary for each distinct failed boundary remains available in runtime logs
- **AND** the summary prefers a safe structured root reason over a generic outer error

#### Scenario: Citation Graph mutation resolves with a non-success status
- **WHEN** native Graph mutation dispatch returns HTTP success with `worker_busy`, `worker_failed`, `basis_mismatch`, `invalid_request`, `repair_required`, or `stopping`
- **THEN** RPC transport diagnostics remain successful while a distinct failed operation event records the semantic mutation status
- **AND** a layout worker failure records its safe worker code, algorithm, graph hash, node and edge counts, and configured limits under the same correlation identity
- **AND** neither event contains graph rows, titles, identifiers, request payloads, or error prose.

### Requirement: Debug Dashboard SHALL present actionable correlated event detail

The debug-only Synthesis Sidecar Dashboard SHALL render lifecycle and operation statuses with the shared semantic status badge system. A selected event SHALL expose a compact structured summary and the complete selected/related JSON payload, and JSON copy SHALL provide visible success or failure feedback.

#### Scenario: Event timeline is displayed
- **WHEN** started, succeeded, and failed events are present
- **THEN** their statuses use accent, success, and error badge tones respectively
- **AND** the selected event summary exposes only available identifiers and capacity fields

#### Scenario: Citation Graph layout failure is selected
- **WHEN** a failed layout worker or mutation-result event is selected
- **THEN** the detail summary exposes mutation status, worker code, algorithm, graph hash, and node/edge count-to-limit pairs when available
- **AND** correlated raw-worker and semantic terminal events remain separately identifiable.

#### Scenario: Workbench retains the latest layout failure
- **WHEN** a Citation Graph layout mutation fails for the selected graph hash and algorithm
- **THEN** the Graph projection retains a bounded sanitized reason for ordinary users independently of the runtime event timeline
- **AND** debug builds may expose the stable code, mutation status, algorithm, and graph hash without titles, node identifiers, or graph payload rows.

#### Scenario: JSON copy succeeds
- **WHEN** the user copies selected and related event JSON
- **THEN** the button temporarily reports success
- **AND** the existing Dashboard toast confirms the copy

#### Scenario: JSON copy fails
- **WHEN** the clipboard operation rejects
- **THEN** the button reports failure
- **AND** the Dashboard presents a failure toast

#### Scenario: Production build is created
- **WHEN** debug diagnostics are compile-time disabled
- **THEN** the Sidecar Dashboard renderer, status projection, detail construction, and copy handler remain absent from the production artifact

### Requirement: Citation Graph failures SHALL preserve public identity across transport boundaries
The sidecar SHALL record handler failure separately from HTTP response-write outcome and SHALL map basis mismatch, repository schema incompatibility, repository unavailability, response size limit, and schema mismatch to stable public codes and appropriate HTTP statuses. The TypeScript client SHALL preserve the sidecar code and a bounded safe sidecar reason.

#### Scenario: A Graph response exceeds the runtime budget
- **WHEN** a Graph handler cannot reduce a response below the allowed size
- **THEN** the caller receives `response_body_too_large` with a safe bounded reason instead of a bare `internal_error`

#### Scenario: A cursor basis is stale
- **WHEN** a Graph handler returns `basis_mismatch`
- **THEN** diagnostics and the TypeScript client preserve `basis_mismatch` while independently recording whether the HTTP error response was written

### Requirement: Debug SHALL expose bounded causal traces

Debug mode SHALL expose strict v2 parent/child spans from supervisor/process,
Host RPC, reverse-Host, child-worker, transfer, and durable operation
boundaries. The in-memory store SHALL retain at most 1,000 events and 128 per
trace, pin active traces, evict completed traces as units, and publish 200 ms
incremental patches.

#### Scenario: A trace exceeds its budget
- **WHEN** more than 128 events are appended
- **THEN** the start, first failure, terminal, and dropped count remain visible

#### Scenario: Debug is disabled
- **WHEN** an operation runs in a production build
- **THEN** no trace ID, event, wire context, store update, or UI patch is made

### Requirement: Production startup diagnostics SHALL be bounded and safe
The runtime and supervisor SHALL expose a correlated startup trace containing bounded phase, outcome, stable code, attempt, timing, and safe identity fields. Raw stdout, stderr, command arguments, environment values, and filesystem contents SHALL remain unavailable unless debug mode is enabled.

#### Scenario: Production migration fails
- **WHEN** a migration phase fails while debug mode is disabled
- **THEN** diagnostics identify classification, normalization, validation, publication, discovery, health, handshake, retry, or fuse phase as applicable
- **AND** contain no raw process tail or secret-bearing launch value

#### Scenario: Debug launch fails
- **WHEN** the same launch fails while debug mode is enabled
- **THEN** the bounded trace remains available
- **AND** bounded raw process tails may be attached as debug-only evidence

### Requirement: Advanced Matching SHALL use the real worker contract

The native production adapter SHALL build the strict binding and dedupe worker
requests, execute both through the generic paged child-worker protocol, and
promote their accepted outcomes atomically. Accepted bindings from the first
pass SHALL be excluded from the same-run dedupe input.

#### Scenario: Advanced Matching runs both passes
- **WHEN** a production matching command is accepted
- **THEN** binding completes before dedupe through the real child process
- **AND** identifier evidence, explicit disposition, and same-run exclusion are preserved

#### Scenario: Either pass is not successful
- **WHEN** a worker, validation, basis, or promotion terminal is non-success
- **THEN** no partial matching state is promoted
- **AND** the public command returns its stable semantic status

#### Scenario: One pair has distinct review semantics
- **WHEN** dedupe produces actions with the same source and target but different edge types or representative-retarget semantics
- **THEN** the Rust matcher SHALL retain each distinct semantic action
- **AND** the application SHALL promote the combined two-pass result atomically

#### Scenario: Dedupe repeats one semantic action
- **WHEN** multiple actions have the same action, source, target, cluster, edge type, and representative-retarget marker
- **THEN** the Rust matcher SHALL retain only the highest-score action and compute counters from the normalized result
- **AND** any duplicate semantic key that reaches the application SHALL fail before preparation, fact, or proposal persistence

### Requirement: Failed refresh preparation SHALL be retryable

When reference refresh fails after creating a preparation but before promotion,
the application SHALL terminalize and discard that preparation before
returning the failure.

#### Scenario: Artifact response is truncated
- **WHEN** an artifact read fails after `prepare_refresh`
- **THEN** the preparation operation is no longer running
- **AND** retry in the same sidecar process can prepare and promote normally

### Requirement: Canonical inspection SHALL remain behind the application port

The authenticated runtime ingress SHALL obtain canonical store identity and raw
topic descriptors through narrow `CanonicalStorePort` operations. It SHALL NOT
acquire the canonical storage owner or lock. This internal seam change SHALL
preserve the existing `topics.canonical.inspect` request, result, error, and
response-bound behavior.

#### Scenario: A raw topic descriptor is inspected
- **WHEN** an authenticated caller inspects an existing or absent topic
- **THEN** the result preserves the current raw descriptor fields and bounded response behavior
- **AND** the runtime adapter does not need canonical storage ownership

### Requirement: The Synthesis debug dashboard SHALL keep actionable traces findable

The debug dashboard SHALL render a bounded visible trace window ordered by active and failed traces before recent terminal traces. Users SHALL be able to locate a trace by trace ID, operation, or capability, and the selected trace SHALL remain visible even when it falls outside the default window.

#### Scenario: Repeated failures fill the trace store

- **WHEN** many sidecar traces are retained and at least one is failed
- **THEN** failed and active traces remain in the bounded visible list
- **AND** the dashboard does not render the complete retained trace set as an unbounded table.

#### Scenario: A user selects an older failed trace

- **WHEN** the selected failed trace is outside the default visible window
- **THEN** the dashboard includes it in the visible rows and displays its causal events
- **AND** later diagnostic updates do not silently replace the selection.

#### Scenario: Diagnostic updates arrive rapidly

- **WHEN** multiple observation patches arrive in a short interval
- **THEN** dashboard refreshes are coalesced through the existing noisy-refresh path
- **AND** trace storage remains bounded.

### Requirement: Availability failures SHALL retain a safe structured reason

Failed host-RPC and pre-dispatch client-operation trace events SHALL retain an
optional bounded stable reason independently of their public error code. The
reason SHALL distinguish service readiness, transport availability, and safe
sidecar-provided causes without including exception prose, paths, payloads, or
credentials. This additive field SHALL remain compatible with
`synthesis-sidecar-observation.v2`.

#### Scenario: Client has no ready connection

- **WHEN** a client operation fails before RPC dispatch because the service is not ready
- **THEN** its terminal trace records public code `unavailable`
- **AND** its structured reason identifies `service_not_ready`
- **AND** no host-RPC span is emitted

#### Scenario: Host transport cannot reach the sidecar

- **WHEN** an RPC attempt fails at the transport boundary
- **THEN** the host-RPC terminal trace retains a stable transport-unavailable reason
- **AND** it does not expose the native exception message

#### Scenario: Sidecar returns a safe application reason

- **WHEN** the sidecar returns an error containing a bounded safe reason
- **THEN** the host-RPC terminal trace retains that reason with the public sidecar code
- **AND** diagnostic consumers can distinguish repository and reverse-Host causes from a generic unavailable result
