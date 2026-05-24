# Change: Deprecate Legacy Assistant Sidebar Entrypoints

## Why

The unified Assistant Workspace is now the stable host for ACP Chat, ACP Skills,
and SkillRunner. The older standalone sidebar host modules remain in `src/`,
which creates two risks:

- accidental imports can bypass the unified workspace and navigate directly to
  a legacy single-panel sidebar;
- tests can keep treating deprecated host modules as active runtime contracts.

## What Changes

- Move the legacy standalone sidebar host modules to
  `deprecated/assistant-sidebar-entrypoints/`.
- Keep `src/modules/assistantWorkspaceSidebar.ts` as the only active sidebar
  host.
- Keep compatibility action names in `hooks.ts`, but route all of them through
  `openAssistantWorkspaceSidebar({ tab })`.
- Keep the current Assistant Workspace child pages:
  `acp-chat.html`, `acp-skill-run.html`, and `run-dialog.html`.
- Update tests to assert active routing through the unified workspace and to
  avoid reading deprecated host modules as runtime source.

## Non-Goals

- No UI redesign.
- No iframe child page consolidation.
- No change to ACP/SkillRunner protocol, run state, or transcript rendering.
