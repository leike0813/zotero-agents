# Design

## Runtime Root
Introduce a single runtime persistence module that resolves the root once and exposes named subpaths:

- `state/` for plugin runtime state DB.
- `logs/` for runtime log persistence.
- `acp/chat/workspaces/` and `acp/chat/runtime/` for ACP chat.
- `acp/skill-runs/` for ACP SkillRunner-compatible runs.
- `cache/`, `tmp/`, and `legacy/` for future governed runtime content.

The resolver prefers OS-local application data locations and falls back to `.zotero-skills-runtime` only when no platform app-data path is available.

## Migration
The SQLite DB is safely migrated by copy-on-first-use: if the new DB is absent and the old DB exists at `<Zotero.DataDirectory>/zotero-skills/state/zotero-skills.db`, copy it to the new `state/` path and keep the old file untouched.

Runtime logs import the legacy `runtimeLogsJson` pref once into the file-backed log document and stop rewriting the growing pref. Existing legacy prefs for SkillRunner ledger/history still migrate through `pluginStateStore`.

Legacy runtime folders are not moved or deleted automatically. They are surfaced as a cleanup category so the user can remove them explicitly.

## Cleanup Categories
Cleanup is category-specific:

- `logs`: clear runtime logs and log file.
- `skillrunner-ledger`: delete SkillRunner runtime rows from the state DB.
- `acp-conversations`: delete ACP runtime rows and chat workspace/runtime folders.
- `acp-skill-runs`: delete ACP SkillRunner-compatible run workspaces.
- `cache`: delete cache/temp folders.
- `legacy`: delete discovered legacy runtime folders only.

User assets and plugin settings are never included in cleanup categories.

## Preferences UI
The preferences page adds a Runtime Data card showing root path, total size, per-category size, and last scan time. It supports rescan, copy/open root, and per-category cleanup with confirmation.

## Compatibility
Existing runtime APIs remain stable. Modules that need persistent runtime paths must call the new resolver instead of constructing paths directly.
