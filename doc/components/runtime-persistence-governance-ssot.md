# Runtime Persistence Governance SSOT

Runtime persistence is plugin-managed data that can grow during normal use and can be safely monitored or cleaned by category. It is not plugin settings and it is not user-authored workflow or skill content.

## Root
The runtime persistence root is resolved by the runtime persistence module:

- Windows: `%LOCALAPPDATA%\Zotero-Skills\runtime`
- macOS: `~/Library/Application Support/Zotero-Skills/runtime`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/Zotero-Skills/runtime`
- Fallback: `<cwd>/.zotero-skills-runtime`

## Managed Categories
- `state/`: plugin runtime SQLite state, including SkillRunner ledger and ACP conversation rows.
- `logs/`: runtime log persistence.
- `acp/chat/`: ACP chat workspaces and runtime directories.
- `acp/skill-runs/`: ACP SkillRunner-compatible run workspaces.
- `cache/`: runtime caches.
- `tmp/`: temporary runtime files.
- `legacy/`: discovered old runtime locations surfaced for manual cleanup.

## Exclusions
The managed runtime cleanup surface must not include:

- backend/workflow settings and other plugin preferences;
- user `skills/` and `skills_builtin/`;
- user `workflows/` and `workflows_builtin/`;
- SkillRunner binary installation/runtime releases.

## Migration Rules
Migration is conservative. Existing runtime state may be copied into the new root, but legacy files are not deleted automatically. Legacy runtime directories are shown as cleanable only after the user explicitly chooses that cleanup category.

## Development Rule
Any new persistent runtime content that can grow over time must register a semantic path/category through the runtime persistence module and appear in preferences usage monitoring.
