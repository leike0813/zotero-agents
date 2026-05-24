# Deprecated Assistant Sidebar Entrypoints

This directory archives the former standalone sidebar host modules:

- `acpSidebar.ts`
- `acpSkillRunnerSidebar.ts`
- `skillRunnerSidebar.ts`

They are retained only for historical reference. Active code must use
`src/modules/assistantWorkspaceSidebar.ts`, which hosts ACP Chat, ACP Skills,
and SkillRunner through the unified Assistant Workspace.

Do not import files from this directory. It is outside `src/` and is not part of
the plugin build.
