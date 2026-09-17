# system-e2e-strategy Specification

## Purpose

Defines the project-wide System End-to-End Test strategy: the risk catalog and its priority gates, the
Scenario Family and Scenario Case catalog, the shared runner, fixture, and Run Manifest contracts, and
the ownership, quarantine, and promotion rules that govern cross-process regression evidence.

## Requirements

### Requirement: Evidence categories SHALL remain distinct

A **System End-to-End Test** SHALL traverse a user-visible or public production path through a real
Zotero process and the production plugin, and SHALL also involve the current-source real Synthesis
sidecar whenever Synthesis is in scope. A **Contract Integration Test** SHALL exercise a protocol or
multi-module seam through production participants without traversing that complete system path.
Controlled peers MAY replace only systems outside the boundary under test. Directory names, command
names, and the `e2e` label SHALL NOT be treated as taxonomy.

#### Scenario: A replacement seam decides the category

- **WHEN** a test replaces the seam that carries the risk
- **THEN** it is Contract Integration evidence even if it lives under an E2E directory or command

#### Scenario: A public path decides the category

- **WHEN** a `lite` test traverses a public production path through real Zotero and the production plugin
- **THEN** it is System E2E for that path

#### Scenario: Applicable category definitions are discoverable

- **WHEN** an agent or maintainer needs the agreed meanings of `System End-to-End Test` and
  `Contract Integration Test`
- **THEN** `CONTEXT.md` SHALL define both terms

### Requirement: Risk catalog SHALL be classified by seam, invariant, and consequence

The strategy specification SHALL record the risk catalog as **Seam × Invariant × Consequence** rather
than by module, historical bug, or whole process boundary. Priority SHALL use hard gates. A risk SHALL
be **P0** when a violation can cause durable data corruption, duplicate or unauthorized mutation,
cross-owner permission leakage, system-wide liveness loss, or a terminal state requiring manual
repair, or when the same invariant has recurred in at least two independent incidents or seams without
production-path System E2E evidence. A risk SHALL be **P1** when the violation remains user-visible or
affects a public production path but is bounded to one operation or owner, is recoverable by retry or
restart, and leaves no durable ambiguity. A risk SHALL keep one priority across phases; phases order
delivery only.

#### Scenario: Consequence promotes a risk

- **WHEN** a violation can duplicate a mutation or strand a durable identity
- **THEN** the risk is P0 regardless of how narrow the affected operation appears

#### Scenario: Bounded and recoverable violation

- **WHEN** a violation is user-visible but bounded to one operation and recoverable without durable ambiguity
- **THEN** the risk is P1

#### Scenario: Lower-layer coverage does not downgrade a risk

- **WHEN** a risk has extensive unit, Rust, or Node coverage
- **THEN** its priority is unchanged by that coverage

#### Scenario: P1 escalates from observed consequence

- **WHEN** a P1 violation is shown to cause duplicate execution, durable corruption, terminal ambiguity,
  or cross-owner leakage
- **THEN** the risk is reclassified P0

### Requirement: P0 risks SHALL carry a normal path and a failure or recovery path

Every P0 product risk SHALL have at least one Scenario Case for its normal path and at least one for a
failure or recovery path. The shared-profile, process, port, lock, and cleanup isolation risk SHALL be
proven before dependent scenarios can produce acceptable evidence, and SHALL be recorded as an
evidence-infrastructure gate rather than a user-facing family. P1 risks SHALL each carry System E2E
evidence or an explicit Contract Integration Test rationale.

#### Scenario: P0 risk is admitted

- **WHEN** a P0 risk enters the catalog
- **THEN** its normal and failure or recovery cases are both recorded

#### Scenario: Infrastructure gate precedes dependent evidence

- **WHEN** the runner has not proven shared-profile, process, port, lock, and cleanup isolation
- **THEN** no dependent scenario result is accepted as evidence

### Requirement: Contract Integration rationale SHALL meet every stated condition

A P1 risk MAY omit System E2E evidence only when the recorded rationale states that the test uses the
production participants on both sides of the relevant boundary, asserts a stable public, user-visible,
or durable observable, replaces only the test driver, shows that real-Zotero composition introduces no
additional owner, timing, filesystem, platform, or recovery semantics, and names the condition that
would promote the risk to System E2E. A large unit-test count SHALL NOT serve as a rationale.

#### Scenario: Rationale is incomplete

- **WHEN** a rationale omits the promotion condition or replaces more than the test driver
- **THEN** the risk remains without accepted evidence

#### Scenario: Rationale is complete

- **WHEN** every stated condition holds and the promotion condition is named
- **THEN** the risk MAY rely on the Contract Integration Test until that condition is met

### Requirement: One existing runner SHALL own System E2E execution

System E2E execution SHALL reuse `tests/zotero/e2e/full` and `npm run test:zotero:e2e` through the
existing `scripts/run-zotero-test-with-mock.ts` and `zotero-plugin.config.ts` path. The strategy
SHALL NOT create a second Zotero runner, a runtime scenario registry, or a global production fault
service. Test directories SHALL remain the execution-membership source, and case selection SHALL be
carried by the runner's catalog selection rather than a file allowlist or title allowlist.

#### Scenario: A scenario is added

- **WHEN** a new Scenario Case is implemented
- **THEN** it executes under `tests/zotero/e2e/full` through the existing E2E command

#### Scenario: Membership is inspected

- **WHEN** the selected E2E membership is reviewed
- **THEN** it derives from the E2E suite directory entries
- **AND** no parallel runner, aggregate import suite, or JSON scenario catalog exists

### Requirement: One invocation SHALL own one Suite Baseline and one copied profile

