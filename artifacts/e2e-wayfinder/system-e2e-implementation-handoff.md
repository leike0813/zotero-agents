# System E2E Wayfinder implementation handoff

> Status: decision-complete handoff, 2026-09-17
>
> Destination: implement the project-wide System End-to-End Test strategy through the five numbered OpenSpec changes under `openspec/changes/01-*` through `05-*`.
>
> Agent rule: read this document and the active change's proposal, specs, design, and tasks. The GitHub Wayfinder issues are provenance only; implementation does not require rereading them.

## Authority and update rule

This document consolidates every decision from the System E2E Wayfinder map and its completed decision tickets, including the Windows Citation Graph close-crash addendum. It also records the repository investigation and the implementation design embodied in the five apply-ready OpenSpec changes.

The current OpenSpec capability specs remain the normative behavior contracts. The active change's `design.md` and `tasks.md` remain the executable plan for that stage. This handoff supplies the shared reasoning and cross-change context that those files intentionally do not repeat. If implementation discovers a material conflict with current source, treat source as evidence, update this handoff and the owning OpenSpec artifact together, and do not reconstruct intent from issue comments.

There are no unresolved in-scope product or architecture decisions. Concrete filenames for new runner-owned modules may follow existing repository conventions, but the owners, interfaces, behavior, sequence, evidence, and acceptance gates below are fixed.

## Destination and boundaries

The destination is a project-wide System E2E strategy that prevents cross-boundary regressions across real Zotero, the production plugin, the current-source Synthesis sidecar, Host Bridge, ACP, and SkillRunner.

The implementation extends the existing `npm run test:zotero:e2e` path and `tests/zotero/e2e/full`. It keeps one runner, one directory-membership source, and one strategy specification. It does not add a parallel runner, runtime scenario registry, JSON catalog, generic profiler, global fault-injection service, or percentage-based E2E coverage target.

Phase 1 covers the highest-risk Synthesis paths and one Host Bridge canonical-mutation replay path. Phase 2 covers ACP, SkillRunner, approval ownership, transcript semantics, Assistant Workspace publication, and Windows ACP Skill materialization.

The active `complete-synthesis-r9-stage1-acceptance` change remains independent. It may consume matching lifecycle evidence under the identity rules below, but neither program owns the other's completion.

## Shared vocabulary

### Evidence categories

**System End-to-End Test** means a user-visible or public production path through a real Zotero process and the production plugin. When Synthesis is in scope, the current-source real sidecar also participates. A controlled peer may replace only a system outside the boundary being tested.

**Contract Integration Test** means a protocol or multi-module seam exercised by production participants without traversing that complete system path.

Directory and command names are not the taxonomy. A `lite` test can be System E2E for its public path; a test under `full`, `e2e`, or `integration` can still be Contract Integration when it replaces the seam that carries the risk. The `e2e` primary domain is the home of the project-wide scenario catalog, not the exclusive location of all System E2E evidence.

### Execution terms

- **Scenario Family**: the unit that owns a namespace, created state, cleanup, and any explicitly declared carry-over.
- **Scenario Case**: one stable ID, one trigger and execution path, at most one principal controlled fault, and one terminal verdict.
- **Committed Seed**: the required synthetic, deterministic, de-identified baseline available to every blocking E2E lane.
- **Private Gold Source**: optional read-only real-library data used only by selected stress, scheduled, manual, or large-library evidence.
- **Gold Structure Contract**: the committed de-identified structural projection used to validate a Private Gold copy; it is not a reproducible seed.
- **Suite Baseline**: one copied profile containing the materialized seed plus the production plugin and current-source sidecar initialized for one invocation.
- **Family Namespace**: the library objects, operation identities, files, and other durable identities owned by one family.
- **Owned State**: all state the family must clean, including exclusively held profile-global state.
- **Carry-over Set**: state a restart or reconciliation family intentionally retains only between phases of that same family.
- **Suite Health Gate**: the minimal post-initialization and post-family check for host/plugin responsiveness, expected sidecar readiness, undeclared operations/processes, and family cleanup.
- **Run Manifest**: the runner-owned sanitized verdict and artifact index for one invocation.
- **Execution Cell**: one trigger lane, exact Zotero/platform target, Scenario Family grouping, runner environment, fixture scale class, invocation/profile model, gate state, and immutable plugin/sidecar identity.

