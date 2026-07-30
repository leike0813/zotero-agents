## Lifecycle supersession

`simplify-xpi-owned-synthesis-sidecar-lifecycle` supersedes this change's
cutover receipt, runtime admission, activation, critical-smoke, owner/lease,
and generation work. Those completed tasks are historical implementation
records and MUST NOT be reapplied. The surviving scope of this change is
language-neutral operation parity, Rust ownership, packaging evidence, and
release-independent verification.

## Why

R9a has switched the default production route to the Rust native owner, but its
acceptance evidence is not durable after OpenSpec archival and its critical
smoke covers only a subset of the checks required before mutation admission.
R9b must not delete the remaining oracle and legacy source until the accepted
native owner can be re-verified from current-state contracts alone.

## What Changes

- Make the exact 95-operation ownership, corpus, TypeScript, Rust dispatcher,
  ready-roster, and evidence partition check independent of active or archived
  OpenSpec change directories.
- Treat the language-neutral production operation inventory and seven surface
  corpora as the durable evidence source; historical task completion is not a
  runtime or verification dependency.
- Expand production critical smoke to cover every read/storage/worker category
  required by the production-owner cutover contract before mutation admission.
- Bind the activation smoke digest to a named, versioned check roster so a
  partial or stale smoke cannot be replayed as complete evidence.
- Correct the R9 current-state documentation and record the exact retained
  Node/plugin deletion inventory for the two dependent R9b changes.
- Require one pre-deletion seven-platform native candidate gate and representative
  clean-machine evidence before destructive retirement begins; this change does
  not dispatch or publish that workflow.
- Materialize sidecar bundles under the shared platform-first native asset
  layout without replacing Host Bridge binaries in the same target directory.
- Repair the clean-profile production bootstrap, default-client cutover
  lifecycle, and runtime-root composition defects found by the representative
  Zotero check.
- Add a read-only Synthesis diagnostic surface shared by Workbench, Task
  Manager, runtime diagnostic export, and the direct launcher: production keeps
  bounded failure summaries, while debug builds add correlated lifecycle, RPC,
  reverse-Host, operation, and process events.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-native-production-activation`: Make inventory and evidence
  verification archival-safe and bind activation to a complete versioned smoke
  roster.
- `synthesis-production-owner-cutover`: Make every required critical-smoke
  category explicit, observable, and mandatory before mutation admission.
- `synthesis-rust-sidecar-migration-governance`: Establish the R9a retirement
  baseline and the pre-deletion remote-evidence gate without claiming release
  completion.
- `synthesis-sidecar-runtime-packaging`: Align sidecar materialization with the
  shared `addon/bin/<target>/` native asset layout.
- `synthesis-sidecar-prebuild-release`: Treat the workflow-emitted v2 result
  document and its cache summary as the synchronization authorization boundary.
- `synthesis-sidecar-debug-observability`: Expose sanitized failure summaries
  in production and a correlated, payload-free operation timeline in
  development builds.

## Impact

- Affects production capability/surface parity checkers, critical-smoke
  orchestration, activation evidence, existing R9a Core tests, Stage-1 gates,
  sidecar materialization, and Synthesis current-state documentation.
- Does not change public `SynthesisClient` methods, production ownership,
  reverse-Host authority, runtime distribution, or release state. The internal
  cutover receipt admits an explicit empty-profile source identity.
- Is a prerequisite for `remove-synthesis-plugin-legacy-owner` and
  `remove-synthesis-node-sidecar-stack`.
