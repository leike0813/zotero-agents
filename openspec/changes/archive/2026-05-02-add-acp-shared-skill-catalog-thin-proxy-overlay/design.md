# Design

## Architecture

ACP skills use two layers:

- Shared catalog: a read-only snapshot of effective plugin-side skills under runtime cache. It contains the complete original skill packages and resource manifests.
- Run overlay: per-run agent skill roots containing thin proxy directories for all effective skills.

The run overlay is disposable. The catalog is reused across runs when the effective skill checksum set is unchanged.

## Catalog Entries

Each catalog entry records:

- `skillId`
- `sourceKind`
- `checksum`
- `catalogSkillRoot`
- `resourceManifest`
- diagnostics

The resource manifest includes `skillRoot`, `skillMdPath`, `assetsDir`, `scriptsDir`, `referencesDir`, `runnerJsonPath`, and a file list with relative and absolute paths.

## Thin Proxy

Each proxy skill directory contains:

- `SKILL.md`
- `zotero-skill-proxy.json`

The proxy `SKILL.md` keeps the original skill frontmatter first, then injects an ACP run contract block, then the rewritten original body. The contract block declares the run workspace, input manifest, result JSON path, shared catalog root, and resource roots.

## Rewrite Rules

The rewriter mechanically rewrites:

- `scripts/foo.py`
- `assets/foo.json`
- `references/foo.md`
- `<skillId>/scripts/foo.py`
- `<skillId>/assets/foo.json`
- `<skillId>/references/foo.md`
- `{{ skill_dir }}`

Unresolved probable resource references are recorded as warnings. Skills with high-risk dynamic resource behavior may later opt into full snapshots.

## Runtime Behavior

`materializeAcpSkill()` now materializes all effective skills as proxies. It still returns the requested skill runner JSON, but reads it from the catalog skill package. Output schema validation uses the requested catalog skill root.

Run store snapshots expose catalog/proxy diagnostics for UI and debugging.
