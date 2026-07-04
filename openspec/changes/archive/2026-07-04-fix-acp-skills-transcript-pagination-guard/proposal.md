## Why

ACP Skills runs now persist transcript history in `transcript.jsonl`, but the selected run panel snapshot still sends the full selected transcript to the Assistant Workspace child frame. At the same time, the host subscribes to every ACP Skills run change without request-scoped filtering, so unrelated background streaming can repeatedly rebuild and send an oversized selected-run snapshot.

This change keeps transcript browsing complete for users while making the host-to-child payload and DOM work bounded.

## What Changes

- ACP Skills panel snapshots stop embedding full `selectedRun.transcriptItems`.
- The selected transcript is exposed as bounded pages with cursor metadata.
- The ACP Skills child panel loads older/newer transcript pages on scroll and keeps only a bounded local cache.
- The ACP Skills child panel virtualizes transcript rendering so only the visible window plus buffer reaches the shared transcript renderer.
- ACP Skills snapshot listeners receive conservative change descriptors so Assistant Workspace can skip clearly unrelated run-scoped changes.
- Assistant Workspace adds a signature guard to avoid sending unchanged ACP Skills snapshots.
- No workflow apply, recovery, controller, ACP Chat, Dashboard, or Synthesis contracts change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-skill-run-file-backed-runtime-state`: selected ACP Skills panel snapshots expose transcript pages instead of full transcript arrays.
- `assistant-workspace-ui-refresh-governance`: ACP Skills refreshes are request-scoped and unchanged snapshots are skipped.

## Impact

- Affected modules: `src/modules/acpSkillRunStore.ts`, `src/modules/assistantWorkspaceSidebar.ts`, `addon/content/sidebar/acp-skill-run.js`, `addon/content/shared/assistant/assistant-panel-model.js`.
- Affected tests: ACP runtime memory governance and ACP UI smoke tests.
- No dependency changes.
