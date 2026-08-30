# direct-research-bundle-export Specification

## Purpose
TBD - created by syncing change add-direct-research-bundle-exports. Update Purpose after archive.

## Requirements

### Requirement: Explicit papers SHALL export one portable aggregate bundle

The system SHALL accept one or more explicit Zotero item references, resolve each reference to a canonical `libraryId:itemKey`, preserve first-selection order after deduplication, and materialize portable metadata, one preferred source, and every available digest, references, citation-analysis, and literature-score artifact for each resolved paper.

#### Scenario: Markdown and PDF are both available
- **WHEN** an explicitly selected paper has an eligible Markdown source and a PDF
- **THEN** the bundle contains the Markdown source and its safe relative images
- **AND** the bundle does not duplicate the PDF.

#### Scenario: Remote caller exports Markdown images from a Windows Host
- **WHEN** a remote caller requests an explicit paper whose Markdown source and eligible source-tree images reside on a Windows Host
- **AND** the source or image paths use Windows drive-slash syntax or standard local `file:` URLs
- **THEN** the returned archive SHALL contain the readable images under safe bundle-relative paths
- **AND** rewritten Markdown and manifest records SHALL resolve those images without exposing Host-local paths.

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

### Requirement: Direct export SHALL reuse canonical materialization and archive owners

Direct paper and Topic export SHALL consume the same resolved-paper materializer, canonical artifact-set source, archive writer, and output publisher as Workflow Host research bundles while preserving their existing selection, Topic digest subset, warning, delivery, and manifest semantics.

#### Scenario: Direct paper export requests the full artifact set
- **WHEN** explicit papers are exported directly
- **THEN** the materializer requests the canonical complete paper artifact set and the archive owner publishes one atomic bundle

#### Scenario: Topic export uses its intentional subset
- **WHEN** a Topic bundle is exported
- **THEN** the existing Topic report and digest-only artifact policy remains unchanged rather than inheriting all paper artifacts

### Requirement: Direct export SHALL not capture runtime state

Cached direct-export composition MAY capture callbacks but MUST resolve current filesystem, Synthesis, and output-resource adapters for every invocation.

#### Scenario: Runtime changes between exports
- **WHEN** two exports run through one cached composition with different current adapters
- **THEN** each export uses the adapter resolved for its own invocation
