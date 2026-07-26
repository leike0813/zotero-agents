## Context

R7 already proves Rust durability for the complete 51-table SQLite schema and canonical store, plus typed parity for Workbench/Topic, Citation/Reference, and Tag/Concept/Topic Graph. The final four Node applications consume those aggregates but still lack typed Rust owners and independent differential evidence. Their boundaries include both pure projection and recoverable cross-storage work, so a generic application state machine would hide materially different admission, CAS, receipt, retry, and recovery rules.

The candidate stays private. Node and Rust use different mutable roots and share only immutable fixtures. Production clients, Host effects, canonical ownership, WebDAV configuration, capabilities, and runtime manifests are unchanged.

## Goals / Non-Goals

**Goals:**

- Implement typed Rust applications for Knowledge Checkpoint, Durable Bundle export/import, WebDAV Sync, and Debug/Maintenance.
- Keep validation, diff, conflict, retry, and lifecycle policy in application modules above typed repository/canonical/Host ports.
- Produce independent Node/Rust evidence for public DTOs, stable codes, all SQLite tables, filesystem state, remote object ordering, fault recovery, and reopen behavior.
- Complete R7 and make R8 eligible to start as a separate change.

**Non-Goals:**

- Native runtime manifest v2, lifecycle cutover, new HTTP capabilities, Node fallback, or production Host/WebDAV mutation.
- SQLite migrations, synthetic application tables, generic dispatch, or a new third-party dependency.
- Automatic execution of downstream applications outside explicit corpus scenarios.

## Decisions

### Four applications remain separate deep modules

`synthesis-application` adds `knowledge_checkpoint`, `durable_bundle`, `webdav_sync`, and `debug_maintenance`. Each owns its strict DTOs, policy, admission, cancellation, and drain semantics. Shared code is limited to existing admission, canonical JSON/hash helpers, and typed ports. One umbrella executor was rejected because receipts, retry chains, and read-only coherence have different invariants.

### The repository mirrors existing durable aggregates

A `checkpoint_bundle_webdav_debug` repository module exposes complete Knowledge capture/replacement, Durable capture/import/apply/receipt operations, and coherent Debug projection. Every mutation uses the existing tables and a short transaction with expected bases. Diffing, bundle encoding, import classification, WebDAV conflict policy, and maintenance routing remain outside SQL.

### Canonical import keeps its existing filesystem owner

Durable import prepares canonical promotions in the application, stages them through the existing filesystem writer permit, commits only after the SQLite receipt transaction succeeds, and explicitly discards staging on pre-commit failure. Restart recovery uses the existing import-batch marker and durable repository receipt. This preserves the canonical store as the sole filesystem owner.

### External work uses synchronous typed ports

Bundle source/sink, WebDAV Host I/O, state persistence, retry scheduling, profiler inspection, and maintenance operations are injected typed ports. The parity driver supplies deterministic implementations. A new async runtime was rejected; the application uses existing admission plus an injected cancellable scheduler so no dependency or production runtime changes.

### One final-cluster corpus is the acceptance evidence

`synthesis-checkpoint-bundle-webdav-debug-application-parity-v1` fixes clocks, receipt/run IDs, Host/remote responses, scheduler events, and fault phases. The checker executes the actual Node oracle and Rust candidate with physically isolated repository, canonical, WebDAV state, and remote roots. It compares scenario-appropriate public and durable observations rather than assuming canonical state is always unchanged.

## Risks / Trade-offs

- [Durable import spans SQLite and filesystem state] → Persist an SQLite commit receipt before canonical commit, discard on CAS loss, and test restart recovery at every boundary.
- [WebDAV retries can outlive admission] → Generation-bound scheduler handles are canceled on abort, pause, retrigger, and shutdown; retry count is capped at four.
- [Bundle wire parity is broad] → Reuse the immutable 23-kind contract, strict canonical serialization, fixed hashes, legacy v1 read fixtures, and the shared 4 MiB limit.
- [Debug capture can mix epochs] → Capture repository basis before and after canonical inspection and return `superseded` instead of mixed data.
- [The corpus could normalize real defects away] → Compare public DTOs and owned bytes exactly; normalize only root paths and explicitly documented implementation-neutral identifiers.

## Migration Plan

1. Extend Core 213–217 and Rust tests with stable typed-boundary expectations.
2. Implement typed repository and canonical discard/recovery primitives.
3. Implement the four applications and explicit ports.
4. Add the corpus, driver, checker, Core 218, package script, and candidate workflow gate.
5. Run local verification and update governance to R7 complete/R8 unblocked.

If parity fails, discard the isolated roots and keep Node only as the oracle. There is no production rollback because this change does not register or route a production capability.

## Open Questions

None. The existing Node contracts, Rust durable owners, and three prior typed clusters define the compatibility boundary.