One System E2E invocation for one compatibility target SHALL own one copied profile and one **Suite
Baseline** consisting of the deterministic Committed Seed plus the production plugin and
current-source Synthesis sidecar initialized for that invocation. The baseline SHALL be created once,
SHALL NOT be reset between Scenario Families, and SHALL NOT be shared with another invocation, job, or
Zotero version. Cases SHALL execute serially within that profile, and parallelism SHALL be permitted
only between complete invocations.

#### Scenario: Invocation starts

- **WHEN** one compatibility target begins an E2E invocation
- **THEN** exactly one copied profile and one Suite Baseline are materialized for it

#### Scenario: Families run in sequence

- **WHEN** multiple Scenario Families are selected for one invocation
- **THEN** they execute serially against the same baseline
- **AND** the baseline is not reset between families

#### Scenario: Baseline is not shared

- **WHEN** a second invocation, job, or Zotero version runs
- **THEN** it receives its own copied profile and its own Suite Baseline

### Requirement: Scenario Families SHALL declare namespace, owned state, carry-over, and cleanup

Each Scenario Family SHALL declare a **Family Namespace** covering its library objects, operations,
files, and other durable identities; its **Owned State**, including profile-global state that cannot
be namespaced; and an optional **Carry-over Set** containing only state intentionally preserved
between phases of that same restart or reconciliation family. Profile-global state SHALL be held
exclusively and restored. A normal family SHALL clean its Owned State before yielding the profile; a
restart or reconciliation family MAY preserve only its declared Carry-over Set between its own phases
and SHALL clean it before yielding the profile. Carry-over SHALL NOT cross a family boundary, and
undeclared persistent mutation SHALL be a contract violation.

#### Scenario: Family completes

- **WHEN** a family finishes its cases
- **THEN** its Owned State is removed before the next family begins

#### Scenario: Restart family carries state

- **WHEN** a restart or reconciliation family preserves state between its own phases
- **THEN** the preserved state is a declared Carry-over Set
- **AND** it is removed before that family yields the profile

#### Scenario: Undeclared mutation is detected

- **WHEN** state outside a family's declared Owned State or Carry-over Set persists
- **THEN** the invocation aborts under the shared-profile abort contract

### Requirement: Suite Health Gate SHALL run after initialization and after every family

A minimal **Suite Health Gate** SHALL run after suite initialization and after each Scenario Family.
It SHALL prove that Zotero and the production plugin remain responsive, the expected current-source
sidecar identity is ready, no undeclared operation or managed process remains active, and the
completed family's Owned State has been cleaned. Families MAY add checks for their own stable
outcomes. The common gate SHALL NOT compare the whole database or assert private persistence layout.

#### Scenario: Gate runs after initialization

- **WHEN** suite initialization completes
- **THEN** the Suite Health Gate result is recorded before any family executes

#### Scenario: Gate runs after a family

- **WHEN** a family finishes and cleans its Owned State
- **THEN** the Suite Health Gate runs and its result is recorded for that family

#### Scenario: Gate detects a leak

- **WHEN** the gate finds an undeclared active operation, a residual managed process, an unready
  sidecar identity, or unremoved Owned State
- **THEN** the gate fails

### Requirement: Abort behavior SHALL be fail-closed

Baseline setup, cleanup, Suite Health Gate, process-restart, or runner or transport infrastructure
failure SHALL abort all remaining families. An ordinary scenario assertion failure SHALL first run
that family's cleanup and the Suite Health Gate, and later families MAY run only if cleanup completed
and the shared profile is healthy. A failed or indeterminate cleanup or health result SHALL abort the
invocation. Blocking lanes SHALL NOT retry automatically, and aborted runs SHALL preserve first-failure
diagnostics and the Run Manifest.

#### Scenario: Infrastructure failure

- **WHEN** baseline setup, process restart, or runner infrastructure fails
- **THEN** remaining families do not run

#### Scenario: Scenario assertion fails

- **WHEN** an ordinary case assertion fails
- **THEN** that family's cleanup and the Suite Health Gate run
- **AND** later families run only if cleanup completed and the profile is healthy

#### Scenario: Cleanup is indeterminate

- **WHEN** a family's cleanup or health result cannot be determined
- **THEN** the invocation aborts
- **AND** first-failure diagnostics and the manifest are preserved

### Requirement: Run Manifest SHALL be a runner-owned sanitized verdict and index

The runner outside the Zotero process SHALL own the **Run Manifest**, so that Zotero or sidecar
termination cannot erase the run verdict. The manifest SHALL record a manifest schema version and
opaque run ID; trigger lane; source commit and plugin version; Zotero version, platform, and
architecture; current-source sidecar build identity; fixture ID and fixture schema/version; start and
finish time; and, for the single permitted scheduled rerun, the predecessor run ID. It SHALL record
stable family and scenario IDs; result `passed`, `failed`, `aborted`, or `skipped`; stable public
outcome or failure code; typed-evidence descriptors with evidence kind, contract or schema version,
terminal status, and any safe opaque operation ID; lifecycle checkpoints and outcomes; cleanup result;
Suite Health Gate result; and Artifact References. It SHALL NOT record profile or data-root identity,
host names, credentials, tokens, absolute paths, or identifying library facts, and SHALL NOT embed
complete receipts, raw payloads, UI copy, log text, private persistence layouts, or internal call
order. If required public, typed, lifecycle, cleanup, or health evidence is missing, the scenario SHALL
fail rather than be inferred from logs.

#### Scenario: Successful invocation

- **WHEN** every selected family reaches a recorded result and required cleanup and health evidence exists
- **THEN** the manifest terminal state is `complete`

#### Scenario: Intentional stop

