## Design

### Goal

Bring the readonly UI harness Assistant panel onto the production publication
plane so the shell can render all three Assistant tabs (ACP Chat, ACP Skills,
SkillRunner) without modifying production surface adapters or child pages. The
harness shell, hosts, and client bundles must reuse the same publication
runtime/coordinator pair the plugin sidebar uses, fed by a harness-owned
readonly adapter that reads only the existing readonly SQLite stores.

### Context

The plugin Assistant Workspace migrated to the publication plane
(`assistant-workspace:child-publication` envelopes plus a four-stage ACK
handshake), which retired the previous `assistant-workspace:child-snapshot`
wire. The harness shell still relays the removed snapshot channel and the
Assistant iframe silently drops every payload. At the same time the harness
Assistant model is built on top of
`buildAcpSidebarViewSnapshot` / `buildSkillRunnerSidebarSections`, view-model
shapes that production no longer builds; secondary drift (missing sidebar
bundle coverage, disabled live reload, a dead `--check` field, stale
component docs) accumulated because of that decoupling.

The production publication path is owned by
`AssistantWorkspacePublicationRuntime` /
`AssistantWorkspacePublicationCoordinator`, which accept a `SurfaceAdapter`
exposing `selectedOwner`, `readOwnerNavigation`, `readOwnerRegions`, and
`requestTranscriptPage`. They emit publication envelopes, honor owner
selection, and request transcript pages on demand. None of these need to be
forked: the harness only has to provide a readonly adapter implementation
that reads the harness SQLite stores.

### Approach

1. **Harness-owned readonly publication adapter.** Add
   `src/modules/harness/assistantReadonlyPublication.ts` that owns one
   `AssistantWorkspacePublicationRuntime` and one
   `AssistantWorkspacePublicationCoordinator` per tab source (ACP Chat,
   ACP Skills, SkillRunner). The adapter exposes the four methods the
   runtime needs and reads from the existing readonly plugin-state store
   using exported production DTO helpers. No production file is edited.
2. **Slim the legacy model.** Reduce
   `src/modules/harness/assistantReadonlyModel.ts` to the readonly data
   access still used by the adapter. Drop the deprecated
   `activeSnapshot` / `frontendSnapshot` / `session` / `drawer` shapes
   and the `buildAcpSidebarViewSnapshot` /
   `buildSkillRunnerSidebarSections` call sites; if no caller remains,
   remove the file entirely.
3. **Server-side routing.** Restructure `scripts/ui-harness-serve.ts`
   assistant endpoints into a bootstrap endpoint (INIT payload plus the
   initial publication batch) and a message endpoint (ready / registry
   actions / ACKs / transcript page requests). The bootstrap payload
   carries the real `ASSISTANT_WORKSPACE_ACTION_REGISTRY` as
   `surfaceConfiguration.actionRegistry` and per-tab
   `surfaceLabels` built by the production label builders.
   `--check` reports the real `SynthesisRuntime` member, not the stale
   `synthesisRunning` field.
4. **Sidebar bundle coverage.** Extend the harness bundle builder so
   that, like the existing workspace/synthesis bundles,
   `src/sidebar/assistantWorkspaceApp.js` and
   `src/sidebar/acpChildApp.js` are compiled in memory with the plugin
   build's JSX/Preact options and served at
   `/content/sidebar/assistant-workspace.bundle.js` and
   `/content/sidebar/acp-child.bundle.js`. A fresh worktree still starts
   without a plugin build; editing `src/sidebar/**` triggers rebuilds.
5. **Host page rewrite.** Rewrite
   `addon/content/harness/harness-host.js` to handle INIT,
   `child-publication` delivery, ACK/action relay, and removal of the
   old snapshot/drawer host state, and re-enable `installLiveReload()`
   so source changes refresh connected pages.
6. **Dead wire constant.** Remove the `CHILD_SNAPSHOT` constant from
   `src/shared/assistantWireContract.ts` once no sender remains, and
   update `test/core/190-assistant-workspace-wire-drift.test.ts` so its
   parity assertions no longer reference it.
7. **Documentation refresh.** Rewrite
   `doc/components/ui-readonly-harness.md` to describe the current
   architecture: publication plane delivery, eleven locales,
   `npm run harness:ui` entry, bundle coverage, live reload, and the
   readonly write-classification rule.

### Invariants

- The harness MUST NOT send `assistant-workspace:child-snapshot`.
- The harness MUST NOT modify or fork the production surface adapters,
  the shell, or any child page.
- Write-capable registry actions MUST be recorded on the mock action
  log with a readonly reason; the harness MUST NOT execute them.
- `ASSISTANT_WORKSPACE_ACTION_REGISTRY` and the production label
  builders MUST be the single source of truth for action and label
  data; the harness MUST NOT redefine them.
- The harness MUST NOT touch Dashboard, Synthesis, or Workbench
  bridges; this change is scoped to the Assistant panel only.

### Test Strategy

- Drive `test/ui/156-ui-readonly-harness.test.ts` against the existing
  SQLite fixtures: bootstrap carries the real action registry and
  per-tab surface labels; initial publications are valid
  `child-publication` envelopes with the correct owner invariants;
  fixture permission requests surface in permission region payloads;
  transcript publishes a ready tail-page snapshot; write-capable
  registry actions land on the mock-action log unexecuted; ACK and
  `load-transcript-page` round-trips work.
- Add boundary guardrails: `harness-host.js` no longer references
  `child-snapshot`; `scripts/ui-harness-serve.ts` routes assistant
  traffic through the publication session module.
- Keep `test/core/184`, `test/core/190`, `test/core/193` green and
  ensure `npx tsc --noEmit` is clean. `tsx
  scripts/ui-harness-serve.ts --check` must report all components
  ready.

### Risks and Mitigations

- **Adapter divergence.** If the harness adapter drifts from the
  production adapter contract, child pages could misinterpret owner
  selection or transcript pages. Mitigate by reusing the production
  `AssistantWorkspacePublicationRuntime` directly, so the contract is
  enforced by the production code path.
- **Wire-constant drift.** Removing `CHILD_SNAPSHOT` could break
  downstream tests that snapshot the wire shape. Mitigate by updating
  `test/core/190` parity assertions in the same change.
- **Bundle-coverage regression.** If the in-memory build regresses,
  the harness would need a plugin build again. Mitigate by reusing
  the existing harness bundle builder's pattern and asserting bundle
  availability in the harness startup probe.
- **Stale docs.** Mitigate by rewriting the component doc in step 7.