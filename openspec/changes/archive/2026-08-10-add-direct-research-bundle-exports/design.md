## Context

The current Host already has three relevant but separate mechanisms: `paper_artifacts.export_filtered` exports four analysis artifact types without source or metadata; the Research Bundle workflow materializes metadata and preferred source but is coupled to selection and Product semantics; bridge-download already provides opaque, expiring remote file delivery. Workflow package hooks are isolated bundles and cannot import modules outside their package root, so reuse must cross the existing Workflow Host API rather than a filesystem import.

The semantic baseline is commit `63d57ff2ecf33601248ef7f7085f67d24ee5ae16`. The approved deletion inventory is empty.

## Goals / Non-Goals

**Goals:**

- Give explicit paper and Topic scopes one bounded direct-export path.
- Make paper content discovery and normalization a Host-owned source of truth shared by direct export and the existing workflow.
- Keep local output atomic and remote archive/download memory bounded in Zotero.
- Make the Minimum and Generic surfaces independently executable at their respective mechanism and task-policy layers.

**Non-Goals:**

- Changing Research Bundle selection, ranking, bibliography, Product layout, or registration.
- Generating missing PDFs, digests, scores, references, citation analysis, or Topic reports.
- Registering direct exports as Products or Zotero attachments.
- Adding Hermes automation, release publication, CLI prebuilds, or dependencies.

## Decisions

### Host-owned paper materialization

Add `src/modules/researchBundleService.ts` as the cohesive paper-content module. It resolves canonical paper identity and returns serializable paper material records containing portable metadata, source descriptors, safe Markdown image entries, normalized analysis artifacts, diagnostics, and integrity inputs. It does not register Products, choose workflow roles, write caller directories, or issue Handles.

Expose that module to workflow hooks through a narrow `host.researchBundles.materializePapers()` adapter. The existing workflow retains its selection, ordinal layout, bibliography, Topic, README/index, Product manifest, and registration logic. A presentation discriminator keeps the current workflow artifact representation stable while direct export uses the new canonical filenames.

This is preferred to importing `src` from the workflow package, which the package hook bundler rejects, and to calling the workflow builder from Host Bridge, which would incorrectly impose workflow intent and Product semantics.

### Domain-native capabilities and CLI leaves

Register `items.export_research_bundle` and `topics.export_research_bundle`. Map them to `library items export-research-bundle --items <JSON_OR_FILE>` and `synthesis topic export-research-bundle --topic-id <ID>...`. The paper leaf reuses the existing item-ref union; the Topic leaf uses repeated ids. Both declare a file output boundary and a strict discriminated result in the executable contract.

Connection mode controls delivery. Local mode requires `--output-dir`; remote mode forbids it and returns a Handle. The first version has no force/overwrite option. Invalid selectors fail before staging, while missing content on resolved entities becomes manifest diagnostics.

### Portable layout and report navigation

Use one `research_bundle.direct_export` `1.0.0` manifest with a `kind` discriminator. Paper records live under `papers/<libraryId>/<itemKey>/`. Topic reports live under `topics/<rfc3986-encoded-topic-id>/`, and all report links route to the global paper tree.

Topic membership comes from the existing structured dependency fallback, never report parsing. Report navigation is an export-only transformation: verify `source_papers` order, `ref-n`, and the exact `{libraryId:itemKey}` token, then link that token to the digest. A validation mismatch leaves the report unchanged and produces `sources.md` plus a warning. A missing digest leaves the marker unlinked.

### Atomic local output and disk-backed remote archives

Materialize every request beneath a controlled staging root. Local delivery verifies that the target is absent or empty and commits only after manifest, limits, file inventory, and integrity pass. It never returns an absolute path.

Remote delivery uses the existing Gecko `nsIZipWriter` file-path path to write an atomic temporary ZIP. Change source-file hashing to the existing incremental runtime-file digest path before `addEntryFile()`, avoiding a full-PDF byte allocation. Register the completed ZIP path with the existing file registry; HTTP download remains the existing 32 KiB stream. Production failure to obtain the Gecko archive writer returns `archive_runtime_unavailable`; the in-memory Node fallback remains test-only and cannot satisfy the production capability.

### Bounds and failure codes

Validate 100 paper selectors, 20 Topic ids, 500 resolved papers, 5000 files, 2 GiB materialized bytes, and 2 GiB final remote ZIP. Use existing schema/input/not-found codes where applicable, existing no-overwrite output errors for local collisions, `research_bundle_limit_exceeded` for any declared bound, `archive_runtime_unavailable` for a missing production writer, and a structured materialization failure only when available content cannot be safely represented. Every failure cleans staging and withholds Handle registration.

### Surface ownership

Minimum command cards are generated from the executable contracts and own exact argv, schemas, effects, Handles, and recovery commands. Generic coordinator and research-task model own routing and lifecycle placement; Query owns only identity resolution; Synthesis owns content policy, evidence, and resume semantics. Acquisition and Analysis remain opt-in follow-on stages. Hermes inherits Generic without new source guidance.

Render generated targets only after semantic review reports zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate semantics relative to the fixed baseline. Then refresh the complete Chinese ownership mirror through its prepare/finalize workflow.

## Risks / Trade-offs

- [Large source files can exhaust memory during hashing or ZIP creation] → Hash file sources incrementally and pass paths to Gecko ZIP writer; fail rather than use an unbounded production fallback.
- [Shared materialization refactor can change existing Product bytes] → Preserve a workflow presentation profile and lock observable Product paths/content with existing workflow tests.
- [Historical reports may not match current bibliography syntax] → Require exact structural validation and fall back to an unchanged report plus `sources.md`.
- [A Topic can expand far beyond the explicit selector count] → Preflight canonical membership and enforce resolved-paper, file, and byte limits before delivery.
- [Generated surfaces can accidentally duplicate task policy] → Keep exact mechanics in Minimum, task decisions in Generic, and run the semantic parity and package duplicate gates.

## Migration Plan

1. Add executable behavior and tests without changing published release identity.
2. Refactor the existing workflow to the shared Host materializer and confirm Product parity.
3. Add Generic semantic guidance, run semantic review against the fixed baseline, render all governed surfaces, and atomically refresh the Chinese review mirror.
4. Leave the change active and the CLI prebuild stale for a separately authorized Host Bridge release workflow.

Rollback removes the new capabilities, CLI leaves, Generic additions, and shared Host adapter while restoring the workflow's local paper materialization. Existing Products and Zotero/Synthesis storage require no data migration.