## Historical evidence and risk model

Historical regressions cluster around five recurring seam invariants:

1. strict request/response projection across Reverse Host and sidecar protocols;
2. discovery, capability, or handshake publication only after the underlying owner is ready;
3. one convergent terminal state across transports, durable stores, apply owners, and UI projections;
4. provenance-preserving canonical versus legacy and current versus historical classification;
5. typed JSON, byte, UTF-8, path, and platform semantics across Host Bridge, MCP, ACP, and sidecar boundaries.

The repository already has strong local evidence for algorithms, DTOs, Rust durability, process lifecycle, worker framing, cross-language schemas, and Zotero-native adapters. System E2E adds evidence only where real composition contributes an owner, lifecycle, timing, persistence, filesystem, platform, or recovery risk. Existing effective lower-layer tests remain the primary proof for their seams.

Risks are cataloged as **Seam × Invariant × Consequence**, not by whole module or historical ticket.

- **P0**: violation can cause durable corruption, duplicate or unauthorized mutation, cross-owner permission leakage, system-wide liveness loss, or a terminal state requiring manual repair; or the same invariant has recurred independently without production-path E2E evidence.
- **P1**: user-visible or public-path failure bounded to one operation or owner, recoverable by retry or restart, with no durable ambiguity.

Every P0 risk requires a normal path plus a failure or recovery path. Every P1 risk requires System E2E evidence or a written Contract Integration rationale proving production participants on the seam, a stable observable, driver-only replacement, no extra real-Zotero composition risk, and an explicit promotion condition. Test count alone is not a rationale.

## Runner, profile, and abort contract

One E2E invocation for one compatibility target owns one fresh copied profile and one Suite Baseline. Different jobs and Zotero versions use separate copies. Cases run serially inside the profile; parallelism exists only between complete invocations.

The Suite Baseline is created once. It is not reset between families. A family declares its namespace, Owned State, optional Carry-over Set, and cleanup before execution. Normal families clean all Owned State before yielding. Restart and reconciliation families may preserve only declared carry-over between their own phases and must remove it before yielding. Carry-over never crosses a family boundary.

The Suite Health Gate runs after initialization and after every family. It checks:

- Zotero and the production plugin remain responsive;
- the expected current-source sidecar identity is ready when applicable;
- no undeclared operation or managed process remains active;
- the completed family's Owned State is gone;
- any family-specific stable health outcome is satisfied.

The common gate does not compare the whole database or assert private storage layout.

Abort behavior is fail-closed:

- baseline setup, runner/transport infrastructure, process restart, cleanup, or health-gate failure aborts all remaining families;
- an ordinary case assertion failure first runs family cleanup and the health gate;
- later families run only when cleanup completed and the shared profile is demonstrably healthy;
- failed or indeterminate cleanup/health aborts the invocation;
- blocking lanes never auto-retry;
- first-failure evidence and the Run Manifest are preserved.

## Run Manifest contract

The outer runner owns the Run Manifest so host or sidecar termination cannot erase the verdict. The manifest is an index, not a second logging or receipt system.

Run identity records:

- manifest schema version and opaque run ID;
- trigger lane;
- source commit and plugin version;
- Zotero version, platform, and architecture;
- current-source sidecar build identity;
- fixture ID, schema version, and fixture revision;
- start and finish time;
- predecessor run ID only for the permitted weekly diagnostic rerun.

Each family/case entry records:

- stable family and case IDs;
- `passed`, `failed`, `aborted`, or `skipped`;
- stable public outcome or failure code;
- typed-evidence descriptors: kind, contract/schema version, terminal status, and safe opaque operation ID when applicable;
- required lifecycle checkpoints and outcomes;
- cleanup and Suite Health Gate results;
- workspace-relative references to independently produced sanitized artifacts.

The manifest does not embed complete receipts, raw payloads, UI copy, log text, private persistence rows, internal call order, profile/data-root identity, host names, credentials, tokens, absolute paths, or identifying library facts. Sensitive artifacts are recorded as `withheld` with a stable reason code and no source path or sensitive value. Artifact references do not gain a redundant content-hash system.

