## Design

### Tag import wizard

The Workbench keeps a small tag import UI state containing draft text, preview result, and last diagnostics. Preview remains non-mutating. Apply requires an explicit action and calls the existing canonical import transaction path, so autosync behavior stays consistent with other canonical writes.

### Topic Graph relation review queue

Low-confidence relation proposals are stored as canonical review items under `synthesis/topic-graph/review/`. They do not create suggested edges until a user approves them. Review actions are intentionally narrow:

- `approve_suggested`: convert the review item into a suggested canonical edge.
- `reject`: mark the review item rejected without creating an edge.

The existing suggested edge accept/reject flow remains unchanged.

### Concept review candidate selection

The service already requires `targetConceptId` for `merge_into_existing`. The Workbench must reflect that contract instead of picking the first candidate. UI state stores the selected review target concept id by review id.

### Read-only Literature/MCP registry access

Read-only registry access should not trigger a synchronous canonical rebuild. When projections are missing or stale, the service returns bounded fallback rows and diagnostics, and queues the background literature rebuild best-effort.

### Git Sync credential URL gate

Prefs-configured Git Sync rejects remote URLs containing credentials before adapter creation or worktree configuration. Tokens continue to be supplied only through encrypted prefs and transient Git command auth headers.
