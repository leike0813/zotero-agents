## Context

The first native production cutover writes
`state/synthesis-cutover/receipt.json`. That receipt currently combines two
different facts: the irreversible transfer away from plugin/Node ownership and
the build fingerprint of the Rust bundle that happened to perform the
transfer. Receipt transition validation deliberately makes every durable field
immutable. As a result, a later compatible Rust build cannot be admitted
without rewriting the ownership receipt, so startup classifies the new bundle
as `runtime_mismatch` and enters Rust-only repair.

The production database, WAL/SHM family, canonical tree, and first cutover
evidence must survive this repair. The service already has content-addressed
runtime installation, production backup verification, mutation-disabled
startup, critical smoke, durable activation, and startup reconcile. The
upgrade path should compose those mechanisms instead of introducing another
owner or migration implementation.

## Goals / Non-Goals

**Goals:**

- Preserve the first cutover receipt as immutable ownership-transfer evidence.
- Admit a newer Rust build through an atomically persisted, generation-scoped
  runtime admission state.
- Automatically upgrade only across equal profile, protocol, data schema, and
  capability identity.
- Restore the verified old Rust generation after any failure before durable
  activation.
- Resume promotion, without rollback, after durable activation of the new
  generation.
- Keep all upgrade attempts fail closed with stable structured diagnostics.

**Non-Goals:**

- Migrate protocol, production schema, canonical format, or capabilities.
- Return ownership to plugin/Node or make their implementations a fallback.
- Rewrite the first cutover receipt, history, or production store format.
- Add clean-reset behavior, publish bundles, dispatch prebuilds, or validate
  against the live `Zotero_data_2` profile.

## Decisions

### 1. Persist runtime admission separately from first cutover

`SynthesisProductionRuntimeAdmissionState` is a private versioned document:

- `current` binds a monotonically increasing generation to the admitted bundle,
  build and capability fingerprints, protocol/schema identity, and most recent
  service/activation identity.
- `pendingUpgrade` binds the next generation to the previous generation, target
  runtime identity, verified backup basis, current stage, and target activation
  evidence when it exists.

The state store validates every transition and uses atomic replacement. An
existing admitted receipt without this file is bootstrapped once as generation
1 after the receipt, installed bundle, and production identity agree. The
cutover receipt remains byte-for-byte unchanged.

Alternative: update the cutover receipt fingerprint on every upgrade. Rejected
because it destroys the distinction between first ownership transfer and
runtime replacement and weakens its existing monotonic transition checks.

### 2. Make compatibility an exact contract comparison

Automatic upgrade requires the same profile, protocol version, production data
schema, runtime target, and capability fingerprint. The target build
fingerprint must differ and both bundles must pass normal installer
verification. Any capability, protocol, schema, target, or profile difference
fails before writing `pendingUpgrade`.

Alternative: infer compatibility from semver. Rejected because service version
does not prove data or operation compatibility.

### 3. Treat the pending document as the recovery journal

The coordinator advances a pending upgrade through these durable stages:

1. `backup_verified`
2. `preflight_passed`
3. `candidate_started`
4. `smoke_passed`
5. `activation_persisted`

Before creating the pending entry it verifies the current admitted generation,
old installed bundle, and live production identity. It then stops the old Rust
owner and waits for lock release. The existing backup service captures and
verifies the database family and canonical tree. Production preflight runs
against the verified backup copy, never the live roots.

The new runtime receives a production admission DTO containing the immutable
cutover receipt identity, admission-state path/digest, and expected generation.
Discovery, health, handshake, smoke evidence, and activation evidence all
return that generation so stale processes cannot satisfy a later attempt.

### 4. Use durable activation as the rollback boundary

Before `activation_persisted`, any error stops the candidate, verifies and
restores the backup, clears the pending entry, and restarts the pinned previous
Rust generation. Recovery never opens plugin/Node code.

At and after `activation_persisted`, rollback is prohibited. Startup reads
Rust-persisted activation evidence. If it matches the pending generation and
identity, the plugin atomically promotes pending to current. Missing or
mismatched evidence leaves the profile repair-required.

Promotion updates only runtime-admission state. Startup reconcile happens
after promotion, under the admitted mutation gate. A reconcile error therefore
cannot be misclassified as a pre-activation failure or restore old data.

### 5. Keep installed generations addressable during recovery

The installer resolves a verified runtime by build fingerprint rather than
only through the mutable active pointer. It retains the current admitted bundle
and pending target while an upgrade journal exists. The supervisor receives an
explicit resolved runtime and generation; it never re-resolves the active
pointer during launch or restart.

Alternative: copy the old executable into the production backup. Rejected
because runtime provenance and bundle verification already belong to the
content-addressed installer.

### 6. Prefer structured diagnostic reasons

Lifecycle diagnostics publish `runtime-admission` before receipt
classification. Error projection uses `details.reason` first, then the stable
error code, and never tokenizes human-readable messages. A build mismatch
records current/target fingerprints in sanitized details and renders
`runtime-admission / runtime_mismatch`.

## Risks / Trade-offs

- **Crash between service activation and plugin promotion** → Persist
  generation-bound activation in Rust first and make promotion idempotently
  resumable.
- **Old bundle disappears during an attempt** → Verify and pin both bundles
  before writing pending state; fail with zero production writes otherwise.
- **Backup restore races an owner** → Stop the candidate and prove owner-lock
  release before restore, then verify the restored digest before restarting the
  old generation.
- **Reconcile failure is mistaken for upgrade failure** → Promote before
  reconcile and make post-promotion failures repair-only.
- **Additional disk use** → Retain only current plus pending generations under
  the installer’s existing content-addressed layout; ordinary cleanup must
  respect admission pins.

## Migration Plan

1. Add contract parsers and transition-focused tests for runtime admission,
   generation-bound smoke, and activation.
2. Add the atomic admission state store and bootstrap generation 1 for an
   already admitted matching profile.
3. Extend installer, backup, supervisor, and owner coordination with pinned
   generation upgrade and pre-activation recovery.
4. Extend the Rust runtime contract and lifecycle persistence to validate and
   report the expected admission generation.
5. Correct diagnostics and UI projection, then update current-state
   documentation.
6. Run focused TypeScript/Rust gates and a copied-profile acceptance exercise.

Code rollback is safe before a new generation reaches durable activation. Once
activation is durable, the old bundle and old data must not be restored; only
idempotent promotion or Rust-only repair is allowed.

## Open Questions

None. Compatibility fields, rollback boundary, data-preservation rules, and
release exclusions are fixed by the approved plan.