Terminal states are:

- `complete`: every selected family has a recorded result and required cleanup/health evidence;
- `aborted`: the invocation intentionally stopped under the shared-profile abort contract;
- `incomplete`: execution ended before a trustworthy terminal classification could be formed.

Missing required public, typed, lifecycle, cleanup, or health evidence fails the case; logs cannot fill the gap. Failure to persist the manifest is an invocation-level infrastructure failure.

## Fixture and privacy contract

The Committed Seed consists of portable declarative data and only the minimum synthetic attachment assets required by approved scenarios. It never contains a database, WAL, complete profile, generated runtime state, machine-bound identity, real titles/authors/text, local paths, credentials, stable source item IDs, or content-derived hashes of private material.

Fixture identity has three independent fields:

- `schemaVersion`: portable seed or structure-contract shape;
- `fixtureId`: lineage and semantic purpose;
- `fixtureRevision`: exact scenario-observable content revision.

Breaking shape changes advance `schemaVersion`; observable content changes advance `fixtureRevision`. The same revision must materialize the same declared structural facts and preconditions, but byte/content-hash equality is not required. A minimal active fixture registry records current identities and references. A revision is retired only after no active scenario, lane, or retained compatibility obligation references it; current loaders gain no speculative compatibility layer.

Before a seed invocation, validate identity, schema, privacy, declared structural facts, materialization, data integrity, and scenario preconditions. Failure blocks the invocation.

A Private Gold Source must be quiescent before copying: Zotero is closed and its database, WAL, profile, and attachment view are mutually consistent. The runner never writes to the source. It strips machine-bound canonical identity, old sidecar executable/runtime state, logs, and declared ephemeral state from the copy, then validates it against the Gold Structure Contract. Copies are never reused and never uploaded. An optional gold lane may be absent globally; once explicitly selected, a missing or invalid source fails that invocation.

## Fault-control policy

Prefer runner-owned control through exact process identity, copied files, ports, locks, disconnects, and restarts. A private seam is allowed only when the required window cannot be reached externally.

Approved local seams are limited to:

1. Reference refresh: one-shot and operation-scoped after the first page is served and before the next page request.
2. Public Maintenance: one-shot and operation-scoped after durable admission and before worker dispatch.
3. SkillRunner apply: only if public evidence cannot deterministically hit the boundary after durable `apply.started`; one-shot and operation-scoped inside the apply owner.

An unarmed seam preserves production ordering, latency, and outcomes. No public protocol, DTO, capability catalog, CLI/MCP route, or global service accepts fault-control input.

## Stable assertion policy

Cases assert the highest applicable stable observable:

- user-visible or public state;
- durable typed run, apply, operation, or mutation evidence;
- lifecycle checkpoints;
- bounded Zotero counts or canonical references;
- process, discovery, lock, cleanup, and health facts.

Cases do not assert full error/log prose, UI copy, private call order, complete persistence rows, raw local paths, broad snapshots, or unrelated lower-layer matrices.

## Phase 1 catalog

Phase 1 contains the original six families and fifteen cases, plus the separately admitted `CG-02` Windows close-lifecycle regression.

