# Design: Assistant Workspace Contract Single Source of Truth

## Context

Phase 1 of the refactor plan. Phase 0 left the wire contract guarded but
still hand-duplicated. The structural blocker was that sidebar page scripts
were static IIFE files outside the build pipeline, so nothing could be
shared with the TypeScript host. This change first builds the pipeline, then
moves every duplicated contract onto it.

## Decisions

### D1. ES modules as `.js`, not `.ts`, for migrated files

The seven scripts (11.6k LOC) keep their `.js` extension under
`src/sidebar/`. tsconfig has no `allowJs`, so they stay outside tsc and
produce no type-error churn; esbuild, ESLint, and tsx all handle them.
Full typing arrives with the Phase 2 component rewrite, which replaces
these internals anyway. Only the new contract modules are `.ts`.

### D2. One page bundle per entry, no splitting

Three entries (`acpChildApp`, `runDialogApp`, `assistantWorkspaceApp`)
mirror the existing `workspaceApp.ts` precedent (bundle, firefox115, no
define/plugins). esbuild code splitting would require ESM output and a
different script-loading model; module singleton state (reply history,
virtual-scroll WeakMaps) stays per-page exactly as with per-page script
tags today.

### D3. `src/shared/` as the only crossable boundary

Page bundles must never pull privileged code. New contract modules live in
`src/shared/` (already the pure-frontend directory), and an ESLint
`no-restricted-imports` override for `src/sidebar/**` allows only relative
paths and `src/shared/**`. The publication module's Phase 0 wire constants
moved down into `assistantWireContract.ts` and are re-exported for
compatibility.

### D4. Validate-once, import-everywhere for SkillRunner snapshots

The ACP publication plane validates with dual-written TS and JS
implementations (kept aligned by Phase 0's drift guard). The SkillRunner
snapshot boundary improves on this: one `validate` implementation in
`skillRunnerSnapshotContract.ts` backs both the TS assert (producer,
debug-gated) and the JS boolean gate (receiver), so the two sides cannot
drift by construction. Validation is layered: schema equality, required
structural keys (critically the own `session` key, whose absence triggers
the receiver's envelope-as-session sniffing fallback), known-key whitelists
that reject unknown fields per level, and L2 type spot checks. Decorated
fields stay optional because the bare producer snapshot legitimately lacks
them.

### D5. Action payloads as compile-time mirrors of the runtime registry

`src/shared/assistantActionContract.ts` types every registry action
payload; compile-time guards in `assistantWorkspacePublication.ts` force
the type map's keys to equal the registry's `payloadKeys` and the
chat/skills subsets to equal the registry's `sources`. Five host routes
without known senders are annotated `TODO(contract)` and retained.

### D6. Vocabulary unification is atomic per term

`close-drawers` and `open-details-drawer` were changed on the emitter and
all listeners in the same pass; dead `acp-skill-run:*`/`acp:*` message
types (unreachable on both sides) were removed. Everything else — runtime
registries, validation gates, rendering — is unchanged.

## Risks

- Page-bundle load-order assumptions (runDialog's load-time DOM access,
  acp-child's auto-boot guard) are preserved by keeping bundles as
  body-end classic scripts; verified by the real-Zotero smoke pass.
- The localization governance scanner used `window.AssistantPanelModel` as
  a slice marker; it was repointed at the module's `export {` tail in the
  same migration.
- `test/core/97`'s deny-list forbids specific bundle names; the chosen
  names avoid it and the deny-list itself remains.

## Post-landing defect and lesson (2026-07-19)

Before merging to main, a regression was caught in real Zotero: the
SkillRunner transcript stayed blank while the rest of the panel rendered.
Root cause: the W1 migration converted `runDialog.js`'s window-era module
accessors into hand-written static objects and omitted
`adaptLegacyTranscriptItem` from the transcript-renderer accessor;
`items.map(undefined)` then threw inside a scheduled microtask. Property
access on a hand-maintained object is invisible to `no-undef` linting, so
nothing caught it. Fix: the window-era accessors were removed from
`runDialog.js` entirely and every usage site now references the imported
bindings directly, so a missing import becomes an ESLint `no-undef` error.
A behavior-level regression test in `test/core/71` (layer B) now maps real
projected conversation items through `adaptLegacyTranscriptItem` — the exact
call the receiver makes. Lesson: indirection objects that re-list imported
members are hazards; import and call directly.

