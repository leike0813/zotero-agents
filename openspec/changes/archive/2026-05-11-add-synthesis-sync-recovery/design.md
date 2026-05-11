# Design: Synthesis Sync Recovery

## Recovery Principles

Canonical assets remain the source of truth. Zotero anchor/note shards are a
sync mirror and disaster recovery input only.

The recovery model therefore follows these rules:

- If canonical assets exist, the plugin may rebuild Zotero mirror shards from
  canonical assets.
- If canonical assets are missing and valid note shards exist, the plugin may
  offer recovery from shards, but the action requires explicit user
  confirmation.
- If canonical assets and mirror hashes diverge, the plugin preserves a local
  conflict copy and does not auto-overwrite either side.
- Local materialized indexes are disposable and may be rebuilt automatically.
- Agent update workflows are never started by sync recovery decisions.

## Assessment Model

The assessment receives:

- root binding state;
- canonical manifest hash and asset hashes;
- mirror manifest and decoded shard summaries;
- local index health;
- local conflict candidates;
- startup hash-check preferences.

It returns:

- status: `ready`, `missing_root`, `mirror_missing`, `mirror_degraded`,
  `divergent`, `index_dirty`, or `check_skipped`;
- allowed actions;
- diagnostics;
- whether explicit user confirmation is required.

## Mirror Validation

Mirror validation compares manifest shard entries with decoded shard summaries:

- note key and title must match;
- payload and encoded hashes must match;
- sequence count must be complete per kind;
- all shards must belong to the same mirror id and library id.

Any mismatch marks the mirror degraded. Degraded mirrors can be rebuilt from
canonical assets when canonical assets are available.

## Conflict Candidates

Conflict candidates are local-only. They are sorted newest first, can be
cleared locally, and can provide a retry/update entry point. They must not enter
canonical sync assets or Zotero note shards.

## UI Integration

The Synthesis UI snapshot exposes sync diagnostics and conflict summaries. The
web panel still sends host actions for actual recovery or cleanup operations.
