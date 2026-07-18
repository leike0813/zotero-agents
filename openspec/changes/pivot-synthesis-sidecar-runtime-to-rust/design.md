## Context

Stage 1 has established a strict Synthesis client seam, host capability ports, environment-neutral contracts/engine/application/repository packages, a supervised Node service, and a private WS5 shadow foundation. The implementation being considered for migration contains approximately 48,357 TypeScript lines: 7,145 service, 12,891 contracts, 10,081 application, 6,663 repository, and 11,577 engine lines.

The current packaging model combines a full Node runtime and a repeated JavaScript service tree for each of five targets. Published prebuilds total about 203 MB before they are assembled into an XPI. Neither a universal XPI of that size nor post-install Node download is acceptable. Production database/canonical ownership has not moved to the sidecar, so the least costly pivot point is before WS6/WS7.

The plugin-side `SynthesisClient`, Host ports, installer, supervisor, and HTTP clients remain TypeScript because they execute inside Zotero. Rust replaces the external process and every implementation that must run inside it. Existing Node code remains temporarily as an executable behavior oracle, not as a second production implementation.

## Goals / Non-Goals

**Goals:**

- Stop new Node-only sidecar investment immediately.
- Preserve the existing public sidecar behavior, production database format, canonical bytes/hashes, ownership rules, and fail-closed semantics while Rust replaces the process implementation.
- Establish language-neutral wire/canonical contracts before Rust and TypeScript can diverge.
- Migrate in independently verified vertical slices, beginning with Citation Graph metrics.
- Produce one signed native executable per target with no Node, npm, JavaScript entrypoint, or downloaded runtime.
- Keep CPU failure isolation through a replaceable worker process rather than relying on an unkillable in-process thread.
- Cut over atomically and delete the Node runtime/service/worker implementation immediately after parity gates pass.
- Enforce compressed artifact budgets: at most 15 MiB per target runtime, 75 MiB for five runtimes, and 100 MiB for the final XPI.

**Non-Goals:**

- Shipping the current Node prebuilds in a formal XPI.
- Supporting system Node, post-install runtime download, or a Node fallback path.
- Translating the existing TypeScript line by line or preserving unexposed implementation structure merely because it exists.
- Sharing one live database, canonical root, owner, or write lease between Node and Rust.
- Completing WS6/WS7 production ownership migration before Rust parity.
- Preserving exact d3-force coordinates under the existing layout version.
- Supporting rollback from a Rust bundle to a Node bundle after native cutover.

## Decisions

### 1. Freeze Node and rebase Stage 1 before WS6/WS7

The Node service remains runnable only for differential tests and migration fixtures. No new domain capability, production writer, release packaging, or real-machine acceptance work targets Node. WS6 shadow verification becomes Rust parity verification; WS7 becomes the native Rust single-writer cutover.

Finishing Node WS6/WS7 first was rejected because it would require validating and operating two production implementations in sequence.

### 2. Use language-neutral schemas and canonical corpora as the cross-language SSOT

Every DTO parsed or emitted by the Rust process must have a versioned schema and positive/negative gold corpus. TypeScript host DTOs that never cross the process boundary remain TypeScript-owned. Cross-process contracts include sidecar system/lifecycle/transfer/canonical envelopes, compute inputs/results, error envelopes, launch config, discovery, and native bundle manifests.

The first contract change also removes the current `contracts -> repository` runtime import used to obtain a schema version. Constants required by the wire protocol belong in the language-neutral contract layer.

Canonical semantics explicitly cover UTF-8, line endings, object-key order, string comparison, safe integers, finite floating-point values, rounding, negative zero, JSON serialization, and SHA-256 input bytes. Hand-maintaining independent implicit validators was rejected because the existing code contains many JavaScript-specific `localeCompare`, `Math.round`, and `JSON.stringify` assumptions.

### 3. Create one Rust workspace with a service and worker mode

The target root is `native/synthesis-sidecar`. The initial workspace separates protocol, engine, repository, application, and executable concerns without mirroring every TypeScript file. One executable may expose `serve` and internal `worker` modes so packaging contains one binary while the control plane can spawn a replaceable child for bounded CPU kernels.

The initial dependency budget permits `serde`, `serde_json`, and `sha2`. Later repository/service changes may add bundled SQLite and one async HTTP stack only after license, security, cross-build, and binary-size review.

### 4. Migrate by capability and delete each superseded compute implementation

Citation Graph metrics is first because it is already production-routed, deterministic, bounded, independent of SQLite/filesystem/d3-force, and covered by exact hash and HTTP parity tests. A migration change may use test-only dual execution, but the active route must have one implementation and no fallback after the slice is accepted.

The engine order is:

1. Citation Graph metrics.
2. Tag Vocabulary, Concept KB index/query, and Topic Graph index kernels.
3. Reference Matcher and Topic Structured Artifact kernels.
4. Citation Graph build, packed encoding, and transfer execution.
5. Citation Graph layout under an explicit layout v2 contract.

### 5. Treat Force layout as a versioned algorithm migration

