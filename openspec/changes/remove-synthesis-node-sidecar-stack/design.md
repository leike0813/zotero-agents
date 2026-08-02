## Lifecycle dependency

The lifecycle authority for this change is
`simplify-xpi-owned-synthesis-sidecar-lifecycle`. References below to cutover,
admission, activation, owner/lease files, persisted generations, runtime
rollback, or ordinary-startup backup are superseded and must not be
implemented.

## Context

The first prerequisite change makes R9a acceptance reproducible from stable
contracts and records a pre-deletion native candidate baseline. The second
removes the plugin-side legacy owner while preserving a neutral grouped client
adapter and bounded Host/UI responsibilities.

At that point the remaining Node migration stack has no product runtime caller
but still occupies several coupled areas:

- `apps/synthesis-service` contains the Node HTTP/lifecycle/repository,
  application wrappers, canonical store, worker transport/pool/protocol, and
  entrypoint;
- root package scripts still type-check and build that workspace;
- the old Node sidecar workflow and runtime packaging paths remain visible;
- differential, benchmark, smoke, and parity scripts import executable Node
  implementations;
- Stage-1 tests include Node source/compiled worker and implementation-detail
  coverage;
- `packages/synthesis-engine`, `synthesis-application`, and
  `synthesis-repository` contain a mixture of obsolete executable
  implementations and pure current logic still imported by plugin/contracts
  code;
- active documentation still describes some Node-oracle and transitional
  worker states.

R9b must delete this stack without discarding the language-neutral contracts,
canonical fixtures, public DTO evidence, recovery corpus, or Rust source/build
gates that make future changes safe.

## Goals / Non-Goals

**Goals:**

- Delete the external Node Synthesis service and JavaScript worker stack.
- Remove Node-only build, workflow, package, benchmark, smoke, parity, release,
  and test surfaces.
- Transfer every stable observable invariant away from executable Node oracle
  code before deleting it.
- Prune environment-neutral TypeScript packages by current reachability while
  retaining contracts and pure plugin-required logic.
- Make Rust source/build/operation parity and native manifest-v2 packaging the
  only service/worker delivery path.
- Prove final source, package, and XPI inventories exclude Node, npm,
  JavaScript service, D3 runtime, and implementation toggles.
- Define and pass the full R9/Stage-1 cross-platform and real-machine acceptance
  matrix.

**Non-Goals:**

- Change public Synthesis client behavior, DTOs, database schema, canonical
  bytes, Host authority, UI behavior, or cutover recovery policy.
- Retain compatibility wrappers, deprecated manifests, empty Node workspaces,
  no-op build commands, or skipped tests for deleted code.
- Delete `packages/synthesis-contracts`, language-neutral corpus files, Rust
  fixtures, or pure plugin-owned helpers with live callers.
- Tune domain algorithms or intentionally change accepted results while
  removing the oracle.
- Publish releases, sign assets, advance feeds, or synchronize Gitee without
  separate explicit authorization.

## Decisions

### 1. Require both prerequisite changes and a fixed deletion baseline

Implementation begins only after:

- `stabilize-synthesis-r9a-retirement-baseline` passes and its pre-deletion
  candidate evidence is accepted;
- `remove-synthesis-plugin-legacy-owner` passes and the plugin has zero legacy
  owner construction;
- the current source commit, Cargo toolchain/lock, native fingerprints, Node
  deletion list, TypeScript keep/prune list, script/test classifications, and
  package/workflow inventories are recorded.

The three changes belong to one release milestone. The intermediate states are
not release candidates.

### 2. Classify evidence before deleting executable Node code

Every Node-dependent checker/test is placed in one class:

| Evidence class | Action |
| --- | --- |
| public DTO/result/error parity | keep language-neutral expected corpus and run against Rust/public client |
| canonical bytes/hash/SQLite/recovery invariant | keep corpus/fixture and Rust invariant test |
| worker deadline/cancel/crash/fuse behavior | keep Rust worker/service test |
| package/fingerprint/provenance/size invariant | keep native package gate |
| Node private class/module/call order | delete |
| Node source-to-compiled ESM resolution | delete |
| Node-only benchmark | delete or replace with an existing Rust benchmark only when the metric remains an accepted gate |
| duplicate migration-history assertion | delete; reflect current state in active docs |

Static text assertions against instructions, full error messages, incidental
ordering, or deleted filenames are not recreated.

Alternative: keep `apps/synthesis-service` under `deprecated/`. Rejected
because R9 requires physical removal from the active repository/build graph and
Git history already preserves it.

Alternative: preserve all differential scripts but feed them fixtures. Rejected
when a stable language-neutral checker or Rust test already owns the same
behavior; dead wrappers add maintenance without evidence.

### 3. Delete the Node workspace as one bounded unit

Once evidence is transferred, delete:

- the entire `apps/synthesis-service` workspace;
- Node lifecycle/HTTP/request/logging/config/entrypoint code;
- Node repository/canonical/application wrappers;
- JavaScript compute worker pool, protocol, transports, fixtures, and transfer
  ownership;
- workspace `package.json` and TypeScript build configs.

No empty package, compatibility entrypoint, executable shim, or archived source
copy remains.

### 4. Prune shared TypeScript packages by live caller graph

`packages/synthesis-contracts` remains the language-neutral/client contract
owner. For the other three packages:

1. compute live callers after plugin legacy and Node workspace deletion;
2. retain pure modules still imported by plugin UI/Host/client code or stable
   contract generation;
3. move a pure helper only when that produces a clearer existing owner and does
   not duplicate logic;
4. delete engine/application/repository modules with no approved caller;
5. reduce package entrypoints, tsconfigs, build scripts, and dependencies to the
   surviving surface;