| ID | Owner | Trigger or principal fault | Required terminal evidence |
| --- | --- | --- | --- |
| `SL-01` | Synthesis sidecar lifecycle | Start through plugin owner, then public `system.shutdown` | ready identity; stopping response flushed before exit; discovery removed; no process/owner residue |
| `SL-02` | Synthesis sidecar lifecycle | Invalid or missing runner-controlled launch input before ready | stable startup failure; no ready discovery; owners rolled back; healthy suite |
| `SL-03` | Synthesis sidecar lifecycle | Externally terminate the ready sidecar before later dispatch | one replacement ready generation; old identity retired; no stale discovery or orphan |
| `RH-01` | Reverse Host boundary | Public multi-page reference refresh | every page has one basis; ready state committed once |
| `RH-02` | Reverse Host boundary | Mutate Host basis after first page and before next | typed basis mismatch; no mixed promotion; fresh-basis retry succeeds |
| `PA-01` | Provenance/canonical classification | Open committed historical Topic with read-only copied source | public content and provenance remain readable; no migration or metadata rewrite |
| `PA-02` | Provenance/canonical classification | One oversized or malformed artifact beside valid artifacts | valid neighbors remain; one bounded typed diagnostic; sidecar stays healthy |
| `PM-01` | Public maintenance lifecycle | Submit and exactly replay `refreshReferenceSidecarNow` | one operation/receipt, worker, started event, Host effect, and terminal publication |
| `PM-02` | Public maintenance lifecycle | Terminate after durable admission and before dispatch | `continuation_required`; no replay; one continue CAS winner completes same identity |
| `PM-03` | Public maintenance lifecycle | Terminate while operation is running | `restart_external_effect_unknown`; no auto-replay; deterministic retry successor alone performs new effect |
| `PM-04` | Public maintenance lifecycle | Cancel a running operation | durable `cancel_requested`; terminal canceled only at promotion checkpoint; no post-cancel promotion |
| `CG-01` | Citation Graph application | Reuse old view/continuation after public rebuild | typed `basis_mismatch`; no page data/mutation; fresh view readable |
| `HB-01` | Host Bridge canonical mutation authority | Public `notes.create`, then exact operation/digest replay | one canonical settled operation and exactly one Unicode note |
| `HB-02` | Host Bridge canonical mutation authority | Reuse operation ID with a different semantic digest | `idempotency_conflict`; original note/evidence unchanged |
| `HB-03` | Host Bridge canonical mutation authority | Terminate owner after canonical admission but before terminal evidence | canonical `unknown` queryable through `mutation.get_operation`; never auto-replayed |
| `CG-02` | Citation Graph application | Windows Zotero 10: render Citation Graph and close Workbench | host stays responsive over repeated cycles; complete cleanup/health; Zotero 9 classified only from a real run |

`refreshReferenceSidecarNow` is the representative maintenance operation because it crosses the durable owner, real Reverse Host, and visible Host effect. Public `notes.create` with deterministic synthetic Unicode is the representative Host Bridge mutation because duplication, UTF-8 transport, and user-visible effect are bounded and observable.

The complete malformed Reverse Host matrix, pending-operation cancellation, graph algorithm/row correctness, and private call-order assertions remain Contract Integration evidence. R9 parent EOF, fuse, forced termination, and production-lock acceptance remain R9-owned.

## Phase 2 catalog

Phase 2 contains fourteen cases. All fourteen run serially on Zotero 10/Linux in one copied profile. `AP-01` additionally runs on Zotero 10/Windows to prove native path composition.

| ID | Owner | Trigger or principal fault | Required terminal evidence |
| --- | --- | --- | --- |
| `AC-01` | ACP transport/run lifecycle | Normal public ACP Skills run through workflow apply | queued→running→succeeded; owner retained; apply success; typed mutation receipt; one bounded effect |
| `AC-02` | ACP transport/run lifecycle | Stall startup before readiness, then cancel | bounded close; no false connected; admission released; no child; follow-up admitted |
| `AC-03` | ACP transport/run lifecycle | Controlled child exits during active turn | unexpected-exit lifecycle; bounded stream drain; one terminal run; no pipe/process leak |
| `AC-04` | ACP transport/run lifecycle | Non-cancelled result arrives inside grace after `session/cancel` | prompt settles from original result; interrupt unconfirmed; trailing transcript retained; no canceled terminal |
| `AC-05` | ACP transport/run lifecycle | Restart with non-terminal run whose remote session cannot recover | one `startup_reconcile` settlement; stale ownership/admission cleared; diagnostics retained |
| `AO-01` | ACP conversation/approval ownership | Two conversations request writes over one Host Bridge connection | approvals/scopes/operations/results do not cross; approved writes create one effect; denied writes none |
| `AT-01` | Shared ACP transcript projection | Interleave assistant text with tool/usage/status/workspace updates | one assistant segment until a hard boundary in both Chat and Skills; same semantic chrome transcript |
| `SR-01` | SkillRunner runtime/reconciliation | Normal handshake, upload, poll, result, and apply | request ready; one provider success; one apply success; typed receipt; one bounded effect |
| `SR-02` | SkillRunner runtime/reconciliation | Terminate after durable `apply.started` and before settlement | ambiguous/unrecoverable typed failure; no repoll or broker redispatch; at most prior effect |
| `SR-03` | SkillRunner runtime/reconciliation | Restart peer after request identity is durable, losing in-memory request | one typed terminal reconciliation; task/admission released; no apply; follow-up admitted |
| `SR-04` | SkillRunner runtime/reconciliation | Throttle ordinary work while new submission starts | execution-preflight handshake uses submission lane and is not skipped as health work |
| `AW-01` | Assistant Workspace publication | Close/reopen real Workspace during live SkillRunner run | monotonic transcript revision; current run/reply; unrelated managed regions retain identity |
| `AW-02` | Assistant Workspace publication | Complete transcript in Linux chrome iframe | row renders without forced timer probe |
| `AP-01` | ACP Skill materialization/runtime persistence | Materialize whitelisted Skill through real runtime | roots materially present through native file APIs; native syntax on Windows; readiness after materialization |

