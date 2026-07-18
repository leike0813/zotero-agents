# Maintenance And Recovery

Maintenance actions repair derived or diagnostic state; they are not ordinary task commands.

## Choose the correct scope

- `synthesis cache status` reads cache basis and stale scopes. `cache invalidate` invalidates only a supported reviewed scope and requires Zotero UI approval.
- `synthesis index status` diagnoses derived index state. Refresh the resident SQLite index through its service; do not confuse it with Synthesis indexes.
- `synthesis graph refresh-metrics` repairs persisted complex graph metrics. It is not cache invalidation and should follow graph-specific diagnostics.
- Debug reset, reapply, or repair commands require explicit diagnostic intent and the exact command card. Never use them as a shortcut around a failed semantic command.

## Recovery rules

Preserve the pre-action status, approval outcome, affected scope, structured error, and post-action status. If `stateChanged` is true, query the corresponding status before repeating. If `handleConsumed` is true, do not reuse the handle. If a resident refresh fails, keep the previous cache/index/catalog state instead of replacing it with an incomplete result.

Scheduled work stops at a reviewable proposal for every maintenance write. A normal empty result is not evidence that maintenance is required.
