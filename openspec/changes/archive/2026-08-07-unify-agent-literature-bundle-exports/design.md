# Design

Research Bundle selection will carry the existing `topic_ids`/`sources` facts from candidate construction through Stage 60. Mandatory Topic refs are partitioned before ranking; the runtime keeps that partition intact and admits only the configured number of non-Topic extras. Normalization uses the same partition to exempt mandatory papers from the semantic threshold and related count.

Research Product materialization will remain the single owner of Product-relative paths, image rewriting, bibliography generation, manifest measurement, and atomic registration. Literature export constructs a normalized selection-like object from resolved Zotero parents and calls the shared materializer in archive mode, while source-only export continues to use its existing builder.

The root index is rendered from the already materialized Topic and paper arrays. It is added to the entries before `archive.measureEntries`, so `manifest.files` is authoritative for its size and SHA-256. README text points consumers to `index.md` first without restating manifest diagnostics.

Import reads and validates `manifest.json`, distinguishes the two schemas, and runs either the existing v1 graph importer or a new Product adapter. The Product adapter translates each paper into the existing `createFromJson`, stored-file, companion-file, and embedded-payload host APIs. Each paper is isolated in the same cleanup boundary as v1; topic/report/BibTeX files are read only for validation.

Collection and library parent resolution use a shared keyset pagination helper with a hard page guard, opaque cursor forwarding, `libraryId:key` deduplication, top-level regular filtering, and deterministic ordering. Selection mode is the only path that depends on the selection context and preserves its order.