The deterministic external ACP child supports only normal completion, startup stall, controlled exit, and cancel/result race. The existing Mock SkillRunner gains only handshake throttle and runner-controlled fixed-port restart. Malformed protocol matrices, transition tables, digest/retention matrices, transcript cache internals, quoting matrices, and static package/schema governance remain Contract Integration evidence unless observed composition meets the promotion rule.

## Ownership, regression admission, and quarantine

Ownership labels identify production modules, not people or approval roles:

- `SL`: Synthesis sidecar runtime lifecycle
- `RH`: Reverse Host boundary
- `PA`: provenance and canonical-artifact classification
- `PM`: public maintenance lifecycle
- `CG`: Citation Graph application
- `HB`: Host Bridge canonical mutation authority
- `AC`: ACP transport and run lifecycle
- `AO`: ACP conversation and approval ownership
- `AT`: shared ACP transcript projection
- `SR`: SkillRunner runtime and reconciliation
- `AW`: Assistant Workspace publication
- `AP`: ACP Skill materialization and runtime persistence

The sole maintainer owns shared runner, fixture registry, manifest, CI matrix, and cross-family decisions. No steward registry, approval chain, or new `CODEOWNERS` policy is introduced.

Every newly discovered cross-boundary regression is triaged in its existing bug/change record before closure with exactly one disposition:

1. attach evidence to an existing risk and case when trigger and invariant are already covered;
2. amend or split a case when trigger mechanism or stable assertion differs;
3. retain lower-layer evidence with a complete Contract Integration rationale and promotion condition.

Catalog identity remains Seam × Invariant × Consequence. Historical existence alone does not create a case. Structural preconditions and expected facts change together with fixture/evidence revision.

Quarantine is evidence-bound and expiring. It requires a dedicated issue with case, affected cell, first failing manifest, evidence of test-infrastructure instability rather than unresolved product behavior, substitute evidence, maintainer, and expiry. Default expiry is 14 days or three scheduled executions, whichever comes first. A P0 case leaves a blocking lane only when equivalent blocking evidence remains; otherwise it stays blocking. A P1 case may move temporarily to scheduled observation. Expiry never auto-renews. Restoration requires three independent clean executions under current identities, disappearance of the original signature, passing health gates, and one change that closes the quarantine and restores blocking configuration.

## Execution matrix, calibration, and rerun

| Lane | Targets | Families | Initial gate |
| --- | --- | --- | --- |
| Pull request targeting `main` | Zotero 10 / Linux | `SL+PM` | non-blocking until calibrated and explicitly promoted |
| Main | Zotero 7, 9, 10 / Linux | all six Phase 1 families | each cell non-blocking until promoted |
| Tag-triggered release, before publication | Zotero 7, 9, 10 / Linux and Windows | all six Phase 1 families | each cell non-blocking until promoted |
| Release evidence | Zotero 10 / macOS x64 and arm64 | existing formal XPI smoke | non-blocking |
| Weekly | same Linux/Windows matrix as release | all six Phase 1 families | non-gating health evidence |
| Scheduled stress | Zotero 10 / Linux | explicitly selected stress scenario | non-gating |
| Manual large-gold | Zotero 10 / Linux | `RH/PA/PM/CG` | non-gating; selected lane requires valid gold source |

