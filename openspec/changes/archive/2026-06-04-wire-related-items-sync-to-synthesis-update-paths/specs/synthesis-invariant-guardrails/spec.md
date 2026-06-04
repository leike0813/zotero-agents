## ADDED Requirements

### Requirement: Related-items sync SHALL NOT rebuild graph or run matcher

Related-items sync SHALL be a Zotero side-effect operation over already accepted library-to-library citation facts. It SHALL NOT rebuild Citation Graph cache, scan artifacts, extract references, or run any reference matcher.

#### Scenario: Related-items sync path stays side-effect only

- **WHEN** active source code is inspected
- **THEN** the related-items sync implementation SHALL NOT call `rebuildCitationGraphCacheFromSidecar`
- **AND** it SHALL NOT call artifact scanning, reference extraction, or advanced matcher entry points.

### Requirement: Digest workflow SHALL NOT contain removed auto matching path

The `literature-digest` workflow and apply hook SHALL NOT contain the removed `auto_reference_matching` option or `applyReferenceMatchingToNote` import.

#### Scenario: Static guard inspects digest workflow files

- **WHEN** active digest workflow files are inspected
- **THEN** they SHALL NOT contain `auto_reference_matching`
- **AND** they SHALL NOT contain `applyReferenceMatchingToNote`.
