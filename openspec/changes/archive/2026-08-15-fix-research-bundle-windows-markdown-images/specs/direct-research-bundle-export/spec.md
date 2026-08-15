## MODIFIED Requirements

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
