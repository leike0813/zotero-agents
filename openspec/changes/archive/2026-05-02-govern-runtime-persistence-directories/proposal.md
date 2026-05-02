# Govern runtime persistence directories

## Summary
Centralize runtime data that can grow over time under one cross-platform runtime persistence root. Plugin settings and user-owned assets remain in their existing locations; only runtime records, logs, workspaces, caches, temporary files, and legacy runtime leftovers are governed and cleanable.

Default runtime root:

- Windows: `%LOCALAPPDATA%\Zotero-Skills\runtime`
- macOS: `~/Library/Application Support/Zotero-Skills/runtime`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/Zotero-Skills/runtime`
- Test/no-system fallback: `<cwd>/.zotero-skills-runtime`

## Motivation
Runtime data is currently spread across Zotero data subdirectories, preferences JSON, and `.zotero-skills-runtime` fallback folders. This makes growth hard to monitor and cleanup risky. A single runtime root with registered categories makes ownership clear and lets the preferences UI provide safe cleanup without touching settings or user skills/workflows.

## Scope
- Add a runtime persistence resolver and category registry.
- Move the plugin SQLite state DB to `state/zotero-skills.db`.
- Move runtime logs out of prefs into the runtime root.
- Move ACP chat and ACP SkillRunner-compatible workspaces into managed runtime subdirectories.
- Add preferences UI usage scanning and categorized cleanup.
- Keep settings and user assets out of the managed cleanup surface.

## Non-goals
- Do not move backend/workflow settings.
- Do not clean user `skills/`, `skills_builtin/`, `workflows/`, or `workflows_builtin/`.
- Do not migrate or uninstall SkillRunner binary/runtime installations in this change.
- Do not auto-delete legacy runtime directories during startup.
