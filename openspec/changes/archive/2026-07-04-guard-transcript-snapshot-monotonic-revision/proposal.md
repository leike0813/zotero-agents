## Why

Assistant Workspace child panels currently skip transcript rendering only when
the incoming revision equals the last rendered revision. If host-to-child
snapshot delivery is reordered, an older same-context transcript revision can
arrive after a newer one and repaint the transcript with stale content.

This change makes transcript rendering monotonic per conversation or run
context while preserving explicit context switches and ACP Skills paged
history browsing.

## What Changes

- ACP Chat ignores stale same-conversation transcript snapshots whose revision
  is lower than the last rendered revision.
- ACP Skills ignores stale same-run transcript pages before merging them into
  the child page cache, while still accepting equal-revision pages with
  different cursors.
- SkillRunner run dialog applies the same run-scoped stale revision guard as
  Assistant Workspace child panels.
- Context changes reset the guard and transcript render state so a new
  conversation or run can render from its own revision sequence.
- No host ordering contract, ACP Skills run-history index, shared transcript
  renderer API, or business state machine changes are included.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-ui-refresh-governance`: child transcript renderers ignore
  stale same-context transcript snapshots.

## Impact

- Affected UI scripts: `addon/content/sidebar/acp-chat.js`,
  `addon/content/sidebar/acp-skill-run.js`, and
  `addon/content/sidebar/run-dialog.js`.
- Affected tests: `test/core/97-acp-ui-smoke.test.ts`.
- No dependency, persistence, or backend protocol changes.