Release cells use final tag-bound plugin and sidecar identities before publication. Main results are not release evidence. There is no initial path-based PR skip.

Every prospective blocking cell starts non-blocking and needs three clean rounds from three independent workflow executions on its exact target and runner environment. Every round uses a fresh profile and retains its manifest. Use the maximum observed clean duration; three samples do not justify a p95. Cleanup, health, process, port, lock, identity, or terminal ambiguity invalidates a round.

Promotion requires human manifest review and an explicit configuration edit. It is per-cell and never automatic. Calibration is invalidated by target-version, runner OS/image, family grouping, fixture scale, sidecar startup model, or invocation/profile model changes. Ordinary product commits and fixture-content revisions do not invalidate it by themselves.

Candidate grouping thresholds are:

- pull request: 15 minutes;
- main: 30 minutes;
- release: 45 minutes;
- scheduled: 60 minutes;
- manual large-gold: 90 minutes.

They are grouping thresholds, not invented measurements or direct timeouts. Start with one invocation per target containing all selected families. If the maximum clean round exceeds the threshold, split first into Synthesis (`SL/RH/PA/PM/CG`) versus Host Bridge (`HB`), then into recovery (`SL/PM`), Synthesis read/data (`RH/PA/CG`), and Host Bridge (`HB`). Never split a family or share a profile across cells.

Only weekly orchestration may rerun, once, the complete failed cell outside Zotero. The successor uses a fresh profile and new run ID linked to the immutable first attempt. It never reruns one case. A successor pass classifies `intermittent`; a second failure classifies `persistent`. Any first-attempt failure keeps the weekly workflow failed. PR, main, and release cells never auto-retry.

Windows release E2E cells cannot be promoted while `CG-02` crashes or lacks trustworthy evidence. Zotero 9 remains unverified until run and must not be inferred affected from Zotero 10.

## R9 and Stage-1 boundary

`complete-synthesis-r9-stage1-acceptance` remains the completion owner for the immutable candidate envelope, seven native bundles, universal XPI, installation/upgrade/migration, parent EOF, crash fuse, forced termination, production lock, operator recovery, and its real-machine matrix.

`SL-01`, `SL-02`, and `SL-03` are implemented once and may produce both Phase 1 and R9 evidence only when the candidate identity and environment match exactly. Candidate-envelope mismatch is not Host Bridge idempotency conflict. `PA-01` can be supporting readability evidence but is not migration or installation acceptance. No other Phase 1 case changes R9 completion.

## Repository facts and implementation seams

The implementation starts from these verified facts:

- `package.json` already routes `npm run test:zotero:e2e` through `scripts/run-zotero-test-with-mock.ts ... full e2e`.
- `zotero-plugin.config.ts` already maps `full.e2e` to `tests/zotero/e2e/full`, stages optional E2E gold data in `test:init`, and stages the current-source sidecar in `test:prebuild`.
- `scripts/run-zotero-test-with-mock.ts` already owns Mock SkillRunner lifecycle, environment, temporary test data, and cleanup.
- `scripts/patch-zotero-test-runner.ts` and the diagnostic bridge provide the event path the outer runner can index; the manifest references specialized diagnostics rather than copying them.
- `300-lisongtao-gold.zotero.test.ts` remains the existing gold E2E case. `276-dashboard-synthesis-close.zotero.test.ts` remains the UI/full close-stress case selected by `npm run test:zotero:e2e:stress`. Neither counts as a catalog case merely by similarity.
- Compatibility planner/worker currently excludes `e2e`. The behavior worker derives deleted `suite.test.ts` aggregators from directory entries; Change 4 fixes the root by consuming authoritative directories rather than restoring aggregators.
- Ordinary local E2E keeps current `stageDirectSynthesisBundle()` behavior. Compatibility workflows prepare immutable current-source target sidecars before host execution and prevent the cell from rebuilding or replacing them.
- `synthesisProductionOwner.ts` binds Reverse Host identity after ready but does not revoke the departed generation during recovery. `synthesisReverseHostEndpoint.ts` already owns the nullable binding, and the broker already rejects stale identity. Change 2 fixes the owner lifecycle rather than weakening broker authorization.
- The Public Maintenance checkpoint belongs after durable insert winner and before background worker spawn. The Reference checkpoint belongs after first-page service and before the next page request. Both stay private to their operation owner.
- `tests/fixtures/acp/acp-composer-reply-agent.mjs` already implements normal NDJSON ACP completion and is currently unused. Change 5 extends it instead of creating another peer.
- `tests/mock-skillrunner/server.ts` already supports handshake override, polling delay, host, and port. Change 5 adds only handshake throttle and runner-controlled restart on a pinned port.
- SkillRunner `SR-02` first uses runner-owned process kill after observable durable `apply.started`. The private checkpoint is an evidence-gated fallback only.
- `CONTEXT.md` currently lacks the agreed System E2E and Contract Integration definitions; Change 1 restores them.

