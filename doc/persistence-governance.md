# Persistence Governance

This plugin uses a Zotero `DataDirectory` scoped persistence root for production
writes:

```text
<Zotero.DataDirectory.dir>/zotero-agents/
```

The directory is intentionally named `zotero-agents` so the storage contract does
not need another rename during the next product naming pass.

## Storage Classes

- `state/zotero-agents.db` stores indexed workflow/plugin operational state:
  task requests, task rows, ACP conversation indexes, workflow product metadata,
  queue state, and job state.
- `state/synthesis.db` stores SQLite-first Synthesis runtime state.
- `data/synthesis/` stores durable Synthesis canonical/checkpoint assets for
  explicit import, export, audit, and future sync. It is user data, not runtime
  cache, and it is not the normal Synthesis UI hot-path source.
- `runtime/` stores cleanable execution data: logs, cache, temporary files, ACP
  skill-run workspaces, and cached workflow product assets.
- Prefs store configuration, feature flags, small switches, encrypted token
  envelopes, and migration markers only.

## Cleanup Rules

Runtime cleanup is report-first for structural integrity issues. Scans may
identify missing indexed files, orphan runtime assets, expired runtime assets,
legacy roots, and misplaced durable assets. Structural cleanup is explicit and
dry-run by default. Low-risk retention cleanup may automatically delete expired
files from `runtime/tmp`, `runtime/cache`, and `runtime/logs`.

Default TTL rules:

- `runtime/tmp`: eligible after 24 hours.
- `runtime/cache`: eligible after 30 days.
- completed/cancelled/failed skill-run workspaces: eligible after 30 days.
- orphan workflow product cached assets: eligible after 7 days.
- `runtime/logs`: eligible after 30 days or by size policy.
- `data/synthesis`, `state/zotero-agents.db`, and `state/synthesis.db`: no TTL cleanup.

## Managed Path Contract

The plugin distinguishes three path classes:

- **Managed relative path**: a plugin-generated path below a managed root. These
  paths are strongly validated before writes.
- **Managed absolute path**: a managed root plus a managed relative path. A long
  absolute path is reported as a warning, but is not rejected solely because the
  user chose a deep Zotero DataDirectory.
- **External user path**: a user-selected import/export path. These paths are
  not rewritten by the managed path policy.

Managed relative paths use normalized `/` separators and must be relative,
non-empty, traversal-free, and made from safe path segments. Segments must not
use reserved device names such as `CON` or `LPT1`, must not end with a dot or
space, and must stay within the plugin's segment and relative-path budgets.
Case collisions such as `Alias.json` and `alias.json` in the same directory are
rejected because they are unsafe across filesystems.

Synthesis canonical assets add a KG scope allowlist on top of this policy:
`topics`, `concepts`, `topic-graph`, `citation-graph`, `tags`, and `sync`.
High-entropy or long semantic identifiers, such as raw references and generated
work ids, must be stored inside canonical JSON data and represented by short
stable hash filenames on disk.

Path policy diagnostics use structured codes including
`managed_path_invalid`, `managed_path_reserved_name`,
`managed_path_segment_too_long`, `managed_relative_path_too_long`,
`managed_path_case_collision`, and `managed_absolute_path_long`. Integrity scans
report these issues first; cleanup does not delete durable canonical data.

## Migration

Runtime startup does not automatically migrate legacy roots. Use the one-shot
script when migration is desired:

```shell
node scripts/migrate-persistence-governance.mjs --data-directory <zotero-data-dir>
node scripts/migrate-persistence-governance.mjs --data-directory <zotero-data-dir> --mode apply
node scripts/migrate-persistence-governance.mjs --data-directory <zotero-data-dir> --mode verify-only
```

The script copies before verifying, does not delete legacy data, and refuses to
overwrite existing target canonical stores unless `--force` is supplied.

## Deprecated Zotero Note Mirror

Zotero note mirror is no longer a normal persistence or recovery path. The
plugin runtime does not create anchor notes or mirror shards. Legacy mirror
payloads may be read only by the one-shot migration script as legacy input.
