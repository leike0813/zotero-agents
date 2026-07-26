## Why

The Assistant Workspace refactor plan
(`artifact/assistant-workspace-refactor-plan-20260718.md`) sequences contract
safety-net work before any architecture change. Today the wire contract between
the TypeScript host and the content-side receivers is hand-duplicated on both
sides with no automated drift check — and it has already drifted once
(`forbiddenWireFields`: 15 fields host-side vs 9 receiver-side). Producer-side
assertions run only in tests, data-plane fixtures are hand-written instead of
production-constructed, and the SkillRunner run-dialog boundary is locked only
by source-text regex tests that break on renames yet miss real shape drift.

## What Changes

- Expose the v1 wire field lists as importable registries on both sides
  (exported TS constants in `assistantWorkspacePublication.ts`;
  `window.AssistantWorkspaceAcpChild.wireFieldRegistry` in the ACP child) and
  add `test/core/190-assistant-workspace-wire-drift.test.ts`, which fails with
  kind-and-field precision whenever the two sides drift.
- Align the receiver's `forbiddenWireFields` with the host's 15-field set.
- Assert every outgoing publication in debug builds at the coordinator's
  single construction funnel (`createPublication`), gated by the new
  `WORKSPACE_PUBLICATION_WIRE_ASSERT_ENABLED` build flag plus debug mode, so
  release builds fold the check out.
- Rebuild `test/core/184` payload fixtures from production region/transcript
  constructors (acp-skills via `readAcpSkillRunWorkspaceRegions`, acp-chat via
  the session-manager harness), keeping hand-written fixtures only for
  service-status and acp-skills owner-details, each guarded by a
  constructor-passes-assertion smoke test.
- Rewrite `test/core/71-skillrunner-run-dialog-ui-e2e-alignment.test.ts` as
  behavior-level contract tests: production snapshot capture through
  `attachSkillRunnerSidebarHost`, receiver consumption via vm-loaded
  `assistant-panel-model.js` with Proxy-recorded field-path diffing, and
  mount-point linkage for `run-dialog.html`. Reuse the production snapshot in
  `test/core/97`'s SkillRunner envelope.
- Deepen `test/core/97` region-isolation invariants from mount-node identity
  to full-subtree node identity (mounts are reused permanently, so
  mount-level checks could not catch a guard miss that rebuilds content).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: Both wire peers expose their
  field registries, an automated drift guard compares them, debug builds
  self-check every produced publication, and data-plane tests derive fixtures
  from production constructors.
- `assistant-workspace-ui-refresh-governance`: Region-isolation invariants are
  locked at full-subtree node identity so guard misses that rebuild region
  content are detected.
- `skillrunner-sidebar-host-runtime`: The run-workspace snapshot boundary is
  verified by behavior-level production/consumption contract tests instead of
  source-text matching.

## Impact

Affected areas: `src/modules/assistantWorkspacePublication.ts`,
`src/modules/assistantWorkspacePublicationCoordinator.ts`,
`src/modules/debugMode.ts`, `typings/global.d.ts`,
`zotero-plugin.config.ts`,
`addon/content/shared/assistant/assistant-workspace-acp-child.js`, tests
`test/core/71`, `test/core/97`, `test/core/184`, new `test/core/190`, and test
helpers. No wire-format, behavior, or persisted-state changes; the only
production-code change is debug-gated self-checking and export reshaping for
testability.
