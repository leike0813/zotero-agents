# synthesis-layer-mvp Delta

## MODIFIED Requirements

### Requirement: Citation graph projection is derived from registry inputs

Unified Citation Graph SHALL be built from Zotero paper metadata and
reference/citation-analysis payloads using deterministic plugin code.

#### Scenario: Reference matches a library paper

- **WHEN** a references payload contains citekey, DOI, URL, or
  title/year/first-author metadata matching a library paper
- **THEN** graph rebuild SHALL promote that target to the library paper node.

#### Scenario: Repeated external references are merged

- **WHEN** multiple source papers cite the same external reference identity
- **THEN** the graph SHALL contain one external or unresolved node for that
  reference
- **AND** it SHALL contain one edge per source-target pair.

#### Scenario: Reference has no usable identity

- **WHEN** a reference has no identifier, title, or raw text
- **THEN** graph rebuild SHALL NOT create a per-source placeholder node
- **AND** diagnostics SHALL count the dropped reference.

#### Scenario: Graph layout presets are persisted

- **WHEN** the graph is rebuilt
- **THEN** the service SHALL persist the graph snapshot and compact, balanced,
  and expanded layout snapshots.

## ADDED Requirements

### Requirement: Workbench can browse the citation graph

The Synthesis Workbench SHALL render Citation Graph with a WebGL graph renderer
using persisted layout coordinates.

#### Scenario: User opens Graph tab

- **WHEN** a persisted graph snapshot is available
- **THEN** the Workbench SHALL render it with Sigma.js
- **AND** support search, node-kind filtering, role filtering, layout preset
  switching, hover neighbor highlighting, and click details.

#### Scenario: Graph snapshot is missing

- **WHEN** no persisted graph snapshot exists
- **THEN** the Workbench SHALL show diagnostics and a rebuild action instead of
  a fake graph or silent blank canvas.