- **WHEN** the invocation stops under the shared-profile abort contract
- **THEN** the manifest terminal state is `aborted`
- **AND** completed family results, failure phase, stable abort code, last known cleanup and health
  states, rerun lineage, and already available sanitized artifact references are written

#### Scenario: Untrustworthy termination

- **WHEN** execution ends before a trustworthy terminal classification can be formed
- **THEN** the manifest terminal state is `incomplete`

#### Scenario: Required evidence is missing

- **WHEN** a scenario's required typed, lifecycle, cleanup, or health evidence is absent
- **THEN** the scenario result is a failure and is not inferred from logs

#### Scenario: Manifest cannot be persisted

- **WHEN** the runner cannot persist the manifest
- **THEN** this is an invocation-level infrastructure failure

### Requirement: Artifact references SHALL be sanitized and privacy-safe

An **Artifact Reference** SHALL be a workspace-relative pointer to an independently produced,
classified, and sanitized artifact, carrying only artifact kind, producer, media type, and relative
path. The manifest SHALL NOT act as an artifact-integrity system and SHALL NOT add a separate content
hash requirement. Artifacts that may expose secrets, credentials, identifying bibliography or document
content, host-local paths, profile identities, or private persistence formats SHALL NOT be referenced
or published; their entry SHALL be `withheld` with a stable reason code, and sensitive values and
source paths SHALL NOT be retained in that entry.

#### Scenario: Publishable diagnostic becomes a reference

- **WHEN** existing reporter output, failure context, performance or leak digests, or sidecar traces
  are classified as sanitized
- **THEN** the manifest may reference them by kind, producer, media type, and relative path

#### Scenario: Sensitive artifact is withheld

- **WHEN** an artifact could expose identifying content, credentials, or host-local paths
- **THEN** the manifest records `withheld` with a stable reason code
- **AND** no sensitive value or source path is retained

### Requirement: Committed Seed SHALL be the required deterministic baseline

The **Committed Seed** SHALL be the required, synthetic, de-identified baseline available to every
blocking System E2E lane, and SHALL consist of portable declarative data plus only the minimal
synthetic attachment assets needed by approved scenarios. SQLite databases, WAL files, complete Zotero
profiles, machine-bound state, and generated runtime state SHALL NOT be committed as the seed.
Fixture identity SHALL have three independent fields: `schemaVersion` for the portable seed or
structure-contract shape, `fixtureId` for the fixture lineage and semantic purpose, and
`fixtureRevision` for the exact observable content revision a run consumes. A breaking shape change
SHALL advance `schemaVersion`; a change to scenario-observable content SHALL advance
`fixtureRevision`. Materialization SHALL be deterministic at the contract level, so that the same
revision yields the same declared structural facts and scenario preconditions; content-hash equality
SHALL NOT be required.

#### Scenario: Invocation materializes the seed

- **WHEN** a Committed Seed invocation starts
- **THEN** the runner validates the seed schema, declared identity, de-identification policy, declared
  structural facts, materialization into Zotero, and the resulting baseline preconditions

#### Scenario: Seed content changes

- **WHEN** scenario-observable content changes
- **THEN** `fixtureRevision` advances

#### Scenario: Seed shape changes

- **WHEN** the portable seed or structure-contract shape changes incompatibly
- **THEN** `schemaVersion` advances

#### Scenario: Committed Seed validation fails

- **WHEN** Committed Seed validation fails
- **THEN** the invocation is blocked

#### Scenario: Fixture revision is retired

- **WHEN** no active scenario, lane, or retained compatibility requirement references a revision
- **THEN** it is removed from the active registry
- **AND** no backward-compatibility behavior is added to current fixture loaders

### Requirement: Private Gold Source SHALL stay optional and read-only

The **Private Gold Source** SHALL be an optional, read-only real-library data or profile source used
only for selected large-library, stress, scheduled, manual, or otherwise explicitly configured
evidence, and SHALL be governed by a committed, de-identified **Gold Structure Contract**. No required
scenario SHALL depend exclusively on Private Gold Source availability. An optional gold lane MAY be
skipped when no source is configured, but once explicitly selected a missing or invalid source SHALL
fail that invocation. Before copying, the source owner SHALL provide a quiescent source: Zotero is
closed and its database, WAL, profile, and attachment view are mutually consistent. The runner SHALL
never write to the source. After copying, the runner SHALL remove machine-bound canonical identity,
prior sidecar executable and runtime state, old logs, and other declared ephemeral state, then validate
the copy against its Gold Structure Contract before starting scenarios. Every invocation SHALL receive
a new materialization or copy; a mutated copy SHALL NOT be reused. Committed fixtures, repository
history, run manifests, logs, and CI artifacts SHALL NOT contain real titles, authors, text, attachment
content, local paths, raw databases, credentials, stable source-item identifiers, or content-derived
hashes of private material.

#### Scenario: No gold source is configured

- **WHEN** a selected lane requires only the Committed Seed and no gold source is configured
- **THEN** the invocation proceeds and gold-dependent assertions are not silently treated as passing

#### Scenario: Selected gold lane lacks a source

- **WHEN** a gold lane is explicitly selected and its source is missing or invalid
- **THEN** that invocation fails

#### Scenario: Gold copy is prepared

- **WHEN** the runner copies a quiescent Private Gold Source
- **THEN** the source is left unmodified
- **AND** the copy is cleared of declared ephemeral state and validated against the Gold Structure Contract

### Requirement: Strategy specification SHALL be the catalog source of truth