6. delete an entire package only if its approved live surface is empty.

This avoids both blanket deletion and indefinite retention of migration-only
packages.

### 5. Replace transitional suite/build names with current-state gates

The Stage-1 suite and CI gates will no longer be named “Node milestone” or
require `build:synthesis-service`. Existing suite membership is reclassified:

- stable public/native/recovery/package tests remain under a current
  Rust/native Stage-1 suite;
- Node-only tests are removed;
- gaps are filled by extending an existing Rust/public test where possible;
- CI and package scripts call only surviving TypeScript and Rust builds.

The old `.github/workflows/build-synthesis-sidecar-runtime.yml` and any Node
prebuild/download/release inventory are removed. The existing Rust candidate
workflow remains read-only unless a separate release action is explicitly
authorized.

### 6. Keep negative delivery inventory gates

Removal of D3 runtime or Node packaging does not mean removal of the negative
guard. Final source/package/XPI checks fail on:

- `apps/synthesis-service` or another JavaScript service entrypoint;
- Node/npm executables, archives, package trees, v1 manifests, `nodeVersion`,
  JavaScript `entrypoint`, or Node active/previous pointers;
- D3 runtime packages or copied runtime assets;
- legacy implementation selectors or fallback configuration;
- undeclared/missing/stale Rust binaries, manifests, provenance, SBOM/license
  files, signatures where required, or fingerprint mismatch;
- per-target compressed size above 15 MiB, five-target total above 75 MiB, or
  final XPI above 100 MiB.

The check expresses current native-only policy and does not preserve Node-era
inventory formats.

### 7. Make Rust worker parity the sole worker implementation gate

Node source/compiled worker parity requirements are removed. The surviving
worker gate binds:

- Rust source and Cargo inputs;
- dated toolchain and lockfile;
- all production compute operations and worker mode;
- deadline, cancellation, crash, hang kill, respawn, fuse, transfer integrity,
  and bounded-resource behavior;
- source/build fingerprints, operation inventory, smoke, license, provenance,
  and size.

Candidate smoke also verifies production service identity, the complete
96-operation ready roster, critical durable reads, and a representative
non-mutating RPC from each of the seven operation surfaces. Complete public
behavior remains covered by language-neutral corpora and Rust tests rather than
executing all large operations during package smoke.

### 8. Treat final acceptance as a decision gate, not publication

Final completion requires one coherent source identity across:

- seven native targets;
- manifest/fingerprint/SBOM/provenance/license and package sizes;
- final universal XPI inventory and size;
- clean profile;
- upgrade profile and existing production receipt;
- corrupt, stale, wrong-platform, and offline bundle cases;
- crash/restart/orphan/fuse and post-admission Rust-only repair;
- backup, restore, preflight, owner conflict, and operator runbook rehearsal;
- Zotero 7 and Zotero 9 representative real-machine smoke.

The acceptance receipt records facts. It does not dispatch a formal release,
create tags/assets, advance feeds, or run Gitee synchronization.

## Risks / Trade-offs

- **Oracle is removed before evidence transfer** → Classify and migrate every
  Node-dependent gate before deleting the workspace; the deletion task is
  blocked until the replacement matrix passes.
- **Shared package pruning removes plugin-required pure logic** → Use live
  caller/impact inventory, TypeScript build, focused behavior tests, and a
  reviewed keep list.
- **Keeping pure helpers preserves too much migration code** → Retention requires
  a named current caller and owner; zero-caller modules are deleted.
- **CI appears green because tests were simply removed** → Maintain an
  before/after evidence map from every stable observable invariant to its
  surviving corpus/check/test.
- **Negative inventory gate becomes coupled to old filenames** → Check artifact
  classes and forbidden runtime identities, with only a small explicit check
  for the deleted workspace/entrypoint.
- **Cross-platform failure is found after deletion** → The prerequisite
  pre-deletion candidate provides a known-good Rust baseline, while source
  history remains recoverable for diagnosis.
- **Final acceptance is mistaken for release authorization** → Publication,
  signing actions beyond required local/candidate validation, feeds, and Gitee
  stay outside this change unless separately authorized.

## Migration Plan

1. Verify both prerequisite changes and freeze source, keep/delete, evidence,
   package, workflow, and acceptance inventories.
2. Extend existing native/public/package gates with the required replacement
   evidence and prove the replacement matrix before deleting Node files.
3. Remove Node-dependent imports from surviving scripts/tests and rename the
   Stage-1 suite/gates to current Rust/native terminology.
4. Delete `apps/synthesis-service` and all Node worker/service build outputs,
   scripts, workflow paths, workspace entries, and dependencies.
5. Recompute live callers and prune TypeScript engine/application/repository
   packages and entrypoints without touching contracts or approved pure logic.
6. Strengthen native-only source/package/XPI inventory and Rust worker
   source/build gates.
7. Run local strict specs, public/corpus tests, TypeScript builds, Rust
   fmt/clippy/workspace tests, package/freshness/license/size checks, and final
   production build.
8. Under separate execution authorization, run the seven-platform, final XPI,
   clean/upgrade/corrupt/crash/offline, restore/runbook, and Zotero 7/9
   real-machine matrix.
9. Update active docs and the migration plan with actual results; declare R9
   and Stage 1 complete only if every required result is present.

Source rollback remains possible before the final acceptance receipt, but no
runtime rollback to Node is supported. After mutation admission, operational
recovery remains compatible Rust restart/repair/forward migration or explicit
stopped-service restore.

## Open Questions

None. The evidence classification, workspace deletion, reachability-based
package pruning, native-only gates, final matrix, and publication exclusions
are fixed.
