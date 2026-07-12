# Export/Import Literature Bundle

## Purpose

Export and import portable ZIP bundles of Zotero parent items with their metadata, tags, child notes, attachments, embedded images, and inter-item relationships, facilitating migration between Zotero instances or collaboration with other researchers.

## Export Literature Bundle

### Use Cases

- Back up selected Zotero items as a self-contained ZIP
- Share literature with collaborators who use a different Zotero library
- Transfer items to another Zotero instance for later import

### Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | Parent item |
| Selection | One or more parent items; attachments, notes, and child items cannot be mixed in |
| Output | User selects ZIP save location; `.zip` extension is appended automatically if missing |

### Behavior

1. Validate that all selected items are parent items (no attachments, notes, or child items allowed).
2. Collect bibliographic metadata, tags, child notes with embedded images, readable local attachments, and link-URL attachments for each parent item.
3. For Markdown attachments, rewrite local image references to bundle-relative paths and include the referenced images.
4. Record inter-item relationships only between parent items exported in the same batch.
5. Write `manifest.json` with format version, file inventory, integrity data, and any export warnings.
6. Package everything into a ZIP file at the user-chosen location.

Missing local files are skipped with a warning; remote images in Markdown are kept as-is (not downloaded). Cancelling the save dialog cancels the export.

### Outputs

| Artifact | Description |
|----------|-------------|
| `manifest.json` | Format version, file inventory, integrity info, export warnings, inter-item relationships |
| Parent item metadata | Portable bibliographic info and tags per parent |
| Child notes | Notes with embedded images |
| Attachments | Readable local attachments; Markdown attachments with companion local images |
| Link-URL attachments | Link information |

## Import Literature Bundle

### Use Cases

- Restore a previously exported literature bundle into the current Zotero library
- Import literature shared by a collaborator

### Input Constraints

| Constraint Type | Description |
|---------|------|
| Input Unit | Workflow (no Zotero item selection required) |
| Import Method | Select a ZIP file produced by Export Literature Bundle |
| Collection context | If a real collection is selected in the current view, new items are added to it; otherwise items are imported to the library root |

### Behavior

1. Validate the bundle: type, version, archive paths, file inventory, size, and integrity. Validation failure aborts without modifying the library.
2. For each parent item in the bundle, create a new Zotero item graph: bibliographic metadata, tags, attachments, notes, embedded images, and link-URL attachments.
3. Restore inter-item relationships between successfully imported parent items from the same bundle.
4. If a single parent item fails to import, clean up that item and its newly created children, then continue with the remaining items.

Import never reuses original Zotero item IDs or keys, never deduplicates, merges, or overwrites existing items. Re-importing the same bundle produces independent copies.

### Outputs

New Zotero parent items with their full item graphs. Missing files, cleanup failures, or relationship restoration failures are reported as warnings; the result may be partially completed.

## Estimated Duration

Depends on the number of items, attachment sizes, and local disk speed. Pure metadata or small notes complete quickly; large PDFs or many images increase duration proportionally.

## Dependencies

- No backend connection required
- Only relies on Zotero local storage and file access permissions

## Related Workflows

- [Export/Import Notes](export-import-notes) — Export or import analysis notes only
- [Export Research Bundle](export-research-bundle) — Assemble a read-only Research Bundle for a paper project (different purpose)
