## Baseline and governance

Baseline commit: `3ccbbdc54051ec608631a7a73f4b31ca1e3d2194`. Explicit deletion inventory is empty. The three Librarian semantic sources must not lose substantive instruction lines or normalized prose characters below the governed threshold; semantic review must report zero unmapped, downgraded, unauthorized-dropped, and intra-package duplicate instructions.

## Resolver contract

`zotero_librarian_workspace.py` owns profile selection, base-directory resolution, canonical path identity, workspace routing, database containment checks, and structured error values. The base directory is `ZOTERO_LIBRARIAN_STATE_DIR`, then `$HERMES_HOME/zotero-librarian`, then `~/.hermes/zotero-librarian`. The well-known selection maps to the existing default database. Explicit identities hash the canonical profile path only. Explicit profile files must exist; no profile content is read.

The resolver returns a small immutable result containing the selected profile (or default marker), workspace root, database path, and optional bridge argv. Containment uses resolved paths and refuses symlink/path escapes. Its shared preparation step creates only the already-validated selected workspace and converts filesystem failures into structured errors.

## Runtime and installer

The service parses `--profile`, resolves one workspace before dispatch, validates `--db`, and injects `--profile <canonical path>` into every bridge call. It prefers `<workspace>/.zotero-bridge/bin/<executable>` before PATH. Existing receipts, operation names, and `state.v3` tables remain unchanged. The installer imports the same resolver, defaults to the selected workspace binary directory, and gates well-known-link updates on the default selection.

## Migration and failure handling

No copy or automatic migration is performed. The old default database is the well-known profile's state. Explicit profiles start empty. Missing profile files, normalization failures, unavailable roots, and database escapes produce structured failures before database creation. Secrets are never read or included in identity or output.

## Generation and data flow

Source config and prose are rendered to `profiles/` by `render-host-bridge-surfaces.ts`. The renderer adds `workspaces/` to generated ignore rules and emits profile/default workspace metadata. Cron commands continue to invoke the service without workspace paths; environment/profile selection flows through the shared resolver.
