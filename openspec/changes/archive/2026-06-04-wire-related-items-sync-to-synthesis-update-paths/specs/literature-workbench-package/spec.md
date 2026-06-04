## MODIFIED Requirements

### Requirement: Literature Digest Apply SHALL NOT Auto Run Reference Matching

The `literature-digest` workflow SHALL NOT expose or execute an automatic Reference Matching option during digest apply. Related-items updates are handled by the Synthesis sidecar update chain after the digest artifacts are applied.

#### Scenario: Digest apply ignores removed auto matching option

- **WHEN** `literature-digest` successfully writes generated digest, references, and citation-analysis notes
- **THEN** it SHALL NOT call the note-level Reference Matching apply helper
- **AND** it SHALL NOT write an `auto_reference_matching` result field
- **AND** stale callers that still pass `auto_reference_matching` SHALL NOT prevent apply from succeeding.
