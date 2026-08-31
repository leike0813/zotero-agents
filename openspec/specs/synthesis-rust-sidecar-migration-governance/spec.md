# synthesis-rust-sidecar-migration-governance Specification

## Purpose
Governs the Rust sidecar migration by binding local worker-transfer parity evidence and candidate-workflow ordering, and serves as the anchor for the cutover separation governance added by the cut-over change.
## Requirements
### Requirement: R8 local acceptance SHALL include native worker-transfer parity

R8 local gates SHALL run a shared Node/Rust worker-transfer corpus covering lifecycle, integrity, bounds, busy admission, expiry, cleanup, rollback, retry, canonical bytes, and hashes.

#### Scenario: Local migration gates run
- **WHEN** R8 implementation is validated
- **THEN** the native worker-transfer checker, Rust tests, Stage-1 suite, smoke, and 15/75 MiB gates SHALL pass
- **AND** Node remains a read-only differential oracle

### Requirement: Candidate workflow SHALL check worker-transfer ownership before smoke

The seven-platform read-only candidate workflow SHALL run the native worker-transfer checker before native smoke and SHALL NOT publish, dispatch a release, or change production ownership.

#### Scenario: Candidate workflow is inspected
- **WHEN** workflow steps are ordered
- **THEN** worker-transfer parity SHALL precede smoke on every platform
- **AND** release, XPI cutover, signing claims, and Gitee synchronization SHALL remain absent

### Requirement: R9a implementation MAY proceed with R8 remote evidence deferred

R8 seven-platform remote evidence MAY remain an explicit external debt while R9a artifacts and local implementation proceed. The debt MUST NOT be represented as passing evidence, and R9a SHALL NOT dispatch, publish, sign, synchronize, or declare complete R9/Stage 1 release acceptance.

#### Scenario: R9a local acceptance is reported
- **WHEN** local contracts, cutover rehearsal, tests, and builds pass without R8 remote results
- **THEN** the report identifies the remote evidence as pending
- **AND** makes no seven-platform, signed-XPI, or real-machine completion claim

### Requirement: R9a and R9b SHALL remain separately auditable

R9a SHALL establish Rust as the sole production owner and make plugin legacy
code unreachable from production. R9b SHALL execute through the dependency-ordered
`remove-synthesis-plugin-legacy-owner` and
`remove-synthesis-node-sidecar-stack` changes within the same release
milestone. The first R9b change SHALL remove the plugin owner; the second SHALL
remove the executable Node oracle, worker/build stack, dependencies, and
release inventory. No intermediate state may be released, and neither change
may add a request fallback or share live roots.

#### Scenario: R9 changes are reviewed
- **WHEN** the R9a and two R9b changes are compared
- **THEN** every retained/deleted implementation area is assigned exactly once
- **AND** production routes contain no legacy fallback throughout the sequence

#### Scenario: R9a deletion inventory is reviewed
- **WHEN** R9a is ready for verification
- **THEN** production routes contain no legacy fallback
- **AND** retained oracle source is listed for R9b rather than deleted opportunistically

#### Scenario: First R9b deletion change completes
- **WHEN** the plugin legacy owner is absent but the external Node oracle remains
- **THEN** the repository remains an unreleased migration state
- **AND** the next change owns every remaining Node removal

### Requirement: Acceptance SHALL require one source-fresh evidence chain

Sidecar acceptance SHALL require all four application differential gates, the governed 2k/10k/25k production-route performance gate, and the complete unfiltered core suite to pass from the same candidate source identity. Intentional differential normalization SHALL be exact, role-specific, and centrally owned.

#### Scenario: Candidate is proposed for acceptance
- **WHEN** any required gate has no current-source sample, fails, is filtered, or relies on a broad table or payload allowance
- **THEN** acceptance remains blocked

#### Scenario: Rust has the registered redirect-graph migration marker
- **WHEN** the Rust parity database contains the exact registered marker absent from the baseline Node oracle
- **THEN** the central parity policy may omit only that exact Rust key/value row
- **AND** every other schema row remains part of the differential

### Requirement: Production route evidence SHALL verify behavior rather than Rust source shape

