## Context

The production plugin remains the sole owner of `state/synthesis.db`, Topic canonical files, Host effects, credentials, and all public `SynthesisClient` routing. The private Node service already implements a complete isolated shadow repository, canonical store, and application layer under profile-scoped roots; after R6 it delegates all fifteen CPU operations to one Rust child.

R7 replaces that private durable/application implementation with a Rust candidate in separate shadow roots. Node is frozen as a test oracle. R7 does not install or supervise a native runtime and does not transfer production ownership.

## Goals / Non-Goals

**Goals:**

- Reproduce repository schema, transaction, row-normalization, locking, restart, and close behavior in Rust.
- Reproduce Topic canonical bytes/hashes, writer admission, promotion, journal, receipt, and recovery behavior in Rust.
- Reproduce every private application use case through strict repository, canonical, compute, and remote-effect ports.
- Compare Node and Rust from the same immutable fixtures while keeping their databases, canonical roots, and writer leases independent.
- Expose only two authenticated, bounded, read-only candidate canaries and preserve `mutationEnabled: false`.
- Make durability, fault injection, fingerprint, license, smoke, and size checks executable on all five targets.

**Non-Goals:**

- No production database/canonical access, data migration, writer transfer, or public client routing.
- No native manifest v2, installer, supervisor, discovery redesign, or production lifecycle integration.
- No Rust-to-Node runtime fallback and no long-lived shared mutable test root.
- No credentials, generic HTTP client, Zotero adapter, or Host implementation in Rust application crates.
- No Node oracle deletion before R9.

## Decisions

### 1. Three deep crates preserve dependency direction

Add `synthesis-repository`, `synthesis-canonical-store`, and `synthesis-application` beneath the existing native workspace. Repository owns SQLite schema/row/transaction semantics. Canonical store owns filesystem durability and writer admission. Application owns use-case DTO rebuilding, orchestration, error mapping, and ports.

The application crate depends on repository/canonical traits plus existing compute contracts and injected remote-effect traits. It does not depend on the candidate HTTP service, filesystem paths, SQLite handles, credentials, or a general network client. One crate containing all layers was rejected because it would hide ownership boundaries and make R8/R9 composition harder to audit.

### 2. SQLite is bundled and schema-compatible

Use exact `rusqlite = { version = "=0.40.1", default-features = false, features = ["bundled", "backup"] }`. Initialization installs the current complete shadow schema and indexes and enforces WAL, `synchronous=NORMAL`, foreign keys, 250 ms busy timeout, strict identity, JS-safe integers, and strict row rebuilding.

Outer writes use `BEGIN IMMEDIATE`; nested transactions use unique savepoints. Startup changes only `running` operations to `canceled`. Shutdown closes statements and connections deterministically. System SQLite was rejected because the five targets must share one tested implementation and compile-time feature set.

### 3. Canonical promotion is a journaled state machine

The canonical crate derives all paths below its injected shadow root and rejects traversal, symlinks, duplicate/unknown files, incomplete snapshots, and hash mismatches. Promotion takes one global writer permit, validates create/update CAS before writing, writes an exclusive staging tree, fsyncs files and directories, persists a phase journal, rotates current to backup, promotes staging, writes a durable receipt, and removes obsolete transaction state.

Fault injection is explicit at `lock_acquired`, `staging_written`, `journal_written`, `current_backed_up`, `current_promoted`, `receipt_written`, and `rollback_restore`. Restart performs bounded recovery from the journal and transaction-local paths. Durable bundle import acquires the same writer permit as ordinary Topic promotion. Per-topic locks were rejected because bundle apply must have one admission authority across multiple Topics.

### 4. Applications port semantics, not Node class structure

Workbench, Topic, Citation Graph, Reference Refresh, Reference Matching/Review, Tag Vocabulary, Concept KB, Topic Graph, Knowledge Checkpoint, Durable Bundle export/import, WebDAV, and Debug/Maintenance are implemented as cohesive Rust modules over shared strict DTO/error helpers.

CPU work is dispatched only through an injected worker port backed by the existing bounded Rust pool in candidate composition. WebDAV uses an injected transport with bounded request/response DTOs; credentials and concrete HTTP behavior stay outside the crate. Repository and canonical commit points remain those of the Node oracle.

### 5. Differential fixtures never share live owners

Each fixture is copied into a Node temp profile and a Rust temp profile. The harness compares normalized public DTOs, stable error codes, sorted rows from every durable table, canonical bytes/hashes, and receipt/recovery state. It does not compare private call order, log text, temporary directory names, or complete error messages.

The fixture corpus is language-neutral and records schema/corpus versions plus Node/Rust fingerprints. Accepted semantics become corpus-owned so future validation does not require Node in production.

### 6. Candidate service surface stays narrow

Extend `serve` only for existing DTOs `workbench.chrome.read` and `topics.canonical.inspect`. Both require the established identity/auth envelope, reject unknown payload fields, obey existing node/byte bounds, run on the control plane without worker admission, and close their durable owners during shutdown.

No mutation route is registered. Handshake continues to report `mutationEnabled: false`. Library-only differential tests exercise mutations without creating an R8 service contract.

### 7. Five-target durability and package budgets are hard gates

Linux x64/arm64, macOS x64/arm64, and Windows x64 run repository locking/transactions, journal crash/recovery, application parity, source/build fingerprint, and fifteen-operation candidate smoke. Candidate archives must remain at most 15 MiB per target and 75 MiB in aggregate.

If bundled SQLite breaches the budget, implementation stops for design review. The build must not switch to system SQLite or weaken fsync/durability to pass size or performance gates.

## Risks / Trade-offs

- [The existing TypeScript schema is broad and may drift while Rust is implemented] → Derive one reviewed table/index inventory, assert exact parity in the cross-language harness, and include schema sources in the fingerprint.
- [SQLite locking differs across operating systems] → Test real competing connections and the 250 ms timeout on all five targets; compare stable error categories rather than OS text.
- [Crash tests leave ambiguous filesystem states] → Inject at named durable phase boundaries and reopen from a fresh process/owner before asserting recovery.
- [A single application crate becomes shallow dispatch glue] → Group use cases around domain aggregates and shared ports; keep repository and canonical algorithms below stable traits rather than duplicating orchestration.
- [Two service canaries accidentally become production routes] → Keep candidate composition mutation-disabled and add static routing/consumer audits proving production clients do not import or advertise them.
- [Bundled SQLite increases binary size] → Strip and archive exactly as release candidates, report per-target/aggregate deltas, and stop at the approved limits.

## Migration Plan

1. Freeze Node fixtures and add failing durable contract, repository, canonical fault, application parity, canary, and boundary tests.
2. Implement the repository crate and pass fresh/open/restart, schema/index, PRAGMA, row, transaction, locking, timeout, reconciliation, and close tests.
3. Implement the canonical crate and pass byte/hash, validation, CAS, writer admission, every journal fault point, rollback, forward recovery, and receipt tests.
4. Implement application slices over ports, using the existing compute crates and language-neutral fixture corpus.
5. Add the two read canaries to candidate `serve`, then prove control-plane responsiveness, bounds, identity rejection, and shutdown closure.
6. Update lock/license/fingerprint/smoke/workflow/docs and run local acceptance plus static five-target workflow validation.

Development rollback is a source revert of the R7 candidate. Because Rust never opens production roots and shares no live owner with Node, no production data rollback is needed. Leave the change active for verify; do not archive, dispatch, publish, or cut over.

## Open Questions

None. Dependency versions, durability settings, writer scope, canary inventory, ownership boundary, size limits, and R8/R9 exclusions are fixed by the approved plan.
