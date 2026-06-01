## MODIFIED Requirements

### Requirement: Literature identity is anchor-derived and decision-aware

Registry identity selection SHALL prefer accepted durable redirects/tombstones, then unique DOI, arXiv, ISBN, stable URL, active Zotero binding fallback, and compatible provisional fallback.

#### Scenario: ISBN identifies the same work

- **WHEN** two inputs have the same normalized ISBN and no conflicting stronger anchor
- **THEN** they SHALL resolve to the same `literature_item_id`
- **AND** the ISBN SHALL be written as a literature identifier row.

#### Scenario: Accepted merge exists before rebuild

- **WHEN** a previous dedupe decision tombstoned one literature item and redirected it to another
- **AND** a full Registry rebuild runs from current Zotero inputs
- **THEN** the candidate SHALL preserve that redirect/tombstone decision
- **AND** it SHALL NOT resurrect the tombstoned source as an active literature item.