The durable production-capability gate SHALL continue to compare the language-neutral manifest, operation metadata, grouped TypeScript contract, and surface corpora. Rust verification SHALL independently prove manifest fingerprint integrity, catalog completeness, plan validity, membership, and representative dispatch behavior. Acceptance evidence MUST NOT require a duplicated Rust ready roster, digest constant, fixed inventory count, registration macro, or dispatcher source-text pattern.

#### Scenario: Internal Rust organization changes without contract drift
- **WHEN** the manifest, grouped client, corpora, validated Rust catalog, and observable route behavior remain coherent
- **THEN** the production-capability gate passes without inspecting Rust implementation text

#### Scenario: Rust catalog loses a declared route
- **WHEN** the embedded manifest declares a capability with no Rust handler
- **THEN** Rust catalog validation fails before readiness
- **AND** language-neutral inventory evidence remains unchanged rather than being rewritten to hide the defect

### Requirement: Sidecar tests SHALL use explicit temporary-resource ownership

Tests that own temporary repository, canonical-store, socket, or process state
SHALL place that state under one shared test-root owner and SHALL release every
dependent owner before cleanup. Cleanup failure after a successful test SHALL
fail the test. Cleanup failure while another panic is active SHALL be reported
without replacing the primary failure. Production cleanup and tests whose
observable subject is deletion behavior SHALL remain explicit.

#### Scenario: A repository fixture completes successfully
- **WHEN** its repository, migration connections, background tasks, and child
  processes have been released
- **THEN** its test root SHALL be removed exactly once
- **AND** a remaining platform handle SHALL cause a cleanup failure

#### Scenario: Test execution is already unwinding
- **WHEN** fixture cleanup also encounters an error
- **THEN** the original panic SHALL remain primary
- **AND** the cleanup error SHALL remain visible as secondary diagnostics

### Requirement: Sidecar verification SHALL report the complete host test result

The canonical local and three-host verification commands SHALL run the complete
Rust workspace without stopping after the first failing test binary. Tests that
prove ordering or temporary absence SHALL use observable synchronization rather
than fixed elapsed-time assumptions. Polling an external lifecycle MAY use a
bounded deadline when no event-driven interface exists.

#### Scenario: More than one crate has a regression
- **WHEN** the workspace is verified on a host
- **THEN** all reachable test binaries SHALL execute despite an earlier failure
- **AND** the host result SHALL fail with the complete collected evidence

#### Scenario: A test observes concurrent work
- **WHEN** correctness depends on a participant starting, reaching a checkpoint,
  or completing
- **THEN** the test SHALL wait on that observable event
- **AND** SHALL NOT infer it solely from a sleep duration

### Requirement: Rust acceptance SHALL be backed by the fixed native-service baseline

Rust Synthesis acceptance SHALL use `main@e210997a11e0054a3cb4ae0656e5cfb96102a09c` as the executable functional baseline. The audit SHALL reconcile all 131 public baseline methods with the closed native wire inventory and SHALL retain baseline-derived observable evidence independent of Git branch availability.

#### Scenario: Migration inventory is reviewed
- **WHEN** the fixed baseline, grouped client, wire manifest, dispatcher, and consumers are compared
- **THEN** every baseline method has exactly one migrated, merged, Host-owned, or approved-retired disposition
- **AND** every retired method belongs to the exact 23-method authorization in the migration SSOT and has no production consumer

#### Scenario: Parity evidence runs
- **WHEN** a production capability is claimed ready
- **THEN** a real Rust production-route case proves its DTO, facts/effects, failure, and reopen behavior
- **AND** roster or source-string presence alone is insufficient

#### Scenario: Reverse-Host roster entry lacks a caller
- **WHEN** the Topic representative-image read, Related Items effect, or staged Tag binding resolver is present in the capability roster but unreachable from its production entry point
- **THEN** the capability is not behaviorally migrated
- **AND** the change remains open until real-route evidence proves its request, facts/effects, failure behavior, and reopen result

### Requirement: Destructive retirement SHALL remain blocked until parity and scale pass

Plugin legacy and Node oracle deletion SHALL NOT begin while any baseline disposition is unresolved, any production route relies on placeholder or wrong behavior, or the real-route 10k/25k and representative Zotero 7/9 gates are incomplete.

