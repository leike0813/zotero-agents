# Design: Deprecate Legacy Assistant Sidebar Entrypoints

## Active Sidebar Boundary

`src/modules/assistantWorkspaceSidebar.ts` is the sole active Zotero side-pane
host for Assistant functionality. It owns pane mounting, sidebar frame creation,
workspace bridge dispatch, and tab selection for:

- ACP Chat
- ACP Skills
- SkillRunner

The three panel pages remain current implementation details of the unified
workspace and are not deprecated.

## Compatibility Actions

Existing action names are preserved to avoid breaking menu, toolbar, and older
call-site wiring:

- `openSkillRunnerSidebar`
- `toggleSkillRunnerSidebar`
- `openAcpSidebar`
- `openAcpSkillRunnerSidebar`

These actions must dispatch to `openAssistantWorkspaceSidebar` or
`toggleAssistantWorkspaceSidebar` with the corresponding tab. They must not
import or call archived host modules.

## Deprecated Archive

The former standalone host files are moved to
`deprecated/assistant-sidebar-entrypoints/`. This keeps history discoverable
without keeping the code in TypeScript compilation or plugin packaging.

The archive is read-only historical material. Active code and tests must not
import it.

## Verification Strategy

Tests focus on stable routing and packaging boundaries:

- source imports do not reference archived host modules;
- compatibility actions still exist and route to the unified workspace;
- `assistant-workspace.html` still references the three current child pages.