## Dependency-ordered implementation program

The changes are strictly serial. Drafting all five at once does not authorize concurrent implementation. A successor starts only after its predecessor is implemented, verified, synchronized, and archived.

### 01 — Runner foundation

Change: `01-establish-system-e2e-runner-foundation`

Implement:

- `system-e2e-strategy` and the `e2e` domain taxonomy delta;
- glossary restoration and E2E developer documentation;
- Committed Seed identity, active registry, deterministic materialization, privacy checks, and retained gold-source behavior;
- runner-owned manifest and artifact classification through the existing reporter/diagnostic event path;
- family declarations, lifecycle transitions, cleanup, Suite Health Gate, and fail-closed abort;
- one real Zotero 10/Linux foundation invocation while preserving current E2E/stress commands.

TDD order: fixture/manifest/family contract tests go red before implementation. The real-host invocation follows contract checks.

Complete when contract checks pass and one real Zotero 10/Linux run proves baseline setup, shared-profile execution, cleanup, health, and a trustworthy terminal sanitized manifest. Node/mock evidence alone is insufficient.

### 02 — Fault control and sidecar recovery

Change: `02-add-system-e2e-fault-control-and-sidecar-recovery`

Prerequisite: Change 01 archived.

Implement:

- owner-level Reverse Host binding revocation whenever supervisor leaves ready;
- replacement binding only after replacement ready;
- the two private one-shot operation-scoped checkpoints;
- focused lower-layer red/green checks for revocation and checkpoint scope;
- formal `SL-03`, `RH-02`, and `PM-03` cases.

Complete when all three cases pass with cleanup/health evidence, focused regressions pass, the old identity is retired, no mixed Reference promotion or maintenance replay occurs, and no public/global fault interface exists.

### 03 — Complete Phase 1 catalog

Change: `03-implement-phase1-system-e2e-catalog`

Prerequisite: Change 02 archived. This change has `skip_specs: true`; Change 01 owns catalog semantics.

Implement:

- the twelve original Phase 1 cases not delivered by Change 02;
- only the additional deterministic de-identified seed facts those cases consume;
- `CG-02` as a diagnosis-led regression: unattended Windows Zotero 10 red loop, minimized evidence, owner-level regression, smallest root-cause fix, green repeated close cycles, and actual Zotero 9 classification;
- public/typed/lifecycle/cleanup/health assertions and operator documentation.

Keep the existing gold and close-stress cases in place. Do not count them as catalog cases unless their exact trigger and assertions match.

Complete when one Zotero 10/Linux copied-profile run passes all original fifteen cases and produces a complete manifest, and `CG-02` is red-before-green on Windows Zotero 10 with Zotero 9 explicitly classified or recorded unverified from actual access constraints.

### 04 — CI wiring, calibration, and promotion

Change: `04-wire-and-calibrate-phase1-system-e2e-ci`

Prerequisite: Change 03 archived.

Implement:

- direct directory membership in the compatibility worker;
- `e2e` planner, CLI, worker, cell identity, receipt, and manifest reference support;
- build-once plugin and pre-staged immutable sidecar identities;
- the fixed PR/main/release/weekly/stress/gold matrix;
- calibration validation, identity invalidation, grouping thresholds, and explicit promotion;
- weekly complete-cell rerun outside Zotero with immutable first-failure evidence;
- tag-bound pre-publication release ordering and the `CG-02` Windows promotion gate.