Radial/components behavior should retain compatible deterministic semantics where feasible. Force layout moves to `layoutVersion: 2` with a Rust-owned algorithm and new gold results. Existing cached v1 layout is stale/rebuildable; it is not rewritten as canonical data. Exact reimplementation of d3-force internals was rejected as a costly compatibility trap.

### 6. Preserve durable data semantics, not Node implementation structure

Rust repository parity must preserve schema identities, transaction boundaries, WAL, foreign keys, busy timeout, `BEGIN IMMEDIATE`, savepoints, safe integer rules, and row normalization. Rust canonical storage must preserve CAS, file and directory fsync, exclusive staging, atomic promotion, journal phases, backup/forward recovery, and durable import receipts.

Repository and canonical fault injection must run on all five targets before ownership cutover. Node and Rust always use separate shadow roots during comparison.

### 7. Replace Node-coupled packaging with native manifest v2 at final process cutover

The current manifest fields `nodeVersion`, Node upstream archive, Node executable name, and JavaScript `entrypoint` are removed. The native manifest identifies implementation kind, service/protocol version, target, executable, build fingerprint, toolchain/lock provenance, platform signature, and per-file hashes.

Installer snapshots expose `executablePath`, not `nodePath`/`entrypointPath`. The supervisor launches the native executable with `serve --config <path>`. Launch config, discovery, health, and handshake identify the native implementation rather than a Node version.

### 8. Make cutover atomic and deletion part of the same milestone

Before cutover, production data and canonical ownership stay plugin-side. The Rust process completes isolated parity without sharing production roots. Cutover changes the packaged bundle, installer/supervisor launch contract, and production routing only after all required capabilities pass.

The cutover milestone is incomplete until it removes:

- `apps/synthesis-service` Node implementation;
- Node-specific runtime manifest and packaging fields;
- product-owned Node download/prebuild workflow;
- JavaScript worker pool/protocol implementation;
- runtime copies of D3 packages and their XPI checks;
- obsolete Node-only tests and build scripts, replacing them with behavior-level Rust gates.

### 9. Keep Rust rollback within one implementation family

During migration, the plugin remains on the existing production owner and Rust uses isolated roots, so rollback means disabling the Rust candidate. After native cutover, `active`/`previous` pointers may move only between compatible Rust bundles. A Node bundle cannot become `previous` for a native manifest v2 installation.

## Risks / Trade-offs

- **Canonical bytes or hashes drift across languages** → Define gold corpora first; fail both TypeScript and Rust validators on any mismatch before porting domain code.
- **Rust thread hangs block shutdown** → Execute bounded CPU kernels in a replaceable child process with request deadlines, cancellation, crash accounting, and a degraded fuse.
- **SQLite behavior differs from `node:sqlite`** → Use bundled SQLite, lock pragma/transaction semantics with integration fixtures, and run restart/concurrency tests on each target.
- **Windows fsync/rename semantics break recovery** → Add platform fault injection for every canonical journal phase before cutover.
- **Force layout parity becomes unbounded work** → Version the algorithm and treat old layout as rebuildable cache.
- **Temporary dual implementations become permanent** → Permit dual execution only inside tests, assign deletion tasks to every accepted slice, and forbid runtime fallback.
- **Rust dependencies erase size gains** → Record stripped compressed size per target on every prebuild; fail the hard package budgets.
- **One giant migration change becomes unauditable** → This governance change defines the order; implementation proceeds through small OpenSpec changes with independent exit gates.
- **Node tests lock implementation details** → Retain observable protocol/domain fixtures and replace source-string/worker-internal assertions as each slice migrates.

## Migration Plan

1. Publish the Rust migration plan and freeze notice; pause Node WS6/WS7 and formal Node XPI work.
2. Create `define-synthesis-cross-language-canonical-semantics` and move shared constants/schemas/corpora into a language-neutral boundary.
3. Create `introduce-synthesis-rust-sidecar-metrics-vertical-slice`, establish the Cargo workspace/five-target CI/worker framing, port metrics, and remove the active TypeScript metrics compute path.
4. Migrate deterministic and complex engine groups in the documented order, deleting each superseded implementation.
5. Introduce layout v2 and remove the runtime D3 dependency after all layout consumers move.
6. Implement Rust repository, canonical store, applications, and HTTP/lifecycle in isolated shadow roots with differential/fault-injection gates.
7. Generalize runtime manifest v2 and plugin installer/supervisor/control identity, still behind a non-production candidate gate.
8. Build all five signed native bundles, enforce size/freshness/XPI checks, and complete clean-machine tests.
9. Atomically switch to Rust, remove Node runtime/service artifacts, and resume WS6/WS7 semantics on the Rust implementation only.

## Open Questions

- The exact async HTTP and SQLite crates remain implementation-change decisions after the first metrics binary establishes a measured dependency and size baseline.
- The Rust force-layout algorithm and its quality/performance thresholds require a dedicated layout v2 proposal.
- Final universal-XPI size budgets may be tightened after the first five-target native build, but they may not be relaxed without a separate approved change.
