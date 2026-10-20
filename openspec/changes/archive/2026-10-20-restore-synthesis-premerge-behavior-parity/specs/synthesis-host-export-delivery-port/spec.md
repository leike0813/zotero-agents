## MODIFIED Requirements

### Requirement: Archive entries and diagnostics are bounded

The archive-delivery contract SHALL admit the complete declared paper-ref and artifact-kind capacity plus one manifest, currently 401 entries, with 5 MiB of UTF-8 content per entry, 50 MiB total content, and 20 diagnostics. Entry capacity SHALL derive from the public artifact request contract and apply equally to run-workspace and archive delivery.

#### Scenario: Request exceeds an archive limit
- **WHEN** an entry or aggregate request exceeds a declared bound
- **THEN** request rebuilding SHALL reject it before temporary storage, ZIP creation, or file registration

#### Scenario: All admitted papers have four artifacts
- **WHEN** 100 admitted papers each have all four supported artifact kinds and the content remains within byte bounds
- **THEN** both local and remote delivery admit all 400 content entries and the manifest
- **AND** no paper or artifact is silently omitted
