## Lifecycle supersession

The XPI-only lifecycle change replaced every design below that depends on a
cutover receipt, runtime admission, activation evidence, critical smoke,
owner/lease files, or persisted runtime generations. Current lifecycle design
is install one verified XPI bundle, acquire the Rust OS lock, publish
launch-scoped discovery, pass current-session health/handshake, reconcile, and
shut down through RPC or parent-pipe EOF. The remaining material in this
document applies only to operation parity and release evidence.

## Context

R9a is archived and the current default client is native-only, but two parts of
its acceptance story are not reproducible from current-state sources:

1. `check-synthesis-production-capabilities.ts` and the seven surface checkers
   read `operation-ownership.json` and child `tasks.md` files from active
   OpenSpec change directories. Archival moves those files and immediately
   breaks the gate.
2. `runCriticalSmoke` currently exercises Topic list, Workbench chrome, and
   background jobs. The accepted cutover specification additionally requires
   storage, Topic detail/canonical manifest, reference/cache, graph, and worker
   responsiveness evidence before mutations are admitted.

The production operation contract already has stable current-state sources:
the 95-operation manifest, operation metadata, TypeScript capability roster,
Rust dispatcher/ready roster, and seven language-neutral surface corpora. The
historical change matrix was useful for planning, but it must not remain a
runtime or post-archive verification dependency.

The Artifact/Library/Debug surface is established as the seventh durable
corpus in `synthesis-artifact-library-debug-surface-v1/corpus.json`. Its 12
operations, access classes, and boundary/reopen cases are now product
contract, rather than an implicit residual of the historical ownership matrix.

This change is the non-destructive prerequisite for both R9b deletion changes.
It does not remove retained implementations and does not publish or dispatch a
release workflow.

## Goals / Non-Goals

**Goals:**

- Restore a green, archival-safe R9a acceptance gate.
- Prove that the seven surface corpora partition the 95-operation inventory
  exactly once and agree with TypeScript/Rust code.
- Execute and record the complete critical-smoke roster before mutation
  admission.
- Make incomplete, stale, duplicated, or replayed smoke evidence fail closed.
- Correct current-state R9 documentation and freeze the downstream deletion
  boundaries.
- Define the pre-deletion remote evidence that must be collected before the
  destructive changes proceed.

**Non-Goals:**

- Change public client methods, operation DTOs, database schema, canonical
  bytes, reverse-Host authority, or production ownership.
- Add another ownership manifest or copy the archived change matrix into a new
  location.
- Delete plugin legacy code, `apps/synthesis-service`, TypeScript packages,
  tests, workflows, or dependencies.
- Dispatch seven-platform workflows, sign or publish an XPI, create a release,
  or synchronize Gitee.

## Decisions

### 1. Derive operation ownership from durable corpora

The production capability checker will load the seven current contract-set
corpora and derive their operation sets. It will prove:

- every corpus has the expected schema and unique stable surface identity;
- every operation occurs in exactly one surface corpus;
- the union equals the 95-operation manifest;
- TypeScript capability/ready rosters, Rust declared/ready rosters, dispatcher
  handlers, and per-operation metadata equal that union;
- every operation has its required positive, invalid, oversized, expired, and
  mutation-reopen evidence.

The checker will not inspect OpenSpec change directories or task checkboxes.
Change completion is historical process evidence; executable corpus and code
agreement are current-state product evidence.

Alternative: make the checker search `openspec/changes/archive` by date. This
would preserve the wrong ownership boundary and introduce nondeterministic path
selection when changes are renamed or re-archived.

Alternative: copy `operation-ownership.json` into the contract set. Rejected
because the seven corpus files already contain the operation partition; a
second mapping would create another SSOT.

### 2. Use an explicit versioned critical-smoke roster

The coordinator will define one ordered critical-smoke roster with stable check
IDs and one check for each accepted category:

| Check | Evidence |
| --- | --- |
| identity | health and handshake match profile, receipt, instance, fingerprint, owner, and ready roster |
| storage | production repository and canonical storage status are readable and bound to the current owner |
| workbench | Workbench chrome/readiness projection succeeds |
| topic-list | bounded Topic list succeeds |
| topic-detail | one deterministic existing Topic detail is read when available; the empty-library branch is explicit |
| canonical-manifest | canonical manifest/status is readable and identity-bound |
| reference-cache | reference and cache status projections are readable |
| graph-read | a bounded non-mutating graph read succeeds, including the empty graph branch |
| worker | one bounded non-destructive worker operation completes under its normal deadline |

Each check returns a structured result containing its ID, contract version,
owner identity, and a digest of normalized observable evidence. The aggregate
smoke digest covers the roster version, ordered IDs, individual result digests,
receipt, service instance, and capability fingerprint. Error messages, logs,
timestamps, and unstable field ordering are excluded.

If an empty profile makes a detail read impossible, the check must prove the
expected typed empty result; it may not silently omit the roster entry.

Alternative: hash arbitrary RPC responses. Rejected because it does not prove
which required checks ran and makes replay/incompleteness difficult to audit.

### 3. Keep activation and smoke ownership separate

The plugin coordinator selects and executes the critical-smoke roster because
it owns the production cutover state machine and can exercise the public client
plus reverse-Host boundary. Rust activation verifies the lifecycle token,
receipt, instance, capability fingerprint, complete ready roster, smoke roster
version, and aggregate digest before persisting activation and opening the
mutation gate.

Rust does not trust a caller-provided boolean such as `smokePassed`, and the
plugin does not infer activation from health alone.

### 4. Extend existing tests rather than duplicate them

