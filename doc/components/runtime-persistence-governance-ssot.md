# Runtime Persistence Governance SSOT

Runtime persistence is plugin-managed data that can grow during normal use and can be safely monitored or cleaned by category. It is not plugin settings and it is not user-authored workflow or skill content.

## Root
The runtime persistence root is resolved by the runtime persistence module:

- Windows: `%LOCALAPPDATA%\zotero-agents`
- macOS: `~/Library/Application Support/zotero-agents`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/zotero-agents`
- Final fallback: `<cwd>/.zotero-agents`

Runtime-scoped data lives under `runtime/` below this root: `{root}/runtime/logs`, `{root}/runtime/cache`, etc.

## Managed Categories
- `state/`: plugin runtime SQLite state, including SkillRunner ledger and ACP conversation rows.
- `runtime/logs/`: runtime log persistence.
- `runtime/acp/chat/workspace/`: the shared ACP Chat agent working directory (`agentWorkspaceDir`/`sessionCwd`) used by all ACP Chat conversations.
- `runtime/acp/chat/conversations/`: plugin-private ACP Chat per-conversation storage; this is not the user-facing workspace and must not live inside `runtime/acp/chat/workspace/`.
- `runtime/acp/chat/runtime/`: plugin-private ACP Chat backend runtime state.
- `runtime/acp/skill-runs/`: ACP SkillRunner-compatible run workspaces.
- `runtime/cache/`: runtime caches.
- `runtime/tmp/`: temporary runtime files.
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

`workspace` is reserved for directories where an agent process actually runs. Plugin-private persistence directories such as ACP Chat `conversations/` and `runtime/` must not be described as workspaces in user-facing UI.
