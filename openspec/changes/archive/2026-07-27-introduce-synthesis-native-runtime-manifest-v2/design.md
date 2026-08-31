## Context

R7 has completed typed application and durable parity in the Rust workspace,
but the installable runtime remains the frozen Node v1 bundle. The plugin
installer returns a Node path plus JavaScript entrypoint, the supervisor writes
Node identity into launch/discovery documents, and the XPI workflow assembles a
large Node service tree. The Rust `serve` candidate currently implements only a
reduced test surface and does not own the full lifecycle contract.

The latest two GitHub Actions runs fail before checkout because
`nightly-2026-07-25` is an invalid action revision. The preceding runtime run
also exposes a macOS-only Node checksum extraction failure. R8 can remove that
second path instead of repairing transitional Node delivery.

## Goals / Non-Goals

**Goals:**

- Make manifest v2 and one native executable the only installable runtime
  representation.
- Preserve strict atomic installation, compatible rollback, freshness,
  signature, identity, bounded lifecycle, and isolated shadow-root semantics.
- Make the Rust service satisfy the existing public health, handshake, read,
  compute, worker, and shutdown contracts.
- Restore a reproducible five-platform candidate workflow without automatic
  publication.

**Non-Goals:**

- Switching the production database, canonical, Host, application, or
  `SynthesisClient` owner to Rust.
- Adding public mutation capabilities or a Node fallback.
- Deleting the Node differential oracle.
- Configuring production Authenticode or Apple signing credentials.
- Dispatching, publishing, synchronizing, or archiving the change.

## Decisions

### Manifest and pointer v2 are a hard compatibility boundary

The v2 parser accepts only `implementation: "rust-native"` and removes all
Node-specific fields. Active and previous pointers also use a v2 schema so a
legacy pointer cannot accidentally authorize rollback. A successful first v2
activation leaves legacy version bytes unreachable for diagnosis and clears an
incompatible previous pointer.

Keeping a union v1/v2 parser was rejected because it would preserve a hidden
Node launch and rollback path inside the production installer.

### Time expiry applies before activation, not after activation

`createdAt` is required and `expiresAt` is nullable. A non-null expired bundle
is rejected during synchronization, packaged verification, staging, and
activation. An already activated immutable version is verified by identity and
bytes on restart without reapplying wall-clock expiry, so an offline profile is
not disabled by the passage of time.

### Signature state is explicit and policy-owned

Windows and macOS candidates can state `unsigned-candidate`; Linux states
`not-applicable`. Candidate tooling accepts unsigned state only through an
explicit development policy passed in-process. Production installer, sync,
freshness, and XPI paths accept verified platform signatures only and expose no
environment or user-config bypass.

### Corrupt immutable versions are quarantined

Before reinstalling a corrupt v2 `versions/<bundleId>` tree, the installer
atomically moves it below the managed `quarantine/` root. This preserves
evidence and avoids destructive in-place repair. Staging remains disposable
and never becomes visible through an active pointer.

### Rust service is split by ownership rather than operation strings

`main.rs` dispatches CLI modes only. Config/lifecycle owns strict documents,
owner/lease/discovery and shutdown triggers; HTTP owns bounded transport and
authentication; service composition owns repository/canonical/private typed
applications; worker pool owns queueing, child lifetime, cancellation,
replacement, counters, and fuse state. Typed capability handlers remain
explicit and reuse existing Rust kernels.

A generic command registry or generic application state machine was rejected
because it would erase the typed application and capability boundaries proven
in R7.

### Worker orphan prevention uses the existing control pipe

The same executable runs worker mode. The worker keeps a dedicated reader on
the parent-owned pipe and exits the process on EOF even while compute is
running. Service shutdown closes or kills the worker before repository owners
close. This avoids a new process-management dependency and covers forced parent
termination on every target.

### One workflow owns five-platform candidate assembly

`build-synthesis-sidecar-runtime.yml` becomes the sole matrix workflow and the
duplicate Rust candidate workflow is removed. The Rust toolchain action is
pinned to full commit
`2c7215f132e9ebf062739d9130488b56d53c060c` with explicit
`toolchain: nightly-2026-07-25`. The workflow uploads run artifacts but has no
ordinary-push release mutation. Release publication remains a later
signature-authorized step.

## Risks / Trade-offs

- [R8 leaves formal release blocked without signed macOS/Windows bytes] →
  Candidate policy is explicit and release/freshness/XPI checks remain
  fail-closed until R9 supplies signatures.
- [A full native lifecycle surface is broader than the current Rust `serve`
  canary] → Reuse the existing language-neutral contracts and add a real
  installer/supervisor/service integration test over isolated roots.
- [Legacy v1 bytes remain on disk after first activation] → They are
  unreachable by v2 pointers and can be inspected or removed by a later
  operator-governed cleanup.
- [Consolidating workflows removes a historical workflow name] → Preserve the
  formal runtime workflow path and migrate all candidate gates into it.
- [Remote platform behavior cannot be proven locally] → Wire and statically
  validate all five jobs, run the Linux integration locally, and keep the
  change active until a separately authorized remote run succeeds.

## Migration Plan

1. Add contract tests and the manifest/lifecycle v2 corpus.
2. Consolidate and repair the candidate workflow without dispatching it.
3. Implement v2 package verification, installation, quarantine, and native
   supervisor launch.
4. Bring the Rust service and worker lifecycle to contract parity.
5. Replace Node runtime packaging/freshness/XPI inventories with native v2.
6. Run local Linux and repository-wide gates. Leave the change active if
   five-platform evidence is absent.

Rollback before production cutover consists of disabling the candidate path;
production data has not moved. Within v2, explicit rollback swaps only two
fully verified compatible Rust bundle pointers.

## Open Questions

None. Production signing credentials and owner cutover are intentionally
deferred to R9.
