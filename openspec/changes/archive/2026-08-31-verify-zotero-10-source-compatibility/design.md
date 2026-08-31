## Context

See `proposal.md` for motivation. The existing compatibility fixture already fixes representative hosts at Zotero 7.0.32, 9.0.6, and 10.0.1, and Linux 10.0.1 real-host evidence is passing. The remaining gap is a repeatable source baseline and synchronized engineering documentation, not a missing runtime adapter.

The reference repositories are large and contain their own nested submodules. They must be available for deliberate source review without becoming input to normal project search, indexing, lint, build, or CI checkout.

## Goals / Non-Goals

**Goals:**

- Pin exact stable Zotero source revisions for the three supported major-version baselines.
- Keep normal repository operations bounded to project-owned source.
- Record why the current plugin implementation needs no Zotero 10-specific production branch.
- Align compatibility documentation with the evidence already represented by the matrix.

**Non-Goals:**

- Changing plugin APIs, DTOs, schemas, runtime behavior, or dependencies.
- Initializing or auditing every nested Zotero repository.
- Claiming that representative-version checks cover every historical patch or that non-blocking macOS XPI evidence is a behavioral gate.

## Decisions

### Pin three shallow main-repository gitlinks

The source baselines are:

| Worktree | Stable tag | Commit |
| --- | --- | --- |
| `reference/Zotero-7` | `7.0.32` | `188c54c186fbbaa6889145986d43ba64160a44fa` |
| `reference/Zotero-9` | `9.0.6` | `7132587c2d6d56725debe64908733a8140bc6be3` |
| `reference/Zotero-10` | `10.0.1` | `36749bd0bd4fdac9ee46c16f7aa7bed094a0851f` |

Gitlinks provide the version identity already understood by Git and avoid a second manifest. `shallow = true` bounds checkout cost. A maintenance branch, vendored copy, or generated source inventory would either drift or duplicate the commit identity, so those alternatives are rejected.

### Reuse the repository ignore chain

The three exact worktree paths are added to `.gitignore`. Existing tools already honor this boundary, while explicit `git -C` and ignore-override searches still allow investigation. A second `.rgignore`, CodeGraph-only rule, or source-copy script would duplicate policy. CI submodule commands name `skills_builtin` so source references are not fetched as content dependencies.

### Zotero 10 source audit does not require production changes

The audit compares project call sites with the pinned Zotero 10.0.1 main repository:

| Audit area | Zotero 10 source change | Project behavior and conclusion |
| --- | --- | --- |
| Collection tree multi-selection | `collectionTree.jsx` removes singular getters and provides plural library/collection/search getters. | `acpContextBuilder.ts` calls `getSelectedLibraryIDs()` first and derives IDs from selected rows; the singular getter is only a guarded legacy fallback when the plural API is absent. No Zotero 10 branch is needed. |
| ItemTree row structure | `itemTreeRow.js` introduces typed object and non-object rows, including library headers. | Project code does not construct, count, or cast internal `ItemTreeRow` instances. Custom columns use `Zotero.ItemTreeManager.registerColumn()` and item DTOs, so header-row internals do not leak into plugin behavior. |
| Search and full text | Zotero 10 separates the FTS5 index into `fulltext.sqlite` and changes advanced-search internals. | Project runtime has no direct `Zotero.Search` or `Zotero.Fulltext` call and does not query full-text tables. Identifier lookup uses `Zotero.Translate.Search`; bounded library listing uses stable `Zotero.DB.queryAsync()` tables. No storage-format adapter is required. |
| Local API | Zotero 10 tightens its Local API authorization and request handling. | Host Bridge and MCP own loopback servers and do not register or call `Zotero.Server.LocalAPI`; their validation remains independent of Zotero's Local API implementation. |
| Item types and attachment paths | Zotero 10 retains `ItemTypes.getID()` and makes attachment path validity explicit through `getFilePathAsync()` returning false for invalid paths. | Broker and workflow adapters validate item types through `ItemTypes.getID()`, treat unavailable paths as errors, and validate/stage stored inputs before attachment creation. No raw database path is trusted. |
| WAL and database access | Zotero 10 enables WAL for the main database and moves the rebuildable full-text index out of it. | Production reads use Zotero's asynchronous DB API. The read-only harness uses SQLite backup snapshots, which include committed WAL state, and plugin-owned guarded SQLite connections checkpoint on final release. The plugin never copies a live Zotero database file directly. |
| Firefox 140 | Zotero 10 declares Gecko 140.x. | Project bundles target Firefox 115, a conservative syntax floor shared with Zotero 7 and accepted by newer Gecko. Existing 7/9/10 real-host tests provide the execution evidence; raising the target would only reduce backward compatibility. |

The rejected alternative is adding major-version detection or compatibility wrappers without an observed API gap. Capability-shape checks and existing plural APIs already cover the only relevant boundary.

### Keep one compatibility-version source of truth

`test/zotero/compatibility-matrix.json` remains the executable version and platform SSOT. The gitlinks are audit inputs, not another runtime matrix. Documentation names the same representative versions and accurately distinguishes blocking Windows/Linux evidence from non-blocking macOS Zotero 10 XPI smoke evidence.

## Risks / Trade-offs

- [A source tree is unavailable after a normal clone] → Document explicit per-path submodule initialization; source review is intentionally opt-in.
- [A future Zotero release changes an internal API currently reached by capability shape] → Advance the stable-tag gitlink and rerun the existing compatibility fixture before changing production code.
- [Localized version statements drift] → Generate embedded help from Docusaurus sources and review all localized README/source pairs in the same baseline update.

## Migration Plan

1. Add the pinned gitlinks and exact ignore entries, leaving nested submodules uninitialized.
2. Narrow CI initialization to `skills_builtin`.
3. Update project and localized documentation, then regenerate embedded help.
4. Validate OpenSpec, repository checks, and the existing compatibility fixture against the fixed hosts.

Rollback removes the three gitlinks and their `.gitmodules`/ignore entries and restores the previous documentation; no runtime or persisted user data is migrated.
