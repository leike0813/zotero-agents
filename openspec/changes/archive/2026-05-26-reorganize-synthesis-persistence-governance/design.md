## Design

### Persistence Roots

Production persistence is scoped to the Zotero data directory:

```text
<Zotero.DataDirectory.dir>/zotero-agents/
  state/zotero-agents.db
  data/synthesis/
  runtime/logs/
  runtime/cache/
  runtime/tmp/
  runtime/acp/skill-runs/
  runtime/workflow-products/assets/
```

Environment overrides remain available for tests and special runs. If Zotero
`DataDirectory` is unavailable, the resolver can fall back to the existing
platform app-data behavior, but new production writes in Zotero use
`DataDirectory`.

### Ownership Contract

- Prefs store configuration, flags, encrypted token envelopes, and migration
  markers only.
- `zotero-agents.db` stores indexed operational state: task rows, request rows,
  conversation indexes, queue/job state, and workflow product metadata.
- Files store large or durable payloads: canonical assets, skill workspaces,
  cached workflow products, logs, and temporary files.
- `data/synthesis/` is durable and never cleanable by runtime cleanup.
- `runtime/*` can be reported as cleanable according to category policy.

### Synthesis and Mirror Removal

The Synthesis service uses the durable data root by default. Existing canonical
transaction helpers keep their relative layout, but callers pass the new durable
root. Git Sync exports from the durable canonical source and keeps its worktree
in runtime.

Zotero note mirror is removed from the normal plugin runtime path: no default
mirror adapter injection, no mirror refresh on apply/delete/purge, and no mirror
status in Workbench as a primary recovery signal. The one-shot migration script
may read legacy mirror content as an import source.

### Integrity and Cleanup

The integrity scanner reports SQLite/file mismatches and TTL eligibility without
deleting by default. Cleanup is explicit, dry-run by default, and limited to
runtime/cache/tmp/orphan workflow product assets. Durable canonical data and
the SQLite database are never TTL-cleaned.

### One-Shot Migration Script

The migration script is explicit and non-automatic. It accepts source/target
roots or a Zotero data directory, supports `dry-run`, `apply`, and
`verify-only`, copies before verifying, refuses to overwrite existing target
canonical stores unless forced, and writes a migration report.
