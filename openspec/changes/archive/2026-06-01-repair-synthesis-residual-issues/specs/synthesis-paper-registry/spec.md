## MODIFIED Requirements

### Requirement: Literature identity policy distinguishes ISBN convergence from DOI/arXiv duplicate review

Literature identity selection SHALL use normalized ISBN as a strong convergence anchor, while duplicate Zotero-bound DOI/arXiv anchors still preserve the existing dedupe-review safety path unless an accepted redirect exists.

#### Scenario: Two rows share a normalized ISBN

- **WHEN** two registry inputs have the same normalized ISBN and no stronger conflicting anchor
- **THEN** they may converge to the same literature item ID.

#### Scenario: Two Zotero-bound rows share DOI or arXiv

- **WHEN** two active Zotero-bound registry inputs share a normalized DOI or arXiv ID
- **AND** no accepted redirect already resolves the duplicate
- **THEN** the Registry keeps the P0 dedupe review path instead of silently merging the bound rows.
