## Purpose

Define bounded, auditable direct export of existing Zotero paper and Synthesis Topic research materials without requiring workflow execution or Product registration.

## ADDED Requirements

### Requirement: Explicit papers SHALL export one portable aggregate bundle

The system SHALL accept one or more explicit Zotero item references, resolve each reference to a canonical `libraryId:itemKey`, preserve first-selection order after deduplication, and materialize portable metadata, one preferred source, and every available digest, references, citation-analysis, and literature-score artifact for each resolved paper.

#### Scenario: Markdown and PDF are both available
- **WHEN** an explicitly selected paper has an eligible Markdown source and a PDF
- **THEN** the bundle contains the Markdown source and its safe relative images
- **AND** the bundle does not duplicate the PDF.

#### Scenario: Markdown is unavailable
- **WHEN** an explicitly selected paper has no eligible Markdown source and has a PDF
- **THEN** the bundle contains the PDF as the paper source.

#### Scenario: Requested content is missing
- **WHEN** a resolved paper lacks a source or one or more analysis artifacts
- **THEN** the bundle still contains the available paper materials and portable metadata
- **AND** the manifest records structured per-paper missing-content diagnostics.

### Requirement: Explicit Topics SHALL export reports and globally deduplicated digests

The system SHALL accept one or more Topic ids, preserve first-selection order after deduplication, resolve Topic membership from the current structured Topic dependencies, export each available Topic report, and materialize at most one digest for each associated canonical `libraryId:itemKey` across the whole request.

#### Scenario: Topics share a paper
- **WHEN** two selected Topics resolve the same canonical paper ref
- **THEN** the bundle contains one digest for that paper
- **AND** both Topic manifest records route to the same digest path.

#### Scenario: Same item key exists in different libraries
- **WHEN** associated papers have the same Zotero item key but different library ids
- **THEN** the bundle treats them as distinct canonical paper refs and paths.

### Requirement: Topic report copies SHALL route canonical paper refs to digests

An exported Topic report copy SHALL preserve the source report's in-document citation anchors and SHALL add digest navigation only where the structured `source_papers` order and the report bibliography entry agree on the exact canonical paper ref. Export SHALL NOT mutate the stored Topic report.

#### Scenario: Report bibliography matches structured sources
- **WHEN** a bibliography entry and its `ref-n` anchor match the corresponding structured source paper
- **THEN** the exported canonical `{libraryId:itemKey}` marker links to the shared digest path when that digest exists.

#### Scenario: Report format cannot be validated
- **WHEN** the report bibliography cannot be safely matched to the structured source-paper order
- **THEN** the report is exported unchanged
- **AND** a sidecar source index provides the available digest links
- **AND** the manifest records a stable navigation fallback diagnostic.

### Requirement: Direct bundles SHALL use one versioned portable manifest

Every direct bundle SHALL contain `manifest.json` using schema id `research_bundle.direct_export` and schema version `1.0.0`, plus a navigable root `index.md`. The manifest SHALL discriminate paper and Topic bundles and record request scope, canonical paper records, Topic-to-paper routes where applicable, file inventory, byte sizes, SHA-256 values, content status, and structured warnings.

#### Scenario: Bundle is inspected independently
- **WHEN** a caller opens an unpacked direct bundle without Zotero
- **THEN** the manifest and index identify every requested entity, available file, missing-content warning, and navigation route without relying on host-local paths.

### Requirement: Direct bundle delivery SHALL follow connection mode

Local connection mode SHALL write the bundle to an explicit absent or empty output directory. Remote connection mode SHALL create one ZIP in Host-managed temporary storage and return the existing bridge-download descriptor without accepting or exposing a caller output path.

#### Scenario: Local export succeeds
- **WHEN** a valid local request supplies an eligible output directory
- **THEN** the directory contains the unpacked bundle
- **AND** the result reports only a safe output name, manifest name, file count, and byte count.

#### Scenario: Remote export succeeds
- **WHEN** the same logical request uses remote connection mode
- **THEN** the result contains an opaque file id, display name, media type, size, SHA-256 when available, expiry, download command, and unpack hint
- **AND** it contains no Host-local path.

### Requirement: Direct bundle creation SHALL be bounded and atomic

A request SHALL contain at most 100 paper selectors or 20 Topic ids, resolve at most 500 unique papers, materialize at most 5000 files and 2 GiB of payload, and produce at most a 2 GiB remote archive. Limit, validation, materialization, and archive failures SHALL leave no registered download Handle, partial target bundle, or abandoned temporary archive.

#### Scenario: Request exceeds a bound
- **WHEN** preflight or final archive validation exceeds a declared direct-bundle bound
- **THEN** the request fails with structured `research_bundle_limit_exceeded` details
- **AND** no delivery is published.

#### Scenario: Local target is non-empty
- **WHEN** a local output directory contains existing content
- **THEN** the request fails with the existing no-overwrite error boundary
- **AND** no existing content is modified.
