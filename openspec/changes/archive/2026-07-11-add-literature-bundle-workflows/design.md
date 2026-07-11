## Context

`export-notes` and `import-notes` deliberately exchange editable note artifacts; they do not serialize Zotero parent items or reproduce the item/note/attachment graph. The new feature therefore needs separate workflow identities and a portable graph format rather than another branch in those hooks.

Both workflows are local `pass-through` operations. The plugin runtime is Zotero/Gecko, so Node.js filesystem and ZIP modules are unavailable. Existing code provides binary file operations, open/folder pickers, note embedded-image import, item handlers, a safe-path ZIP extractor, and several store-only in-memory ZIP writers. It does not provide save mode, complete item JSON export/import, stored-file import, current-collection context, or a streaming archive SSOT.

Package-managed literature notes use note-child PNG attachments. Their note HTML contains `data-attachment-key` and `data-zs-payload-anchor`; the PNG contains the machine-readable payload. The three literature-analysis notes, conversation notes, ordinary embedded images, and future payload kinds are all instances of this same graph and must be migrated uniformly.

## Goals / Non-Goals

**Goals:**

- Move selected regular parents and their complete child note/attachment graph between Zotero 7 and Zotero 9 through one self-contained ZIP.
- Preserve bibliographic fields, creators, tags, all notes, package payloads, embedded images, readable parent attachments, Markdown local image dependencies, and relationships among exported parents.
- Validate the complete archive before mutation, never deduplicate, and isolate materialization failures by parent.
- Add only workflow-agnostic primitives to core; keep manifest semantics and literature behavior in `literature-workbench-package`.
- Stream large archive entries and clean temporary resources deterministically.

**Non-Goals:**

- Preserve source Zotero ids, keys, sync versions, timestamps, collection hierarchy, or relations to items outside the bundle.
- Merge with existing target items or detect duplicates by DOI, ISBN, title, URL, key, or attachment bytes.
- Download HTTP(S) Markdown images.
- Replace or widen `export-notes` / `import-notes`.
- Guarantee import of future schema major versions.

## Decisions

### 1. Use two package workflows and one shared package module

Add `export-literature-bundle` and `import-literature-bundle` manifests under `literature-workbench-package`. Export uses `inputs.unit: "workflow"` with exact parent-only selection validation. Import uses `inputs.unit: "workflow"` and `trigger.requiresSelection: false`. Both declare `provider: "pass-through"`, only an `applyResult` hook, and no `display.core: true`.

Their hooks delegate traversal, manifest normalization, Markdown dependency handling, validation, result shaping, and warning codes to `lib/literatureBundle.mjs`. Existing embedded-payload and path helpers are reused rather than copied. Separate workflow READMEs describe the user contract.

This keeps portable migration separate from editable artifact exchange and prevents workflow-specific branches in `src/**`.

### 2. Define a closed, integrity-checked schema v1 archive

The archive contains exactly one root `manifest.json` plus entries declared by the manifest. Extra undeclared files are invalid. All paths use normalized forward-slash relative names and are unique.

The manifest shape is:

```json
{
  "kind": "zotero-agents-literature-bundle",
  "schemaVersion": 1,
  "createdAt": "ISO-8601",
  "source": { "zoteroVersion": "string", "addonVersion": "string" },
  "warnings": [{ "code": "string", "itemId": "i1", "childId": "a1" }],
  "items": [
    {
      "id": "i1",
      "itemJson": {},
      "relatedItemIds": ["i2"],
      "attachments": [],
      "notes": []
    }
  ],
  "files": {
    "items/i1/attachments/a1/paper.pdf": {
      "size": 123,
      "sha256": "lowercase hex"
    }
  }
}
```

Bundle ids are deterministic within one export (`i1`, `a1`, `n1`, `e1`) but have no target identity meaning. `itemJson` is Zotero's complete item JSON after removing `key`, `version`, `dateAdded`, `dateModified`, `collections`, `relations`, and child identity fields. Related edges are stored only as bundle item ids.

