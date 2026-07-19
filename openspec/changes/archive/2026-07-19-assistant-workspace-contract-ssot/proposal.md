## Why

Phase 1 of the Assistant Workspace refactor
(`artifact/assistant-workspace-refactor-plan-20260718.md`). The sidebar panel
scripts lived outside the build pipeline as hand-written IIFE files, so the
TypeScript host and the content pages could not share types or constants:
message types, bridge keys, and wire field lists were duplicated by hand, the
UI→host action payload was `Record<string, unknown>`, and the SkillRunner
snapshot boundary had no validation at all — drift failed silently at render
time. Phase 0 built the safety net (drift guard, debug self-checks,
behavior-level contract tests); this change removes the root cause.

## What Changes

- Move the seven sidebar scripts into `src/sidebar/` as ES modules and build
  three page bundles with esbuild (`acp-child.bundle.js`,
  `run-dialog.bundle.js`, `assistant-workspace.bundle.js`), keeping vendor
  libraries static and confining page-bundle imports to relative paths and
  `src/shared/**` via an ESLint boundary rule.
- Add `src/shared/assistantWireContract.ts` as the single source for wire
  field lists, message types, bridge keys, and out-of-band actions; the
  publication module re-exports for compatibility and the ACP child deletes
  its hand-duplicated validator tables.
- Add `src/shared/assistantActionContract.ts` typing every registry action
  payload, with compile-time drift guards against the runtime action
  registry; narrow sidebar envelopes and routers.
- Add `zotero-agents.skillrunner-workspace-snapshot.v1`: the producer stamps
  the schema and self-checks in debug builds
  (`SKILLRUNNER_SNAPSHOT_WIRE_ASSERT_ENABLED`), and the run-dialog receiver
  gates on one shared validate implementation imported from
  `src/shared/skillRunnerSnapshotContract.ts` — no dual-written validators.
- Unify vocabulary: remove dead `acp-skill-run:*`/`acp:*` message types;
  `assistant-panel:close-drawers` → `assistant-workspace:close-drawers`;
  `openDetails` → `open-details-drawer`.
- Migrate the affected tests from vm script loading to in-process imports;
  add `test/core/191` for the new snapshot boundary; reshape `test/core/190`
  into a shared-registry integrity smoke with an anti-hardcoding grep guard.

## Capabilities

### New Capabilities

- `assistant-sidebar-build-pipeline`: Sidebar page scripts are ES modules
  under `src/sidebar/`, bundled per page by esbuild, with vendor libraries
  kept static and an import boundary that keeps page bundles free of
  privileged code.

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: Wire field lists, message
  types, bridge keys, and out-of-band actions have one shared source imported
  by both peers; action payloads are typed with compile-time registry drift
  guards.
- `skillrunner-sidebar-host-runtime`: The run-workspace snapshot boundary is
  schema-versioned and validated on both sides via one shared implementation,
  with a debug-gated producer self-check.

## Impact

Affected areas: new `src/sidebar/` and two `src/shared/` contract modules,
`zotero-plugin.config.ts` (three esbuild entries + one define),
`eslint.config.mjs` (import boundary), the four sidebar HTML pages,
`assistantWorkspaceSidebar.ts`, `assistantWorkspacePublication.ts`,
`skillRunnerRunDialog.ts`, `debugMode.ts`, `typings/global.d.ts`,
`scripts/check-localization-governance.ts`, tests 65/71/83/84/94/95/97/107/
184/190/191 and helpers, `AGENTS.md`, and `doc/components/debug-mode.md`.
Removed files: the seven legacy sidebar scripts under `addon/content/`. No
wire-format changes beyond additive schema stamping; rendering logic is
untouched.