One version-controlled OpenSpec strategy specification, `system-e2e-strategy`, SHALL be the semantic
source for the risk catalog, Scenario Families, Scenario Cases, ownership labels, regression
admission, quarantine, and promotion rules. Test directories SHALL remain the execution-membership
source. No JSON registry, runtime catalog loader, or parallel ownership artifact SHALL be introduced
unless implementation later demonstrates a machine-readable need. Every Scenario Case SHALL have one
stable ID, one trigger and execution path, at most one principal controlled fault, and one terminal
verdict, and SHALL run through the highest stable public entrypoint: Workbench or plugin lifecycle when
a user action exists, otherwise the formal protocol or Host Bridge CLI. The runner MAY control
processes, copied files, ports, and timing, and SHALL NOT call private supervisors, repositories, or
test-only production APIs.

#### Scenario: Phase 1 catalog is recorded

- **WHEN** the Phase 1 catalog is read from the strategy specification
- **THEN** it records the six families `SL`, `RH`, `PA`, `PM`, `CG`, and `HB`
- **AND** it records fifteen cases: `SL-01`, `SL-02`, `SL-03`, `RH-01`, `RH-02`, `PA-01`,
  `PA-02`, `PM-01`, `PM-02`, `PM-03`, `PM-04`, `CG-01`, `HB-01`, `HB-02`, and `HB-03`
- **AND** it records `CG-02` as the separate Windows Zotero 10 Citation Graph close-lifecycle regression

#### Scenario: Phase 2 catalog is recorded

- **WHEN** the Phase 2 catalog is read from the strategy specification
- **THEN** it records the four families `AC`, `AO`/`AT`, `SR`, and `AW`/`AP`
- **AND** it records fourteen cases: `AC-01`, `AC-02`, `AC-03`, `AC-04`, `AC-05`, `AO-01`,
  `AT-01`, `SR-01`, `SR-02`, `SR-03`, `SR-04`, `AW-01`, `AW-02`, and `AP-01`

#### Scenario: Case identity is stable

- **WHEN** a case is reviewed
- **THEN** it has exactly one stable ID, one trigger, at most one principal fault, and one terminal verdict

#### Scenario: Case uses a public entrypoint

- **WHEN** a case is implemented
- **THEN** it drives the highest stable public entrypoint available for its trigger
- **AND** it does not call a private supervisor, repository, or test-only production API

### Requirement: Phase 1 catalog SHALL cover the confirmed family cases

The strategy specification SHALL record the confirmed Phase 1 cases: Sidecar Lifecycle normal
lifecycle, pre-ready launch failure, and post-ready process loss and recovery; Reverse Host coherent
multi-page refresh and basis change during paging; Provenance and Artifact Resilience historical Topic
readability and bounded bad-artifact isolation; Public Maintenance admission winner and replay, pending
restart and continue, running restart and retry, and cooperative running cancellation; Citation Graph
stale continuation failing closed; and Host Bridge canonical mutation normal create and exact replay,
identity conflict, and admitted mutation interrupted before terminal evidence. Representative cases
SHALL use `refreshReferenceSidecarNow` for Public Maintenance and public `notes.create` with
deterministic synthetic Unicode text for Host Bridge canonical mutation.

#### Scenario: Representative Public Maintenance operation

- **WHEN** Public Maintenance cases execute
- **THEN** the representative operation is `refreshReferenceSidecarNow`
- **AND** it crosses the durable maintenance owner, real Reverse Host, and a visible Host effect

#### Scenario: Representative canonical mutation

- **WHEN** Host Bridge canonical mutation cases execute
- **THEN** the representative mutation is public `notes.create` with deterministic synthetic Unicode text
- **AND** duplication, UTF-8 transport, and user visibility are observable

#### Scenario: SL-01 normal lifecycle

- **WHEN** the plugin owner starts the production sidecar, invokes public `system.shutdown`, and observes shutdown through process exit
- **THEN** ready identity, accepted stopping response, discovery removal, and zero residual process or owner are recorded

#### Scenario: SL-02 pre-ready launch failure

- **WHEN** runner-controlled launch input fails before ready publication
- **THEN** a stable startup-failure outcome is recorded, acquired owners are rolled back, and no ready discovery exists

#### Scenario: SL-03 post-ready process loss and recovery

- **WHEN** the runner externally terminates a ready sidecar process before a later dispatch
- **THEN** exactly one replacement generation reaches ready, the old identity is unusable, and no orphan process or stale discovery remains

#### Scenario: RH-01 coherent multi-page refresh

- **WHEN** a public Reference refresh consumes multiple synthetic pages
- **THEN** every page belongs to one basis and the resulting ready state is committed once

#### Scenario: RH-02 basis changes during paging

- **WHEN** one controlled Host mutation changes the basis after the first page and before the next
- **THEN** the whole refresh fails with the typed basis-mismatch outcome, commits no mixed result, and a fresh-basis retry succeeds

#### Scenario: PA-01 historical Topic remains readable

- **WHEN** Workbench opens a committed historical Topic while its copied source is read-only
- **THEN** public content and provenance classification remain readable without migration or metadata rewrite

#### Scenario: PA-02 one bad artifact is bounded

- **WHEN** one oversized or malformed artifact appears beside valid artifacts in the public Index
- **THEN** valid neighbors remain available and the bad artifact produces one bounded typed diagnostic without failing the sidecar lifecycle

#### Scenario: PM-01 admission winner and replay

- **WHEN** the same public maintenance request identity is submitted twice
- **THEN** both observations resolve to one operation and receipt with one worker, one started event, one Host effect, and one terminal publication

#### Scenario: PM-02 pending restart and continue

- **WHEN** the process terminates after durable admission but before dispatch
- **THEN** restart yields `continuation_required` without work, and one compare-and-set `continue` winner completes the same operation identity

