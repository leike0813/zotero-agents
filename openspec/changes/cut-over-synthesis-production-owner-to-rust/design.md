## Context

The plugin currently starts a verified manifest-v2 Rust runtime, but the native service owns only derived shadow roots, advertises two read canaries, and hard-codes `mutationEnabled: false`. The default client still creates the legacy in-process composition, which owns production SQLite, Topic canonical files, Zotero adapters, delivery, WebDAV, and the code-owned 96-method grouped client.

R7 already proved typed application and durable behavior against independent Node/Rust roots. R9a must consume that implementation without sharing live roots, exposing a remote god object, or introducing a production fallback. The plugin must remain the only Zotero/credential/UI authority, while Rust becomes the only Synthesis DB/canonical/application authority.

R8 remote five-platform evidence is deferred by explicit user direction. That permits local R9a implementation and production-copy rehearsal, but not a release, signed-XPI, real-machine, or complete Stage 1 claim.

## Goals / Non-Goals

**Goals:**

- Preserve the public grouped `SynthesisClient` contract while routing all production methods to Rust.
- Provide the minimum explicit reverse-Host capabilities needed by native applications.
- Transfer production DB/canonical ownership once, with a verified backup, exclusive lock, durable receipt, and deterministic recovery.
- Keep Zotero startup non-blocking and make unavailable/incompatible/repair states visible and fail closed.
- Keep legacy/Node source available only as an isolated oracle until R9b.

**Non-Goals:**

- Delete Node or legacy implementation source, dependencies, or release assets.
- Redesign public Workflow, Host Bridge, MCP, Workbench, or Synthesis DTOs.
- Dispatch remote workflows, publish artifacts, sign an XPI, or claim five-platform acceptance.
- Support Node downgrade, per-request fallback, shared production roots, or a user-selectable implementation toggle.

## Decisions

### 1. Use one closed production RPC registry

The language-neutral contract set will define stable grouped operation identifiers, strict request/result envelopes, and per-operation size/deadline metadata. TypeScript and Rust will consume the same inventory. Dispatch is closed and generated/declared once; no generic public `execute(method, json)` surface is exposed.

Alternative considered: tunnel the legacy service object or arbitrary method names. Rejected because it recreates the god object, loses schema ownership, and prevents completeness auditing.

### 2. Keep the public client stable and replace only its composition

`SynthesisClient` remains the sole production facade. A native adapter maps each grouped method to the closed RPC registry and retains existing error normalization, delivery-context handling, generation invalidation, and shutdown behavior. The code-owned client currently exposes 96 methods; older 108-method planning text is treated as documentation drift. `getDefaultSynthesisClient()` initializes this native composition only; production code cannot construct legacy composition.

Alternative considered: migrate callers in domain batches. Rejected because production would retain two owners and ambiguous fallback semantics.

### 3. Add a separately scoped reverse-Host endpoint

The supervisor creates a plugin-owned authenticated loopback endpoint and passes its locator plus a distinct scoped token in launch configuration. Requests bind profile, supervisor generation, service instance, operation correlation, deadline, and payload limits. Its registry contains only existing typed Host ports: paged library/artifact/image reads, export delivery, secret-free WebDAV operations, related-item/tag/staged-binding effects, and their receipts.

The endpoint cannot receive arbitrary Zotero methods, paths, HTTP targets, credentials, functions, or host objects. It closes before the service process during shutdown so stale instances cannot produce effects.

Alternative considered: let Rust read Zotero DB or prefs. Rejected because it violates host ownership and permission boundaries.

### 4. Model ownership independently from mutation admission

Lifecycle contracts gain:

- `ownerMode: "shadow" | "production"`;
- `mutationEnabled: boolean`;
- `capabilityFingerprint`;
- optional `cutoverReceiptId` required for production mode.

Production ownership can be established while mutation remains disabled for smoke. This avoids conflating “database opened” with “safe to accept writes.”

### 5. Persist one cutover state machine and receipt

The profile cutover states are:

`legacy` → `maintenance` → `backup_verified` → `preflight_verified` → `native_owner` → `mutation_enabled`.

The coordinator is generation-scoped and idempotent. A receipt binds profile, source backup identity, schema before/after, canonical manifest/hash, durable-decision summary, runtime/capability fingerprint, service/worker identity, timestamps, and current phase. Phase transitions use atomic file replacement/fsync and repository transactions where applicable.

The first compatible upgrade automatically starts the coordinator in the background. A completed matching receipt skips migration and starts the native owner directly. A partial receipt invokes deterministic phase recovery and never guesses ownership.

### 6. Transfer only after the legacy writer is closed

The coordinator stops mutation admission, drains/cancels explicit operations, disposes the legacy composition, verifies repository/canonical lock release, and then snapshots production state. Rust preflight reads a separate production copy. Only after backup and dry-run validation may Rust acquire the production owner lock and open live roots.

The plugin never opens live DB/canonical roots after `native_owner`. Static guards make this a build-time invariant.

### 7. Fix recovery at the mutation boundary

- Before live migration: leave legacy owner unchanged.
- After live migration but before mutation admission: stop Rust, release the lock, and perform only a verified compatible reversal or backup restore.
- After mutation admission: no automatic legacy/Node return. Recovery is compatible Rust restart/repair/forward migration or explicit restore while stopped and unlocked.

Mirror/Host-effect failures after canonical commit remain warnings/attention and cannot roll back Synthesis ownership.

### 8. Keep R9b deletion separate

R9a changes production reachability, not physical source inventory. Boundary checks allow legacy imports only in isolated oracle/test code. R9b will delete Node runtime/service/worker, legacy application/repository/client composition, implementation-detail tests, dependencies, and release branches.

## Risks / Trade-offs

- **Large RPC inventory can drift** → derive TypeScript/Rust dispatch and completeness checks from one versioned inventory and fail startup on fingerprint mismatch.
- **Automatic upgrade cutover can encounter corrupt user state** → require verified backup/restore probe and surface repair-required before any live migration.
- **Reverse Host can widen authority** → separate scoped token, closed registry, strict bounds, current-instance checks, preconditions, and receipts.
- **Partial cutover can create ambiguous ownership** → durable phase receipt plus exclusive owner lock; no writer starts from inference alone.
- **Retained legacy source may accidentally remain reachable** → production import-graph checks and tests proving zero legacy construction.
- **Deferred R8 remote evidence weakens release confidence** → prohibit release/Stage 1 claims and keep the debt explicit in tasks and current-state docs.

## Migration Plan

1. Freeze and fingerprint the complete public client and required Host-port inventory.
2. Add failing corpus/lifecycle/boundary tests for production owner, RPC completeness, reverse Host, receipt phases, and no fallback.
3. Implement the native RPC/Host contracts and Rust dispatch over existing typed application ports.
4. Implement the plugin native client composition and reverse-Host endpoint without changing the default route.
5. Implement backup, production-copy preflight, owner lock, cutover receipt, and recovery in an isolated integration harness.
6. Switch default acquisition to the generation-scoped automatic cutover/native composition.
7. Run critical local smoke and static guards, then update active current-state documentation.
8. Leave remote five-platform, signed-XPI, and real-machine evidence pending; do not archive or publish.

Rollback before mutation admission uses the verified backup or an explicitly compatible reversal. After mutation admission, rollback means a compatible Rust bundle or explicit stopped-service restore, never Node.

## Open Questions

None. R9a scope, automatic-upgrade trigger, no-fallback policy, R8 remote-evidence deferral, and R9b deletion boundary are fixed.
