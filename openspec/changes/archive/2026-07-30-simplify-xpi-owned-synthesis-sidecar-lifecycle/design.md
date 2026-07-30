## Context

The XPI contains one platform bundle. It must be copied out of the package
before execution, but it is not an independently managed product. Existing
profiles may contain admission, receipt, activation, owner, lease, active
pointer, previous pointer, version directories, and cutover backups. Those
files are historical input only and must not control the simplified startup.

## Goals / Non-Goals

**Goals:**

- One current XPI bundle, one installed directory, one child process, and one
  current-session connection.
- One OS-released lock for the production database and canonical root.
- No persisted process identity or runtime generation.
- Preserve public client behavior and production bytes on ordinary startup.
- Keep future schema migration recoverable without backing up every startup.

**Non-Goals:**

- Add an online runtime feed, hot swap, runtime rollback, or candidate channel.
- Delete legacy profile files or old runtime directories automatically.
- Change public Synthesis operation DTOs or business behavior.
- Publish, prebuild, sign, or release an XPI.

## Decisions

### 1. The XPI bundle is the runtime authority

The installer loads and verifies only the current packaged manifest and file
table. It materializes the bundle at
`runtime/synthesis/service-runtime/current`. Matching content is reused.
Changed content is written to a sibling staging directory and swapped into
`current` only after verification. Temporary old/staging directories are
transaction artifacts, not selectable versions. There is no resolver,
pointer, previous version, quarantine, or rollback API.

Bundle and build fingerprints remain release diagnostics. They do not form a
second admission identity, and manifest expiry is not a startup policy for an
XPI-owned binary.

### 2. One held file lock is the ownership boundary

The Rust process opens `state/synthesis.lock` and holds an exclusive OS file
lock for its complete production lifetime. Lock acquisition failure returns
`production_lock_conflict`. The file contains no PID, receipt, capability, or
service identity; process death releases the lock automatically.

The plugin keeps the child stdin/control pipe open. EOF means the parent no
longer exists and triggers sidecar shutdown. Normal shutdown uses the RPC
shutdown path first and process termination only as a bounded fallback.

### 3. Discovery and instance identity are session scoped

Every launch uses a unique session directory. Config and discovery live only
under that directory, so the supervisor never polls a shared discovery file
and needs no owner, lease, stale-discovery, or stale-PID recovery.

`serviceInstanceId` fences requests and responses for that live connection. It
is never written into a durable profile state file. Rust application errors
for parsed calls echo the real request and service identities; the client
preserves the application error instead of rewriting it as
`runtime_mismatch`.

### 4. Production opens directly

The launch config carries profile, production database, canonical root,
reverse-Host locator, bundle identity, protocol, and per-launch credentials.
After taking the lock, Rust opens or initializes production and starts with
mutations enabled. There is no production admission file, activation RPC,
critical-smoke digest, receipt refresh, or startup promotion.

A complete absent database/canonical pair initializes an empty profile. A
partial pair fails with `synthesis_source_state_incomplete`.

### 5. Backups belong only to schema migration

When stored and current schemas match, startup creates no backup. When a
registered migration path exists, Rust creates one schema backup while holding
the production lock, migrates SQLite transactionally, stages any canonical
rewrite, and replaces canonical content only after success. Missing migration
paths or failed backup/migration leave the original production basis intact
and stop startup.

### 6. Legacy control files become inert

Admission, receipt, activation, owner, lease, active/previous pointers, old
versions, and cutover backups are not read, rewritten, moved, or deleted. The
first simplified release requires a normal Zotero restart and verifies that no
old sidecar process is running before controlled real-profile acceptance.

## Migration Plan

1. Replace focused tests with XPI-only installation, launch-session, lock,
   restart, RPC-error, and inert-legacy-state expectations.
2. Simplify shared launch/discovery/RPC contracts, then update Rust and
   TypeScript against the same contract.
3. Collapse the production owner to install, launch, health/handshake, publish,
   reconcile, and shutdown.
4. Delete admission, cutover, activation, smoke, backup, resolver, pointer, and
   rollback code after callers reach zero.
5. Update current specs and dependent active OpenSpec changes so removed
   concepts cannot be reintroduced by later retirement work.
6. Run local gates and exercise the real Rust production path on a temporary
   profile that contains inert legacy files. Do not write the real profile.

## Risks / Trade-offs

- A surviving pre-change sidecar does not know the new lock. The rollout
  therefore requires Zotero and all sidecars to be stopped before first use.
- XPI replacement cannot swap a running Windows executable. Startup performs
  installation before launch and fails without replacing `current` if the old
  executable is still open.
- Removing startup critical smoke moves broad operation coverage to tests and
  release evidence. Runtime health and handshake remain bounded readiness
  checks, not business-operation audits.