#### Scenario: PM-03 running restart and retry

- **WHEN** the process terminates while a public maintenance operation is running
- **THEN** restart records `restart_external_effect_unknown` without replay, and only the deterministic retry-successor insert winner may perform one new effect

#### Scenario: PM-04 cooperative running cancellation

- **WHEN** a running public maintenance operation is canceled
- **THEN** it exposes durable `cancel_requested` and becomes terminal `canceled` only at the promotion checkpoint with no post-cancel promotion

#### Scenario: CG-01 stale continuation fails closed

- **WHEN** a caller reuses a graph continuation or view after a public rebuild changes its basis
- **THEN** the request returns typed `basis_mismatch` with no page data or graph mutation and a fresh view remains readable

#### Scenario: HB-01 normal create and exact replay

- **WHEN** public `notes.create` is repeated with the same operation ID and semantic digest
- **THEN** canonical settled evidence remains queryable and exactly one note with exact Unicode content exists

#### Scenario: HB-02 identity conflict

- **WHEN** a settled operation ID is reused with a different semantic digest
- **THEN** canonical authority returns `idempotency_conflict` and the original note and evidence remain unchanged

#### Scenario: HB-03 admitted mutation is interrupted

- **WHEN** the owning process terminates after canonical durable admission but before terminal evidence
- **THEN** restart classifies the operation `unknown`, exposes it through `mutation.get_operation`, and never auto-replays the mutation

#### Scenario: CG-02 boundary is explicit

- **WHEN** `CG-02` is recorded
- **THEN** it is a distinct case because its trigger and stable outcome differ from `CG-01`
- **AND** it is the only Phase 1 case outside the fifteen-case catalog

#### Scenario: CG-02 Windows close lifecycle

- **WHEN** Windows Zotero 10 opens Workbench Citation Graph, renders it, and closes the Workbench
- **THEN** the host remains responsive through repeated close cycles and cleanup and health evidence are complete
- **AND** Zotero 9 is classified only from an actual run as affected, unaffected, or unverified

### Requirement: Phase 2 catalog SHALL cover the confirmed family cases

The strategy specification SHALL record the confirmed Phase 2 cases: ACP Transport and Run Lifecycle
normal run and workflow apply, stalled startup cancellation releasing admission, unexpected child exit
convergence, interrupt race preserving a non-cancelled result, and active run restart reconciliation;
ACP Ownership and Transcript Semantics conversation-owned write approval and side-channel updates not
splitting assistant text; SkillRunner Submission, Reconciliation, and Apply normal submission through
broker mutation, crash during apply never replayed, missing backend request reconciling once, and busy
backend handshake keeping the submission lane; and Real-host Publication and Platform Composition
SkillRunner detach and reattach, Linux chrome iframe publication, and Windows ACP Skill materialization
using native paths. Each P0 risk SHALL have a normal path and at least one failure or recovery path,
and each Case SHALL have one principal fault.

#### Scenario: Controlled ACP peer is minimal

- **WHEN** the ACP cases execute
- **THEN** a deterministic external NDJSON ACP child process owned by the existing E2E runner supplies
  only normal completion, startup stall, controlled exit, and cancel/result race modes
- **AND** plugin-side transport, lifecycle, persistence, projection, and apply logic remain production
  participants

#### Scenario: SkillRunner peer is extended, not replaced

- **WHEN** the SkillRunner cases execute
- **THEN** the existing controlled HTTP peer gains only the handshake throttle and runner-controlled
  restart required by the selected faults
- **AND** no second SkillRunner peer is created

#### Scenario: Workflow-to-broker ownership is not duplicated

- **WHEN** `AC-01` and `SR-01` execute
- **THEN** they prove different production producers reaching the shared workflow apply and broker modules
- **AND** digest calculation, authority retention and expiry, and the full broker operation matrix remain
  lower-layer or Phase 1 evidence

#### Scenario: AC-01 normal ACP Skills run and apply

- **WHEN** the public ACP Skills path completes one controlled-child prompt and applies its result
- **THEN** the durable run reaches succeeded, preserves its owner, records succeeded apply and typed mutation evidence, and creates exactly one bounded Zotero effect

#### Scenario: AC-02 stalled startup cancellation

- **WHEN** the controlled child stalls before readiness and the submission is canceled
- **THEN** adapter close is bounded, connected is not falsely published, admission identities are released, no child remains, and a follow-up submission is admitted

#### Scenario: AC-03 unexpected child exit

- **WHEN** the controlled ACP child exits during an active turn
- **THEN** one typed unexpected-exit terminal outcome is recorded after bounded stream drain with no leaked process or pipe

#### Scenario: AC-04 cancel and result race

- **WHEN** the child returns a non-cancelled prompt result inside the grace period after `session/cancel`
- **THEN** the prompt settles from its original result, the interrupt is `unconfirmed`, trailing transcript updates remain visible, and no canceled terminal is published

#### Scenario: AC-05 active run restart reconciliation

- **WHEN** Zotero restarts with one non-terminal ACP Skill run whose remote session cannot recover
- **THEN** startup reconciliation settles it once with `startup_reconcile`, clears active ownership and admission, and preserves typed diagnostics

#### Scenario: AO-01 approvals remain conversation-owned

- **WHEN** two ACP Chat conversations request writes over one Host Bridge connection
- **THEN** approvals, scopes, operations, results, and terminal evidence remain with their invoking conversation, approved writes create one effect, and denied writes create none

#### Scenario: AT-01 side-channel updates preserve assistant text

- **WHEN** assistant chunks are interleaved with tool, usage, status, and workspace updates before a true hard boundary
- **THEN** ACP Chat and ACP Skills each retain one stable assistant segment and publish the same semantic transcript through the real chrome frame