Parent attachment records use one of:

- `file`: metadata plus one content path; imported as stored content.
- `markdown`: metadata, rewritten Markdown path, and companion asset records.
- `url`: URL metadata without a required content path.
- `skipped`: portable metadata plus a warning code; produces no target attachment.

Note records reference an HTML template path and note-child image records. During export, each valid `<img data-attachment-key>` is mapped to a bundle image id, and the template replaces the runtime key with `data-zb-attachment-ref`. Payload anchors retain `data-zs-payload-anchor`. Import reverses this substitution after creating new embedded-image attachments. An unreadable referenced image is removed from the portable template with `note_image_missing`; unreferenced but readable note-child images are still carried so unknown current/future payload storage is not discarded.

Payload envelope source ids, keys, and explainer output paths remain provenance only. The embedded `content` remains the semantic payload; no importer resolves provenance as a target path or object reference.

Every file record includes byte length and SHA-256. Import validates CRC through ZIP extraction and then verifies the manifest length/digest before any Zotero mutation.

### 3. Normalize Markdown attachments with per-attachment sidecars

Only parent attachments whose filename or content type identifies Markdown are parsed. Image destinations from inline/reference Markdown image syntax are classified as:

- relative local path, resolved from the Markdown source directory;
- absolute local path or `file:` URL;
- HTTP(S) or `data:` URI, preserved without download;
- missing/unreadable local path, preserved with `markdown_image_missing`.

Percent encoding is decoded for filesystem lookup. Query/fragment suffixes are preserved when rewriting. Resolved local paths are canonicalized, cannot traverse the selected source location through relative syntax, and are deduplicated by canonical source path. Readable images are copied to `items/<item>/attachments/<attachment>/assets/<asset>/<filename>`, and exported Markdown points to safe relative paths under `assets/`.

Import materializes Markdown and its companion files into the same Zotero stored-attachment directory. Importing each image as a separate Zotero attachment is rejected because it would break relative Markdown links.

### 4. Introduce Workflow Host API v7 as the core SSOT

Increment `WORKFLOW_HOST_API_VERSION` to 7 and update the package runtime maximum. Add these exact generic operations:

- `file.pickSaveFile({ title?, directory?, filters?, suggestedName? }): Promise<string | null>` using toolkit/native save mode.
- `archive.writeZipAtomic({ targetPath, entries }): Promise<void>`, where entries carry one safe archive path and exactly one of `sourcePath`, `text`, or `bytes`; implementation streams file-backed entries to a sibling temporary ZIP and replaces the target only after close succeeds.
- `archive.withExtractedZip(sourcePath, callback): Promise<T>`, which enumerates and validates entry names before extraction, exposes `{ rootPath, entries, readText, readBytes, resolvePath }`, and removes its temporary directory in `finally`.
- `items.exportPortableJson(ref): Record<string, unknown>`, which uses complete Zotero item JSON and applies the identity-field exclusion above.
- `items.createFromJson({ itemJson, libraryId }): Promise<Zotero.Item>` and `items.remove(ref): Promise<void>`.
- `attachments.importStoredFile({ parent, path, companionFiles?, title?, mimeType?, charset?, url? }): Promise<Zotero.Item>`, backed by `Zotero.Attachments.importFromFile`; companion paths are safety-checked and copied into the resulting storage directory.
- `attachments.createFromUrl({ ..., deduplicate?: boolean })`; `false` bypasses the current same-parent URL lookup.
- `context.getCurrentView().currentCollection?: { id, key, name, libraryId }`, emitted only for a real collection row.

The ZIP implementation becomes the core SSOT. Existing callers may retain compatibility wrappers, but new workflow code must not add another package-local full-archive writer. The core implementation extends the existing safe path rules and supports binary reads, entry enumeration, duplicate detection, scoped cleanup, and streaming SHA-256 calculation.

