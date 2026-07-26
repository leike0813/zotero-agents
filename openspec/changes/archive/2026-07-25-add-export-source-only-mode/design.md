## Context

`export-literature-bundle` currently produces a versioned ZIP that carries full Zotero item graphs for round-trip migration via `import-literature-bundle`. The `applyResult` hook calls `exportLiteratureBundle()` in `lib/literatureBundle.mjs`, which builds the archive through `buildLiteratureBundleExport()`.

The `pass-through` provider exposes workflow parameters to the hook via `runResult.parameters`. The existing `workflow.json` has no `parameters` block; adding one is a non-breaking, additive change.

`buildLiteratureBundleExport()` already traverses each parent's attachments and contains the detection logic for Markdown (`/(?:markdown|text\/plain)/i.test(contentType) || /\.md$/i.test(baseName)`) and PDF. File naming uses `sanitizeFileNameSegment` from `./path.mjs`. The parent title is available via `parent.getField?.("title")`.

## Goals / Non-Goals

**Goals:**

- Produce a flat, immediately usable ZIP of source documents when `sourceOnly: true`.
- Reuse the existing attachment traversal and file-type detection logic rather than duplicating it.
- Make the source-only manifest structurally distinct so `import-literature-bundle` can reject it at the `kind` check without requiring schema version analysis.
- Keep the standard export path and `import-literature-bundle` entirely unchanged.

**Non-Goals:**

- Include Markdown-linked local images in source-only output.
- Support PDF + Markdown together per item; the choice is strictly Markdown-first, PDF-fallback.
- Add locale strings for the parameter; `workflow.json` inline labels are sufficient.
- Provide a source-only import path.
- Change the standard bundle format, version, or `kind`.

## Decisions

### 1. Add `parameters.sourceOnly` to `workflow.json`

Add a `parameters` block with one entry:

```json
"parameters": {
  "sourceOnly": {
    "type": "boolean",
    "title": "仅导出原文",
    "description": "导出扁平结构的原文包，不包含注释和分析工件，无法被"导入文献包"工作流导入。",
    "default": false
  }
}
```

This follows the existing pattern used by other workflows in the package (e.g., `export-research-bundle`). No other manifest changes are needed.

### 2. Pass `sourceOnly` from the hook to the library function

In `hooks/applyResult.mjs`, read `runResult?.parameters?.sourceOnly` and forward it to `exportLiteratureBundle()`:

```js
return exportLiteratureBundle({
  host: requireHostApi(runtime),
  selectionContext: runResult?.resultJson?.selectionContext,
  sourceOnly: runResult?.parameters?.sourceOnly === true,
});
```

The library function signature gains an optional `sourceOnly` boolean. Falsy default preserves existing behavior.

### 3. Add `buildLiteratureBundleSourceOnlyExport()` in `literatureBundle.mjs`

Rather than adding a conditional branch inside `buildLiteratureBundleExport()`, introduce a separate function. This keeps the standard path free of source-only concerns and avoids a growing flag parameter surface.

`exportLiteratureBundle()` selects which builder to call based on `sourceOnly`.

The source-only builder:

1. Iterates selected parents. For each parent, scans direct child attachments in order to find the first Markdown attachment with a readable local file; if none, finds the first PDF attachment with a readable local file.
2. If no qualifying file is found for a parent, records a `no_source_file` warning and skips that parent.
3. Derives the output filename: `sanitizeFileNameSegment(parent.getField("title") || bundleItemId) + ext` where `ext` is `.md` or `.pdf`.
4. Collects collisions: if two parents produce the same sanitized filename, appends a numeric suffix (`_2`, `_3`, …) in traversal order.
5. Writes entries under `items/<sanitized-filename>`.
6. Writes `manifest.json` with:
   - `kind: "zotero-agents-literature-bundle-source-only"`
   - `schemaVersion: 1`
   - `createdAt`, `source` fields (same as standard)
   - `warnings` array
   - `items` array: `[{ "title": "...", "file": "items/<filename>" }]`
   - `files` integrity map (same `{ size, sha256 }` pattern)

### 4. Filename collision strategy

Sanitized titles can collide. Resolution: first occurrence keeps the bare name; subsequent occurrences append `_2`, `_3`, … before the extension. This is deterministic and requires no user interaction.

### 5. `kind` value makes the bundle explicitly non-importable

`import-literature-bundle` validates `kind === "zotero-agents-literature-bundle"` early in its validation pass. Using `"zotero-agents-literature-bundle-source-only"` causes an immediate, descriptive rejection without special-casing either side.

## Risks / Trade-offs

- **[Parent has both Markdown and PDF]** → Markdown takes priority; PDF is silently ignored. This is the specified behavior; no warning is emitted.
- **[No qualifying attachment]** → Warning code `no_source_file` is recorded; the parent produces no file. The ZIP is still written if at least one parent succeeded.
- **[All parents produce no file]** → Export completes with zero items and all warnings. The resulting ZIP contains only `manifest.json`. This is an edge case; no special abort is needed.
- **[Title sanitization produces empty string]** → Fall back to the bundle-local id as the filename base. `sanitizeFileNameSegment` already handles this case.

## Migration Plan

No migration needed. The `sourceOnly` parameter defaults to `false`; existing integrations and saved workflow configurations are unaffected. The new function is additive to `literatureBundle.mjs`.