All candidate cells land non-blocking. Missing runners or evidence leave them non-blocking; they do not become inferred passes.

Complete only after every agreed prospective blocking cell has three independently reviewed clean rounds and an explicit promotion edit. Landing non-blocking YAML alone is not completion. Weekly, stress, and gold paths must remain non-gating.

### 05 — Phase 2 ACP and SkillRunner catalog

Change: `05-implement-phase2-acp-skillrunner-system-e2e-catalog`

Prerequisite: Change 04 archived. This change has `skip_specs: true`; Change 01 owns catalog semantics.

Implement:

- four modes in the existing ACP child fixture;
- handshake throttle and fixed-port restart in the existing Mock SkillRunner;
- runner-owned Zotero restart against the same copied profile;
- the fourteen Phase 2 cases;
- owner/region identity checks required by Assistant Workspace hard constraints;
- the conditional `SR-02` apply checkpoint only when process kill cannot deterministically hit the durable boundary.

Complete when all fourteen cases pass serially on Zotero 10/Linux with a complete manifest and `AP-01` additionally passes on Zotero 10/Windows. No new blocking CI placement is implied.

## Cross-change verification checklist

Before claiming a change complete:

- predecessor implementation is verified, synced, and archived;
- tests were written red before implementation at each stable module interface;
- one fact source owns each rule, mapping, case identity, and DTO;
- existing runner, fixture, mock, diagnostic, and compatibility owners were extended rather than duplicated;
- public/user behavior, typed evidence, lifecycle, cleanup, and health assertions all exist where required;
- no raw private data, absolute path, full log, UI-copy assertion, or private persistence layout entered committed evidence;
- no unarmed checkpoint changes production behavior and no public fault surface exists;
- `npm run test:zotero:e2e` and `npm run test:zotero:e2e:stress` remain usable;
- affected focused tests and real-host acceptance runs pass;
- relevant documentation and `CONTEXT.md` are current;
- `openspec validate <change> --type change --strict --no-interactive` passes;
- unavailable real-machine evidence is recorded incomplete or unverified, never inferred passing.

## Provenance index

These links preserve decision provenance. They are not implementation prerequisites because the decision content is consolidated above.

- [Wayfinder: Define the Project-wide System E2E Test Strategy](https://github.com/leike0813/zotero-agents/issues/41)
- [Audit current tests against the System E2E taxonomy](https://github.com/leike0813/zotero-agents/issues/42)
- [Research historical cross-boundary regressions](https://github.com/leike0813/zotero-agents/issues/43)
- [Define the shared-profile state and abort contract](https://github.com/leike0813/zotero-agents/issues/44)
- [Define the System E2E evidence and run-manifest contract](https://github.com/leike0813/zotero-agents/issues/45)
- [Define the fixture and gold-data lifecycle](https://github.com/leike0813/zotero-agents/issues/46)
- [Classify cross-process seams as P0 or P1](https://github.com/leike0813/zotero-agents/issues/47)
- [Measure the Phase 1 scenario runtime on representative Zotero lanes](https://github.com/leike0813/zotero-agents/issues/48)
- [Define the Phase 1 Synthesis and Host Bridge scenario catalog](https://github.com/leike0813/zotero-agents/issues/49)
- [Define the CI, release, and scheduled E2E execution matrix](https://github.com/leike0813/zotero-agents/issues/50)
- [Prove runner-level sidecar fault control in the existing E2E runner](https://github.com/leike0813/zotero-agents/issues/51)
- [Reconcile R9 Stage 1 acceptance with the Phase 1 scenario catalog](https://github.com/leike0813/zotero-agents/issues/52)
- [Define the Phase 2 ACP and SkillRunner scenario catalog](https://github.com/leike0813/zotero-agents/issues/53)
- [Define scenario ownership and regression admission policy](https://github.com/leike0813/zotero-agents/issues/54)
- [Set the implementation sequence and OpenSpec handoff](https://github.com/leike0813/zotero-agents/issues/55)
- [Windows: closing Dashboard/Synthesis after Citation Graph opens crashes Zotero](https://github.com/leike0813/zotero-agents/issues/56)
