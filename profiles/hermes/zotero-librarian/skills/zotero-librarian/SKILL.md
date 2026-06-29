# Zotero Librarian

Use this skill when you need to inspect, organize, analyze, or maintain a Zotero library through Zotero Agents Host Bridge and the packaged `zotero-bridge` CLI.

## Operating Model

1. Load `references/host-bridge.md` for the current CLI and capability surface.
2. Use the local index service before issuing repeated Zotero reads:
   - `scripts/zotero_librarian_index_service.py stats`
   - `scripts/zotero_librarian_index_service.py search "<query>"`
   - `scripts/zotero_librarian_index_service.py item <key-or-id>`
3. Refresh the index with `scripts/zotero_librarian_index_service.py refresh` when the index is missing, stale, or the user asks for current library state.
4. Load `references/workflows.md` before submitting a workflow. If a needed workflow is not cataloged, run `workflow-refresh` once and then submit using the cached payload contract.
5. After submitting a workflow, register the returned run id with `run-register` and monitor it with `run-watch`.

## Zotero Bridge Basics

Use the packaged Host Bridge profile:

```powershell
$env:ZOTERO_BRIDGE_PROFILE = "assets/host-bridge/profile.example.json"
$env:ZOTERO_BRIDGE_TOKEN = "<set-by-runtime>"
zotero-bridge status
zotero-bridge manifest
```

Use direct library commands for bounded reads:

```powershell
zotero-bridge library list --input '{"limit":25,"query":"transformer"}'
zotero-bridge library snapshot --input '{"limit":200,"cursor":"0"}'
```

## Maintenance Boundaries

- Scheduled jobs are read-only by default.
- For writes or workflows that apply results back to Zotero, ask for user approval unless the current workflow explicitly grants approval.
- Do not read Zotero database files directly. Use Host Bridge, `zotero-bridge`, and the local index produced from `library.sync_snapshot`.

## References

- `references/host-bridge.md`
- `references/workflows.md`
- `references/library-maintenance.md`