### 5. Export builds a complete graph before committing the target

After save-path confirmation, export resolves every selected parent and builds one in-memory manifest while file bytes remain file-backed archive entries. It traverses direct parent attachments, every child note, and every note child attachment. Local missing files create structured warnings and skipped records; they do not abort the bundle. A fatal serialization or archive error removes the temporary ZIP and leaves the prior target untouched.

The result uses stable structure rather than prose:

```json
{
  "kind": "literature_bundle_export",
  "status": "completed|canceled",
  "itemCount": 0,
  "attachmentCount": 0,
  "noteCount": 0,
  "warnings": [{ "code": "...", "itemId": "...", "childId": "..." }]
}
```

### 6. Import validates first, then materializes each parent independently

Import opens the selected ZIP in `withExtractedZip`, parses and validates the closed manifest, verifies every file, and only then reads the current target. `currentView.libraryId` is mandatory; `currentCollection` is used only when it belongs to that library.

For each item record:

1. Create a new parent from `itemJson` and add it to the current collection when present.
2. Materialize parent file/Markdown/URL attachments without deduplication.
3. Create each note from its portable template, import every note-child image, build bundle image id to new key mapping, replace `data-zb-attachment-ref` with `data-attachment-key`, and save final HTML.
4. On any required create/write failure, erase the new parent (cascading its children), record the bundle item id as failed, and continue.
5. After all parents finish, recreate related edges only between successful new parents. Relation failures are warnings and do not roll back complete parents.

Repeated imports intentionally create another graph. No pre-import target search is performed.

The result shape is:

```json
{
  "kind": "literature_bundle_import",
  "status": "completed|partial|canceled|validation_failed",
  "importedItems": [{ "bundleItemId": "i1", "itemId": 1, "itemKey": "..." }],
  "failedItems": [{ "bundleItemId": "i2", "code": "..." }],
  "warnings": [{ "code": "...", "itemId": "...", "childId": "..." }]
}
```

## Risks / Trade-offs

- **[Large bundles exhaust memory]** → File entries, hashes, and ZIP writes stream; only manifest text and small note HTML remain in memory.
- **[Malicious ZIP paths or undeclared payloads]** → Enumerate before extraction, enforce normalized unique relative paths, use a closed manifest, verify size/hash, and scope cleanup.
- **[Zotero import partially succeeds]** → Validate globally first, isolate writes by parent, and erase the failed parent graph before continuing.
- **[Unknown note payload kind is lost]** → Copy every readable note-child attachment and restore by graph/key mapping rather than rebuilding only known payload kinds.
- **[Stale identity remains inside payload PNG]** → Treat envelope identity/path fields as provenance; runtime references are rebuilt from note HTML keys.
- **[Markdown local image syntax is incomplete]** → Keep parsing limited to Markdown image destinations, preserve unresolved syntax, and report structured warnings rather than rewriting uncertain links.
- **[ZIP SSOT refactor affects existing callers]** → Introduce compatibility wrappers and cover binary/store/deflate behavior before migrating callers; do not change provider result bundle contracts.

## Migration Plan

1. Add failing Host API v7 tests for save mode, portable JSON, stored imports, URL no-dedupe, current collection, ZIP safety/streaming/cleanup, and update version assertions.
2. Implement the generic Host API operations and synchronize the Host API SSOT.
3. Add failing package tests for manifest validation and representative full round-trip.
4. Implement the shared bundle module, hooks, manifests, READMEs, package registrations, release manifest entries, and ten locale labels.
5. Run focused core/workflow tests, typecheck, lint, built-in package/render validation, and broader Zotero mock/runtime gates required by touched modules.

Rollback removes the two workflow registrations and package files. Host API v7 primitives may remain because they are generic and additive; if reverted, restore the prior supported version consistently across core, package runtime, docs, and tests.

## Open Questions

None. Product and format decisions are fixed by this change.