#### Scenario: SR-01 normal SkillRunner submission and apply

- **WHEN** the public workflow completes handshake, upload, poll, result fetch, and apply
- **THEN** one request-ready, provider success, apply success, typed mutation receipt, and bounded Zotero effect are recorded

#### Scenario: SR-02 crash during apply is not replayed

- **WHEN** Zotero terminates after durable `apply.started` but before settlement
- **THEN** restart classifies the apply ambiguous or unrecoverable, performs no backend repoll or broker redispatch, and records at most the effect already observed

#### Scenario: SR-03 missing backend request reconciles once

- **WHEN** the controlled SkillRunner restarts after request identity becomes durable and loses that request
- **THEN** reconciliation terminalizes the run once with its typed missing-request reason, releases admission, performs no apply, and admits a follow-up submission

#### Scenario: SR-04 busy backend handshake uses submission lane

- **WHEN** ordinary backend work is throttled while a new submission starts
- **THEN** execution preflight runs on the submission lane and is not skipped as a background health probe

#### Scenario: AW-01 detach and reattach preserves publication identity

- **WHEN** the real Assistant Workspace closes and reopens during a live SkillRunner run
- **THEN** transcript revision stays monotonic, run and reply state remain current, and transcript updates do not rebuild unrelated managed regions

#### Scenario: AW-02 Linux iframe publishes completed transcript

- **WHEN** a SkillRunner run completes with a transcript boundary in the Linux Zotero chrome iframe
- **THEN** its row renders without a forced timer probe

#### Scenario: AP-01 Windows materialization uses native paths

- **WHEN** ACP Chat starts one whitelisted Skill on Windows Zotero 10
- **THEN** workspace roots are materially present through Zotero native file APIs with native path syntax and readiness follows successful materialization

### Requirement: Case evidence SHALL use stable public and typed assertions

Cases SHALL assert applicable user-visible state, durable typed run, apply, or mutation evidence,
transport lifecycle evidence, bounded Zotero counts or canonical refs, and process and cleanup facts.
They SHALL record typed or public outcomes, lifecycle checkpoints, cleanup, Suite Health Gate status,
and artifact references in the Run Manifest. They SHALL NOT assert full log prose, UI copy, private
call order, complete persistence rows, or raw local paths.

#### Scenario: Assertion is stable

- **WHEN** a case asserts an outcome
- **THEN** the assertion targets a user-visible state, durable typed evidence, a bounded count, or a
  process fact

#### Scenario: Unstable assertion is rejected

- **WHEN** a case would assert log prose, UI copy, private call order, or a raw local path
- **THEN** the assertion is not admitted

### Requirement: Scenario Families SHALL record a module ownership label

Each Scenario Family SHALL record the production module that semantically owns it, using the labels
`SL` Synthesis sidecar runtime lifecycle, `RH` Reverse Host boundary, `PA` provenance and
canonical-artifact classification, `PM` public maintenance operation lifecycle, `CG` Citation Graph
application, `HB` Host Bridge canonical mutation authority, `AC` ACP transport and run lifecycle,
`AO` ACP conversation and approval ownership, `AT` shared ACP transcript projection, `SR`
SkillRunner runtime and reconciliation, `AW` Assistant Workspace publication, and `AP` ACP Skill
materialization and runtime persistence. These labels SHALL be navigation and accountability metadata
only: no steward role, approval chain, named-person registry, or code-owners policy SHALL be created,
and the sole maintainer SHALL own the shared runner, fixture registry, Run Manifest, and CI matrix as
one responsibility.

#### Scenario: Family ownership is inspected

- **WHEN** a family's ownership is reviewed
- **THEN** its recorded label identifies the production module that owns its semantics

#### Scenario: Ownership does not create roles

- **WHEN** ownership labels are used
- **THEN** no human role, approval chain, or code-owners policy is implied

### Requirement: Catalog updates SHALL follow the semantic change boundary

The catalogs SHALL be updated only when a change alters their semantics: a cross-process contract or
public DTO; lifecycle, restart, cancel, timeout, or cleanup behavior; durable admission, replay,
deduplication, or recovery; owner, permission, approval, or mutation routing; fixture preconditions,
stable assertions, or evidence shape; supported Zotero, platform, or runtime composition; or a newly
discovered cross-boundary regression. Ordinary refactors and user-facing copy changes SHALL NOT require
a no-op catalog edit. When a scenario change alters structural preconditions or expected facts, the
scenario catalog and the fixture and evidence contract SHALL change together.

#### Scenario: Semantic change updates the catalog

- **WHEN** a change alters a public DTO, lifecycle behavior, recovery semantics, routing, fixture
  preconditions, evidence shape, or supported composition
- **THEN** the affected catalog entries are updated in the same change

#### Scenario: Ordinary refactor

- **WHEN** a change is an ordinary refactor or copy change
- **THEN** no catalog edit is required

#### Scenario: Preconditions change with expected facts

- **WHEN** a scenario's structural preconditions change
- **THEN** the fixture and evidence contract change with the scenario catalog

### Requirement: Regression admission SHALL triage every cross-boundary regression in place

Every newly discovered cross-boundary regression SHALL be triaged in its existing bug or change record
before that record closes, receiving exactly one disposition: link the evidence to an existing risk and
Scenario Case when the invariant is already covered; amend or split a Scenario Case when the trigger
mechanism or stable assertion differs; or retain lower-layer evidence with the required Contract
Integration Test rationale and an explicit promotion condition. A historical bug SHALL NOT
automatically become a new Scenario Case, and unmapped research findings SHALL receive the same triage
during implementation handoff.

