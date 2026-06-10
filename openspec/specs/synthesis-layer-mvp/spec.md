# synthesis-layer-mvp Specification

## Purpose
TBD - created by archiving change complete-synthesis-layer-mvp. Update Purpose after archive.
## Requirements
### Requirement: Synthesis service uses real personal-library data by default

The default Synthesis service SHALL build its library index, Reference Sidecar
Index, and citation graph cache from Zotero personal-library metadata, sidecar
rows, and derived artifact notes.

#### Scenario: Personal library contains papers

- **WHEN** Zotero contains visible regular items with tags, collections, and
  child notes
- **THEN** `getLibraryIndex()` SHALL return bounded paper, tag, and collection
  summaries
- **AND** `getReferenceSidecarIndex()` SHALL return rows for those papers.

### Requirement: Resolver execution is deterministic
Topic Resolver execution SHALL be deterministic and plugin-owned, and `resolvers.resolve` SHALL require a canonical resolver under the top-level `resolver` input field.

#### Scenario: Resolver wrapper field is missing
- **WHEN** `resolvers.resolve` receives an input object without a valid `resolver` object
- **THEN** it SHALL return `ok: false`
- **AND** the errors SHALL identify `$.resolver` as the missing or invalid field.

#### Scenario: Workflow bundle resolver field is rejected
- **WHEN** `resolvers.resolve` receives `topic_resolver` instead of `resolver`
- **THEN** it SHALL return `ok: false`
- **AND** it SHALL explain that `topic_resolver` is not accepted by this Host Bridge/MCP contract.

### Requirement: Paper artifacts are read from existing workflow payloads

Paper artifact reads SHALL locate decoded payloads from existing derived
artifact note markers.

#### Scenario: Reference payload exists

- **WHEN** a Reference Sidecar row records an available `references` artifact
- **THEN** `readPaperArtifacts()` SHALL return the decoded payload, note key,
  artifact hash, and diagnostics.

### Requirement: Citation graph cache is derived from sidecar inputs

Unified Citation Graph SHALL be built from active raw references, effective
canonical references, explicit bindings, and bounded direct Zotero checks using
deterministic plugin code.

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

### Requirement: Topic synthesis workflows have real ACP Skill backends

The `create-topic-synthesis` and `update-topic-synthesis` workflows SHALL
declare builtin ACP Skill backends that can produce validated topic synthesis
result bundles. The workflow `applyResult` hook SHALL delegate persistence to
the plugin-owned Synthesis service.

#### Scenario: Workflow request is compiled

- **WHEN** the workflow request is inspected
- **THEN** create workflow SHALL declare `request.create.skill_id` as
  `create-topic-synthesis`
- **AND** update workflow SHALL declare `request.create.skill_id` as
  `update-topic-synthesis`.

#### Scenario: Builtin workflow package is loaded

- **WHEN** builtin workflow manifests are loaded from `workflows_builtin`
- **THEN** `create-topic-synthesis` SHALL be discovered from the
  `synthesis-layer` workflow package
- **AND** `update-topic-synthesis` SHALL be discovered
- **AND** `synthesize-topic` SHALL NOT be discovered.

#### Scenario: Skill output is validated

- **WHEN** the builtin skill registry is scanned
- **THEN** `create-topic-synthesis` SHALL be registered
- **AND** `update-topic-synthesis` SHALL be registered
- **AND** both runner metadata files SHALL point to output schemas.

#### Scenario: Skill output delegates canonical persistence

- **WHEN** the ACP Skill produces its final JSON result
- **THEN** `applyResult` SHALL call `applyTopicSynthesisResult`.

#### Scenario: Create workflow checks topic duplicates semantically

- **WHEN** a `create-topic-synthesis` ACP Skill run starts
- **THEN** it SHALL call `topics.list` before resolver generation
- **AND** it SHALL compare the user seed only against existing topic
  `title/description/aliases`.

#### Scenario: Duplicate candidate requires confirmation

- **WHEN** a create-mode run finds a plausible existing topic duplicate
- **THEN** the agent SHALL ask for ACP interactive user confirmation before
  switching to update
- **AND** it SHALL call `topics.get_context` only after the user chooses
  an existing topic to update.

### Requirement: Workbench can submit topic synthesis tasks

The Synthesis Workbench SHALL provide a discoverable task submission action for
`topic_synthesis`.

#### Scenario: User runs synthesis from the Workbench

- **WHEN** the user activates `Run synthesis`
- **THEN** the host SHALL execute the loaded `create-topic-synthesis` workflow
  through the standard workflow execution pipeline.

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
