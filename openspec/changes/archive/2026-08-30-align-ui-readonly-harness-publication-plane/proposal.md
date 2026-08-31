## Why

The read-only UI harness still delivers Assistant Workspace data over the removed
`assistant-workspace:child-snapshot` message. The production sidebar migrated to
the publication plane (`assistant-workspace:child-publication` envelopes, ready
handshake, four-stage ACK), so the harness shell silently drops every assistant
snapshot and all three Assistant tabs (ACP Chat / ACP Skills / SkillRunner)
render nothing. The harness assistant model is also built on view-model builders
(`buildAcpSidebarViewSnapshot`, `buildSkillRunnerSidebarSections`) that
production no longer consumes, and secondary drift accumulated: missing sidebar
bundle coverage, disabled live reload, a dead `--check` field, and stale
component docs.

## What Changes

- Deliver harness Assistant data through the real
  `AssistantWorkspacePublicationRuntime` / `AssistantWorkspacePublicationCoordinator`
  driven by a harness-owned readonly publication adapter fed from the readonly
  SQLite stores; no production surface adapter is modified.
- Send the harness INIT payload with the real
  `ASSISTANT_WORKSPACE_ACTION_REGISTRY` surface configuration and per-tab
  surface labels, and route publication ACKs, transcript page requests, and
  owner-selection actions through the runtime; write-capable actions stay on
  the mock-action log and never execute.
- Build the two sidebar bundles (`assistant-workspace.bundle.js`,
  `acp-child.bundle.js`) in-memory like the existing workspace/synthesis
  bundles, and re-enable client live reload.
- Fix the stale `--check` synthesis field and rewrite
  `doc/components/ui-readonly-harness.md` to the current architecture.
- Remove the dead `CHILD_SNAPSHOT` wire constant once no sender remains.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-readonly-harness`: Assistant panel delivery moves to the publication
  plane with real runtime/coordinator reuse; INIT carries production surface
  configuration and labels; sidebar bundles are covered by the harness bundle
  builder; live reload is restored.

## Impact

- `src/modules/harness/` (new `assistantReadonlyPublication.ts`, slimmed
  `assistantReadonlyModel.ts`), `scripts/ui-harness-serve.ts`,
  `addon/content/harness/harness-host.js`, `test/ui/156-ui-readonly-harness.test.ts`,
  `doc/components/ui-readonly-harness.md`, `src/shared/assistantWireContract.ts`
  (dead constant removal).
- No production publication-plane behavior changes; no write path is added to
  the harness; Dashboard and Synthesis bridges are untouched.