#### Scenario: Regression is already covered

- **WHEN** a new regression shares the catalog's invariant
- **THEN** its evidence is linked to the existing risk and case

#### Scenario: Trigger or assertion differs

- **WHEN** a new regression has a distinct trigger mechanism or stable assertion
- **THEN** the case is amended or split

#### Scenario: Lower-layer retention

- **WHEN** the regression is retained as lower-layer evidence
- **THEN** the record carries the Contract Integration Test rationale and an explicit promotion condition

### Requirement: Quarantine SHALL be evidence-bound and expiring

Quarantine SHALL isolate a test without lowering the underlying risk priority; there SHALL be no silent
skip or automatic downgrade. A quarantine SHALL require a dedicated GitHub issue recording the Scenario
Case, affected lane or matrix cell, first failing Run Manifest, evidence that the instability is in test
infrastructure rather than unresolved product behavior, temporary substitute evidence, the maintainer
responsible, and an expiry defaulting to 14 days or three scheduled executions, whichever comes first. A
P0 case MAY leave its original blocking lane only when equivalent blocking evidence still covers the
same invariant, otherwise it SHALL remain blocking. A P1 case MAY move temporarily to scheduled
non-blocking observation. Expiry SHALL NOT renew automatically; continuation SHALL require fresh
evidence on the issue. Restoration SHALL require three consecutive independent clean executions under
the current fixture and runtime identities for every affected cell, disappearance of the original
failure signature, and passing health gates. Closing the quarantine issue and restoring the blocking
configuration SHALL happen in the same change.

#### Scenario: Quarantine is opened

- **WHEN** a case is quarantined
- **THEN** a dedicated issue records the case, cell, first failing manifest, infrastructure evidence,
  substitute evidence, responsible maintainer, and expiry

#### Scenario: P0 loses its blocking lane

- **WHEN** a P0 case is quarantined without equivalent blocking evidence for the same invariant
- **THEN** it remains blocking

#### Scenario: Quarantine expires

- **WHEN** the expiry is reached
- **THEN** continuation requires fresh evidence recorded on the issue

#### Scenario: Quarantine is lifted

- **WHEN** three consecutive independent clean executions pass for every affected cell and the original
  failure signature is absent
- **THEN** the issue is closed and the blocking configuration restored in the same change

### Requirement: Initial execution matrix SHALL use the fixed target and family cells

The initial Committed Seed matrix SHALL run `SL+PM` on Zotero 10/Linux for pull requests; all six
Phase 1 families on Zotero 7, 9, and 10/Linux for main; and all six families on Zotero 7, 9, and 10
for Linux and Windows in the tag-triggered pre-publication release gate. Existing Zotero 10 macOS x64
and arm64 formal-XPI smoke SHALL remain non-blocking release evidence. Weekly scheduled execution SHALL
repeat the release-equivalent Linux/Windows matrix as non-gating health evidence; scheduled stress
SHALL run only the selected Zotero 10/Linux stress scenario; manual large-gold SHALL run `RH`, `PA`,
`PM`, and `CG` on Zotero 10/Linux and SHALL fail when explicitly selected without a valid read-only
Private Gold Source. Every pull request targeting `main` SHALL run the PR cell with no path-based skip.
Release evidence SHALL use final tag-bound plugin and sidecar identities and SHALL complete before
publication; main evidence SHALL NOT substitute for release evidence.

#### Scenario: Pull request cells are selected

- **WHEN** a pull request targets `main`
- **THEN** Zotero 10/Linux runs the `SL+PM` cell
- **AND** the cell is blocking only after its own calibration and explicit promotion

#### Scenario: Main cells are selected

- **WHEN** the main lane runs
- **THEN** Zotero 7, 9, and 10/Linux each run all six Phase 1 families

#### Scenario: Release cells are selected

- **WHEN** the tag-triggered pre-publication release lane runs
- **THEN** Zotero 7, 9, and 10 on Linux and Windows each run all six Phase 1 families against final tag-bound identities
- **AND** Zotero 10 macOS x64 and arm64 retain non-blocking formal-XPI smoke only

#### Scenario: Non-gating evidence is selected

- **WHEN** weekly, stress, or manual large-gold execution is requested
- **THEN** only its fixed targets and family grouping run
- **AND** the result remains non-gating and cannot become release authority

### Requirement: Candidate budgets SHALL be grouping thresholds

The initial critical-path grouping thresholds SHALL be 15 minutes for pull requests, 30 minutes for
main, 45 minutes for release, 60 minutes for scheduled execution, and 90 minutes for manual large-gold.
They SHALL NOT be treated as observed runtime measurements or direct timeout values. When three clean
rounds exceed the applicable threshold, grouping SHALL split first into Synthesis (`SL/RH/PA/PM/CG`)
and Host Bridge (`HB`), and then, only if still required, into recovery (`SL/PM`), Synthesis read/data
(`RH/PA/CG`), and Host Bridge (`HB`).

#### Scenario: Observed maximum exceeds the threshold

- **WHEN** the maximum of three clean rounds exceeds its lane's candidate budget
- **THEN** the cell is regrouped in the fixed family-preserving order and each new grouping is recalibrated

#### Scenario: Observed maximum stays within the threshold

- **WHEN** three clean rounds stay within the applicable candidate budget
- **THEN** the complete family grouping remains one invocation per target

### Requirement: Calibration and promotion SHALL be evidence-bound