#### Scenario: Existing local suites pass without baseline parity
- **WHEN** contract/package/unit suites pass but fixed-baseline or real-route evidence is incomplete
- **THEN** the migration remains pre-acceptance
- **AND** both destructive retirement changes remain blocked

#### Scenario: Full restoration gates pass
- **WHEN** every disposition and production operation has accepted behavior evidence and all scale/real-machine gates pass for one source identity
- **THEN** retirement planning may resume
- **AND** release remains separately authorized

### Requirement: R9b retirement SHALL require a durable R9a baseline

Physical retirement of plugin legacy or Node sidecar code SHALL NOT begin until
the R9a capability, corpus partition, dispatcher, ready-roster, critical-smoke,
boundary, lifecycle, recovery, TypeScript, Rust, Stage-1, and production-build
gates pass without reading active or archived OpenSpec change artifacts.

#### Scenario: R9a code is implemented but an archival-safe gate fails
- **WHEN** a required checker or test cannot reproduce its result from current-state contracts and source
- **THEN** the retained implementations remain in place
- **AND** neither dependent R9b deletion change is apply-ready in practice

### Requirement: Pre-deletion candidate evidence SHALL be recorded separately

Before destructive R9b deletion begins, the project SHALL record one
seven-platform native candidate result and the agreed representative
clean-machine results for the same source identity. The receipt MUST bind the
source commit, Rust toolchain, Cargo lock identity, seven target fingerprints,
per-target compressed sizes, workflow identity, and outcomes. Candidate
evidence MUST NOT be represented as signing, final XPI, offline-install,
upgrade, release, or complete Stage-1 acceptance.

#### Scenario: Candidate matrix passes
- **WHEN** all seven native targets and representative clean-machine checks pass for one source identity
- **THEN** the first destructive R9b change may begin
- **AND** final package and real-machine gates remain pending

#### Scenario: Candidate evidence is absent or mixed
- **WHEN** a target is missing, source identities differ, or a result is only inferred from local tests
- **THEN** destructive retirement remains blocked

### Requirement: R9 current-state documentation SHALL match executable ownership

The Rust migration plan and active Synthesis architecture documents SHALL state
the actual production owner, route readiness, mutation state, retained
retirement inventory, dependent R9b changes, and pending external evidence.
They MUST NOT describe completed native routing as pending or report unexecuted
remote evidence as passing.

#### Scenario: R9a baseline is reviewed
- **WHEN** code, contract, test, and documentation inventories are compared
- **THEN** ownership and readiness statements agree with the executable gates
- **AND** every retained legacy/Node area is assigned to one downstream deletion change

### Requirement: R9b SHALL preserve accepted evidence without executable Node

Before deleting executable Node code, R9b SHALL map every stable public DTO,
error, canonical byte/hash, repository/recovery, worker reliability, and
package invariant to a surviving language-neutral corpus, Rust test, public
client test, or native package gate. Node private class shape, module
resolution, internal call order, worker messages, and other implementation-only
assertions MUST be deleted rather than recreated.

#### Scenario: Node-dependent evidence is inventoried
- **WHEN** a checker, benchmark, or test imports the Node service or worker
- **THEN** its stable observable invariant has one named surviving owner or is explicitly classified as implementation-only
- **AND** the Node import is removed before the workspace is deleted

### Requirement: R9 and Stage 1 completion SHALL require separately governed final acceptance

This change MAY finish source retirement after its local native-only gates and
an authorized post-deletion seven-target candidate pass. R9 and Stage 1 SHALL
remain incomplete until `complete-synthesis-r9-stage1-acceptance` binds the
final XPI, installation, failure, migration, runbook, and Zotero 7/9
real-machine results to one source identity. Passing either change MUST NOT by
itself publish a release or authorize Gitee synchronization.

#### Scenario: Retirement and candidate gates pass without final matrix
- **WHEN** Node source is absent and all local plus authorized seven-target
  candidate checks pass but XPI, installation, or real-machine evidence is incomplete
- **THEN** this retirement change may complete
- **AND** R9 and Stage 1 MUST remain explicitly incomplete

#### Scenario: Separate final matrix passes
- **WHEN** the acceptance change binds every required result to the same approved source identity
- **THEN** R9 and Stage 1 may be declared complete
- **AND** release publication remains a separate explicitly authorized action
