## Context

`workflowProductStore` already persists Dashboard Products in plugin SQLite and
managed assets under `runtime/workflow-products/assets/<productId>`. The
Dashboard alone can currently call the store. Host Bridge exposes generic
capabilities through `POST /bridge/v1/call` and remote bytes through opaque
registered-file handles, while the Rust CLI already has verified download and
atomic-write primitives.

## Goals / Non-Goals

**Goals:**

- Make normal Dashboard Products discoverable, inspectable, downloadable, and
  removable through Host Bridge and the CLI.
- Preserve remote safety: no internal paths or unverified arbitrary downloads.
- Preserve the current product file lifecycle and separate Dashboard Products
  from Synthesis `paper_artifacts` and skill feedback.

**Non-Goals:**

- Changing workflow-product SQLite schema, persistence scanner retention, or the
  Dashboard UI.
- Exposing `skill_run_feedback`, adding a products REST route, or allowing
  physical managed-asset deletion.

## Decisions

1. **Use capability dispatch and file handles.** Register
   `workflow_products.*` in the existing registry and call route; reuse
   `/bridge/v1/files/{fileId}`. A dedicated products endpoint would duplicate
   authentication, approval, and remote download behavior.
2. **Separate single-asset reads from bulk export.** `read_asset` always returns
   one opaque descriptor. `export` handles the optional all-assets selection,
   direct local materialization, and remote ZIP packaging. This keeps the
   read API predictable while matching existing local/remote export semantics.
3. **Make metadata public but path-safe.** A public mapper produces the only
   capability DTO. A shared store resolver verifies product ownership, managed
   storage containment, and file existence before any file handle, copy, or ZIP
   work occurs.
4. **Treat removal as a Host Bridge write.** `workflow_products.remove` follows
   Zotero approval and gets a dedicated user-facing prompt. It removes only the
   record because current storage intentionally leaves an orphan for the
   persistence scanner and TTL cleanup.
5. **Keep CLI output and remote delivery deterministic.** List pages are bounded
   to 100 by default and 200 maximum. Local export writes validated relative
   paths under `--output`; remote export returns a ZIP descriptor with the
   standard verified-file download command and unpack guidance. Existing output
   files require `--force`.
6. **Mirror only side-effect-free reads into MCP.** List, get, and read-asset
   receive normal MCP visibility. Export can materialize host files and removal
   mutates storage, so both stay on the Host Bridge/CLI surface.

## Risks / Trade-offs

- **Record removal leaves managed files temporarily.** → Preserve current
  scanner ownership model and state this in approval and command guidance.
- **Remote export adds ZIP overhead.** → Use it only for remote delivery;
  local callers retain direct copies.
- **Persisted asset metadata could be stale or malicious.** → Resolve every
  asset through one containment and existence check before serving it.
- **Capability additions can drift from agent guidance.** → Update the surface
  catalog first, run semantic review, then render and validate generated
  outputs.

## Migration Plan

1. Add the new read, export, and removal capability contracts without changing
   existing stored records.
2. Add the CLI command group and generated surface mappings.
3. Render and validate Host Bridge surfaces, then ship with the normal plugin
   and CLI release process. Rollback consists of removing the new capability and
   command surfaces; stored products remain unchanged.

## Open Questions

None.