Every prospective blocking System E2E cell SHALL start non-blocking and SHALL become blocking only after
three complete clean Run Manifests from three independent workflow executions on its exact target and
runner environment, each with a fresh profile and matching calibration identity. Promotion SHALL
require human review of the manifests and an explicit configuration change and SHALL never be
automatic. A missing, invalid, mixed-identity, stale, or non-clean round SHALL NOT authorize promotion,
and an invalid cleanup, health, process, port, lock, identity, or terminal state SHALL invalidate the
round. Candidate critical-path budgets SHALL be grouping thresholds rather than invented runtime
measurements, and an exceeded budget SHALL split groupings only in the agreed family-preserving order
without splitting a family or sharing a profile. Calibration SHALL be invalidated by a Zotero target
version change, runner OS or image change, family regrouping, fixture scale-class change, sidecar
startup-model change, or invocation/profile-model change.

#### Scenario: Cell is calibrated

- **WHEN** three complete clean independent rounds with matching calibration identity are reviewed
- **THEN** the cell may be promoted by an explicit configuration change

#### Scenario: Round is unclean

- **WHEN** a round has invalid cleanup, health, process, port, lock, identity, or terminal state
- **THEN** the round does not count toward calibration

#### Scenario: Budget is exceeded

- **WHEN** three clean rounds exceed the applicable grouping threshold
- **THEN** the grouping splits in the agreed order
- **AND** no family is split and no profile is shared across cells

#### Scenario: Calibration identity changes

- **WHEN** the Zotero target, runner OS or image, family grouping, fixture scale class, sidecar
  startup-model, or invocation/profile model changes
- **THEN** the existing calibration is invalidated

### Requirement: Blocking lanes SHALL NOT auto-retry and only weekly orchestration MAY rerun once

Pull-request, main, and release System E2E cells SHALL run once per workflow attempt and SHALL retain a
failed, aborted, incomplete, or indeterminate verdict. Only weekly scheduled orchestration MAY rerun a
failed cell, at most once, outside the Zotero runner, for the complete failed cell rather than an
individual case, with a fresh profile and a new run ID whose predecessor points to the first attempt.
The first attempt's manifest and sanitized diagnostics SHALL be immutable and stored separately. A
successor pass SHALL classify the result `intermittent`, a successor failure SHALL classify it
`persistent`, and any first-attempt failure SHALL keep the scheduled workflow failed. Scheduled,
stress, and manual-gold lanes SHALL remain non-gating.

#### Scenario: Blocking cell fails

- **WHEN** a blocking PR, main, or release cell does not produce a complete passing manifest
- **THEN** the gate fails with the first attempt's evidence
- **AND** no automatic successor attempt is created

#### Scenario: Weekly cell fails then passes

- **WHEN** a weekly cell fails its first attempt and its single complete rerun passes
- **THEN** both manifests remain separately available and linked
- **AND** the cell is classified `intermittent`
- **AND** the weekly workflow remains failed

#### Scenario: Weekly cell fails twice

- **WHEN** the first attempt and its single complete rerun fail
- **THEN** the cell is classified `persistent`
- **AND** no further automatic attempt runs

### Requirement: R9 and Stage-1 acceptance SHALL remain a separate completion owner

The active `complete-synthesis-r9-stage1-acceptance` change SHALL remain independent and SHALL remain
the completion owner for R9 and Stage-1 candidate, package, installation and migration, lifecycle, and
real-machine acceptance. Phase 1 Run Manifest references MAY be supplied to the R9 evaluator only when
candidate identity and environment match exactly. `SL-01`, `SL-02`, and `SL-03` SHALL be shared
implementation and evidence producers, and each SHALL be implemented once while emitting both verdicts
when bound to the immutable candidate. Candidate envelope identity mismatch SHALL NOT be conflated with
Host Bridge idempotency conflict. The R9 receipt envelope, seven native bundles, universal XPI and
non-publication checks, install and migration matrix, parent-EOF and crash-fuse lifecycle, production
lock ownership, operator runbook, and the complete seven-surface real-machine matrix SHALL stay owned by
that change.

#### Scenario: Shared evidence is reused

- **WHEN** an R9 acceptance run uses the same authenticated shutdown, pre-ready failure, or post-ready
  replacement-generation fault as `SL-01`, `SL-02`, or `SL-03`
- **THEN** the shared execution path is implemented once in `tests/zotero/e2e/full`
- **AND** cleanup, Suite Health Gate, typed diagnostics, and artifact references are recorded once

#### Scenario: Identity does not match

- **WHEN** a Phase 1 manifest is offered to the R9 evaluator without matching candidate identity and
  environment
- **THEN** it is not accepted as R9 acceptance evidence

#### Scenario: Non-shared R9 gates

- **WHEN** the catalog and the R9 change are compared
- **THEN** `RH-01/02`, `PA-02`, `PM-01/02/03/04`, `CG-01`, and `HB-01/02/03` remain Phase 1
  System E2E-owned
- **AND** `PA-01` is reusable supporting readability evidence only, not a migration or installation
  acceptance case

### Requirement: The implementation program SHALL be strictly serial

The program SHALL consist of five strictly serial OpenSpec changes — runner foundation, fault control
and sidecar recovery, Phase 1 catalog, CI calibration and promotion, and Phase 2 catalog — where each
successor starts only after its predecessor is implemented, verified, and synchronized or archived
under the normal OpenSpec workflow. A change SHALL NOT claim acceptance from logs, skipped required
evidence, reused contaminated profiles, private data, or a later change's unfinished work. Each change
SHALL update its tasks and documentation before verification.

#### Scenario: Predecessor is unfinished

- **WHEN** a predecessor change is not implemented, verified, and synchronized or archived
- **THEN** its successor does not start

#### Scenario: Acceptance is claimed

- **WHEN** a change claims acceptance
- **THEN** its required public, typed, lifecycle, cleanup, and health evidence exists under its own
  fixture and runtime identity