The existing R9a Core tests will be adjusted first:

- archive-independent inventory tests will run with no active change directory;
- partition tests will inject missing, duplicated, unknown, and wrong-surface
  operations;
- critical-smoke tests will prove every roster ID ran once;
- empty-profile, stale identity, partial response, worker failure, and
  pre-admission crash cases will remain fail closed;
- tests will assert stable codes, roster IDs, phase, and side effects rather
  than full text or internal call order.

No new test file is needed unless an existing R9a file cannot own the stable
behavior cleanly.

### 5. Gate destructive retirement on remote evidence

After local gates pass, R9b implementation may proceed only after evidence
exists for a seven-platform native candidate and at least the representative
clean-machine profiles agreed for the release milestone. This is a decision
gate, not an automatic workflow action in this change.

The evidence receipt records commit, toolchain, lock hash, seven target
fingerprints, per-target size, workflow run identity, and test outcome. It does
not claim signing, final XPI, offline install, upgrade, or complete Stage 1
acceptance; those remain final R9b gates.

### 6. Use one platform-first native asset layout

The add-on SHALL materialize each sidecar bundle at
`addon/bin/<target>/synthesis-sidecar/`. Host Bridge binaries remain siblings
under `addon/bin/<target>/`. Synchronization stages the complete `addon/bin`
tree, replaces only the seven namespaced sidecar bundles, removes the obsolete
sidecar-first root, and swaps the staged tree transactionally so a failed set
cannot partially update platforms or delete sibling binaries.

The prebuild archive format remains `<target>/...`; platform-first layout is a
local add-on/XPI materialization concern and does not introduce a second bundle
manifest.

### 7. Update only current-state documentation

The Rust migration plan and active Synthesis architecture documents will state
that:

- R9a native ownership, complete routing, and mutation admission are locally
  implemented;
- Node and plugin legacy source remain only as bounded retirement inventory;
- R9a acceptance is complete only after this change's gates pass;
- R9b is split into the two dependent deletion changes;
- remote and real-machine evidence remains pending unless an actual receipt is
  present.

### 8. Treat a wholly absent production source as a native empty profile

Before backup, the coordinator classifies the production database and canonical
root together. A complete pair follows the existing verified legacy backup.
When both are absent, the packaged Rust executable creates an empty production
basis through a bounded internal CLI before the same backup, preflight, smoke,
and activation gates run. A partial pair fails with
`synthesis_source_state_incomplete`; plugin-side repository construction is not
an allowed recovery.

The receipt records `sourceOwner=empty-profile` for this branch. Rust production
open remains strict and never creates a missing live database implicitly.

### 9. Separate cutover drain from terminal plugin shutdown

Cutover invalidates and awaits only the current default-client generation.
Terminal shutdown remains reserved for add-on shutdown. Startup reconcile is
owned by the admitted native owner and is not also attempted from the generic
hook before readiness.

An already admitted profile starts a new native service instance without
repeating backup or preflight. It reruns the public critical-smoke roster,
refreshes native activation evidence, and atomically replaces only the
receipt's volatile service identity and timestamp. The durable basis,
fingerprints, receipt identity, owner mode, and mutation phase remain
unchanged. The default client accepts discovery only against the ordered ready
roster, and Rust Workbench dispatch accepts the eight public surface names from
the shared contract.

### 10. Publish one debug lifecycle projection

Debug builds maintain one sanitized snapshot keyed by `attemptId` across
install, source classification, backup/bootstrap, preflight, supervisor,
handshake, smoke, activation, and client readiness. Workbench shows a compact
failure entry, Task Manager shows the complete read-only snapshot, runtime
diagnostic bundles export it under existing redaction policy, and
`start:direct:build` prints the same structured lifecycle events. Production
builds exclude the debug projection and process tails.

## Risks / Trade-offs

- **Corpus partition accidentally omits planning metadata** → Planning change
  names are intentionally removed from product verification; stable surface
  identities and exact operation sets remain checked.
- **Critical smoke mutates state** → Every roster entry is explicitly
  non-destructive, bounded, and run before mutation admission.
- **Empty libraries weaken smoke** → Empty branches produce typed, auditable
  evidence instead of skipping checks.
- **Additional startup work delays readiness** → Checks are bounded and run once
  per cutover/repair generation; Zotero window startup remains non-blocking.
- **Remote evidence is mistaken for release authority** → The receipt and docs
  state that candidate verification does not authorize signing, publication,
  final XPI assembly, or Gitee synchronization.

## Migration Plan

1. Extend the existing capability and R9a tests with archive-independent and
   complete-smoke failures.
2. Change the production checker and seven surface checkers to consume stable
   contract-set sources only.
3. Implement the versioned critical-smoke roster and activation binding.
4. Run focused R9a tests, capability/boundary checks, TypeScript checks, Rust
   fmt/clippy/tests, Stage-1 suite, and production build.
5. Correct the current-state plan and Synthesis architecture documents.
6. Materialize the seven verified bundles under the platform-first add-on
   layout and verify Host Bridge siblings are preserved.
7. Collect the separately authorized pre-deletion seven-platform/clean-machine
   evidence and record its receipt.
8. Only then begin `remove-synthesis-plugin-legacy-owner`.

Rollback is code rollback before either dependent deletion change begins. This
change changes no production data and requires no data migration. Once a newer
activation receipt uses the new smoke roster version, an older runtime must
fail compatibility checks rather than reinterpret that receipt.

## Open Questions

None. The durable evidence sources, smoke categories, no-new-inventory rule,
dependency order, and release exclusions are fixed.
