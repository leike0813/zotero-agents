# Literature Bundle Workflows

## ADDED Requirements

### Requirement: Literature Export resolves a bounded parent set

The export workflow SHALL be runnable without a selection and SHALL resolve top-level regular parent items from exactly one mode: `selection`, `collection`, or `library`. Selection preserves user order; collection and library results use stable `libraryId:key` ordering and are deduplicated.

#### Scenario: Selection mode has no parents

- **WHEN** mode is `selection` and no top-level regular parents are selected
- **THEN** the apply hook returns a structured validation error and does not open a save target.

#### Scenario: Collection mode

- **WHEN** mode is `collection` with `targetCollection` formatted as `libraryId:collectionKey`
- **THEN** the hook pages direct collection members through `host.library.listItems`
- **AND** excludes child items and recursively nested collections.

#### Scenario: Library mode

- **WHEN** mode is `library`
- **THEN** the hook uses the current view's `libraryId`
- **AND** pages all top-level regular items in that library through the bounded pagination contract.

### Requirement: Export mode parameters are validated

The manifest SHALL expose `mode` with enum `selection|collection|library`, default `selection`, a dynamic `targetCollection` option source `zotero.collections`, and require `targetCollection` only in collection mode. `sourceOnly` SHALL default to false.

#### Scenario: Mode defaults to selection

- **WHEN** the workflow is opened without a mode parameter
- **THEN** the effective mode is `selection`
- **AND** `sourceOnly` remains false.

### Requirement: Non-source-only export is a Research Product

The default export SHALL create a `research_bundle.product@2.0.0` ZIP containing `README.md`, root `index.md`, `manifest.json`, `references.bib`, and one `papers/paper-###` directory per resolved parent. Each paper SHALL have `role: core`, metadata, and the first available Markdown or PDF source; missing sources are warnings.

#### Scenario: Collection export creates a Product ZIP

- **WHEN** collection mode resolves two regular parents
- **THEN** the ZIP contains two core paper directories, `index.md`, and measured `manifest.files` entries.

### Requirement: Product index is minimal and deterministic

`index.md` SHALL map Topic identifiers to `topic-###` and paper titles to `paper-###`. It SHALL not duplicate manifest paths, scores, source, integrity, or diagnostic fields. Its integrity record SHALL be included in `manifest.files`.

#### Scenario: Index maps only lookup keys

- **WHEN** a Product contains a Topic and a paper titled `Example`
- **THEN** `index.md` maps the Topic id and `Example` to their logical directories
- **AND** it contains no score or diagnostic columns.

### Requirement: Source-only compatibility remains explicit

When `sourceOnly` is true, export SHALL retain kind `zotero-agents-literature-bundle-source-only`, its flat `items/` layout, and non-importable semantics while using the mode-resolved parent set.

#### Scenario: Source-only collection export

- **WHEN** `sourceOnly` is enabled in collection mode
- **THEN** the output uses the source-only kind and flat `items/` paths
- **AND** it is not accepted by Literature Import.

### Requirement: Import dispatches both package formats

Import SHALL validate ZIP safety, manifest, file closure, and declared size/hash before dispatching `zotero-agents-literature-bundle@1` to the existing importer or `research_bundle.product@2.0.0` to a Product adapter.

#### Scenario: Research Product import

- **WHEN** a valid Research Product is selected
- **THEN** each paper metadata creates a new Zotero parent
- **AND** source Markdown/PDF, companion images, and embedded digest/references/citation-analysis/conversation payloads are restored
- **AND** README, index, topic reports, and BibTeX remain validated agent materials rather than Zotero children.

#### Scenario: One paper fails

- **WHEN** one paper cannot be materialized
- **THEN** its created parent and children are cleaned up
- **AND** remaining papers continue importing with a structured partial result.
